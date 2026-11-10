-- AI 컴패니언 — 추천 답변 칩 2판(설계 문서 「AI 컴패니언 선택지 기능 설계」 §04 ~ §10)과 첫 인사만 있는 대화의 선톡 제외.
--
--   칩: 모델이 숨은 의도(elaborate · ask · reflect · redirect · boundary · progress)를 단 후보 셋을 내고, 서버가 후보마다 검증(모양 · 한글 ·
--   서식 · 길이 · 뜻 · 서로 겹침 · 최근 칩 반복 · 미성년자 출력 검사)해 통과한 것 가운데 의도가 서로 다른 것을 `suggestion_display_max`개
--   (기본 2)까지 보인다 — 억지로 채우지 않는다. 저장 모양은 `{ version: 2, items(보인 것), candidates(후보 전부 + 검증 결과), model,
--   createdAt, ms, playground?, outcome? }`이고 메시지 목록은 지금처럼 `items`만 준다.
--     · `settings.suggestions_enabled`(기본 참) — 운영의 전체 끄기. 거짓이면 어디서도 칩을 만들지 않는다.
--     · `settings.suggestion_display_max`(기본 2, 0 ~ 3) — 보일 칩의 최대 수.
--     · `companion.choice_sets(p_conversation_id, p_limit)` — 대화의 최근 칩 셋(오래된 것부터, 글 · 의도 · 결과). 생성 맥락(반복 피하기)용.
--     · `companion_turn_status` — `suggestionsEnabled` · `suggestionDisplayMax` · `latestSuggestionSet`(마지막 캐릭터 메시지 id와 칩 글 ·
--       의도) · `recentChoiceSets`를 더한다. `latestSuggestions`(20261121)는 그대로.
--     · `companion_record_choice(p_user_message_id, p_choice)` — 유저 메시지 meta에 입력 출처(`inputSource`: suggestion · manual ·
--       stale, 칩이면 `suggestionMessageId` · `suggestionIndex` · `suggestionIntent`)를 적고, 바로 앞 캐릭터 메시지의 칩 셋에 결과
--       (`outcome`: chosen · ignored)를 한 번 적는다. `chat-send`가 스트림을 닫은 뒤 부른다. 칩 수정은 없다 — 입력 길은 탭 전송 ·
--       직접 입력 둘뿐이다(사용자 결정 2026-11-10).
--     · `companion_suggest_context` · `companion_greet_context` — 전체 끄기 · 표시 수 · (칩 다시 만들기) 요약과 최근 칩 셋을 더 준다.
--     · `companion_memory_source` — 유저 메시지의 `inputSource`를 더 준다(칩을 그대로 고른 말은 유저 사실의 근거로 쓰지 않는다).
--     · `companion_suggestion_stats(p_since, p_playground)` — 칩 지표(노출 성공률 · 0/1/2/3 · 실패, 사용률, 의도 분포,
--       후보가 빠진 까닭, 생성 시간 p50/p95, 칩 단계 토큰 합).
--     · 이미 저장된 1판 칩의 의도를 새 이름으로 바꾼다(continue → elaborate, react → reflect, ask 그대로) — 앱 계약의 의도 열거가 바뀌었다.
--
--   선톡: 유저가 한 번도 말하지 않은 대화(첫 인사만 있음)는 후보에서 뺀다. `companion_proactive_context`가 `hasUserMessage`를 더 주고
--   함수가 플레이그라운드 `force`여도 보내지 않는다(`no_user_message`).
--
-- 기존 컴패니언 마이그레이션(20261108 ~ 20261121120000) 뒤에 적용한다. 다시 적용해도 같은 결과다.

alter table companion.settings add column if not exists suggestions_enabled boolean not null default true;
alter table companion.settings add column if not exists suggestion_display_max integer not null default 2;
alter table companion.settings drop constraint if exists settings_suggestion_display_max_check;
alter table companion.settings
  add constraint settings_suggestion_display_max_check check (suggestion_display_max between 0 and 3);

-- 1판 칩의 의도 이름 → 2판.
update companion.messages m set suggestions = jsonb_set(m.suggestions, '{items}', (
  select coalesce(jsonb_agg(
    case when item->>'intent' in ('continue', 'react')
      then item || jsonb_build_object('intent', case item->>'intent' when 'continue' then 'elaborate' else 'reflect' end)
      else item end
    order by ord
  ), '[]'::jsonb)
  from jsonb_array_elements(m.suggestions->'items') with ordinality as t(item, ord)
))
where m.role = 'assistant' and jsonb_typeof(m.suggestions->'items') = 'array'
  and exists (
    select 1 from jsonb_array_elements(m.suggestions->'items') item where item->>'intent' in ('continue', 'react')
  );

-- ------------------------------------------------------------------ 칩 셋

-- 대화의 최근 칩 셋 — 칩이 하나 이상 보인 캐릭터 메시지 p_limit개(오래된 것부터). 결과가 아직 없으면 `outcome`은 null.
create or replace function companion.choice_sets(p_conversation_id uuid, p_limit integer)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'messageId', x.id,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object('text', item->>'text', 'intent', item->>'intent') order by ord), '[]'::jsonb)
      from jsonb_array_elements(x.suggestions->'items') with ordinality as t(item, ord)
    ),
    'outcome', x.suggestions->'outcome'
  ) order by x.created_at), '[]'::jsonb)
  from (
    select m.id, m.suggestions, m.created_at from companion.messages m
    where m.conversation_id = p_conversation_id and m.role = 'assistant' and not m.hidden
      and jsonb_typeof(m.suggestions->'items') = 'array' and jsonb_array_length(m.suggestions->'items') > 0
    order by m.created_at desc
    limit greatest(0, least(coalesce(p_limit, 5), 20))
  ) x
$$;
revoke all on function companion.choice_sets(uuid, integer) from public;

create or replace function public.companion_turn_status(p_user_id uuid, p_character_id text, p_now timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select m.id, m.suggestions from companion.messages m
    join companion.conversations c on c.id = m.conversation_id
    where c.user_id = p_user_id and c.character_id = p_character_id and c.kind = 'companion'
      and m.role = 'assistant' and not m.hidden and m.status in ('complete', 'crisis')
    order by m.created_at desc limit 1
  )
  select jsonb_build_object(
    'strikes', coalesce((
      select case when ms.window_started_at is not null and ms.window_started_at >= p_now - s.strike_window then ms.strikes else 0 end
      from companion.moderation_state ms where ms.user_id = p_user_id
    ), 0),
    'strikeLimit', s.strike_limit,
    'memoryFull', (companion.memory_layer_status(p_user_id, p_character_id)->>'full')::boolean
      or (companion.memory_layer_status(p_user_id, null)->>'full')::boolean,
    'latestSuggestions', coalesce((
      select jsonb_agg(item->>'text' order by ord)
      from latest
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(latest.suggestions->'items') = 'array' then latest.suggestions->'items' else '[]'::jsonb end
      ) with ordinality as t(item, ord)
      where jsonb_typeof(item->'text') = 'string'
    ), '[]'::jsonb),
    'latestSuggestionSet', (
      select jsonb_build_object('messageId', latest.id, 'items', coalesce((
        select jsonb_agg(jsonb_build_object('text', item->>'text', 'intent', item->>'intent') order by ord)
        from jsonb_array_elements(
          case when jsonb_typeof(latest.suggestions->'items') = 'array' then latest.suggestions->'items' else '[]'::jsonb end
        ) with ordinality as t(item, ord)
        where jsonb_typeof(item->'text') = 'string'
      ), '[]'::jsonb))
      from latest
    ),
    'recentChoiceSets', coalesce(companion.choice_sets((
      select c.id from companion.conversations c
      where c.user_id = p_user_id and c.character_id = p_character_id and c.kind = 'companion'
    ), 5), '[]'::jsonb),
    'suggestionsEnabled', s.suggestions_enabled,
    'suggestionDisplayMax', s.suggestion_display_max
  )
  from companion.settings s
$$;
revoke all on function public.companion_turn_status(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.companion_turn_status(uuid, text, timestamptz) to service_role;

-- p_choice: { inputSource, suggestionMessageId?, suggestionIndex?, suggestionIntent? }. 유저 메시지가 없으면 null.
-- 반환: { recorded: true, outcome: 'chosen' | 'ignored' | null } — 앞 캐릭터 메시지에 칩이 없었거나 결과가 이미 있으면 null.
create or replace function public.companion_record_choice(p_user_message_id uuid, p_choice jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user companion.messages;
  v_previous companion.messages;
  v_outcome text;
begin
  if p_choice is null or jsonb_typeof(p_choice) <> 'object'
    or coalesce(p_choice->>'inputSource', '') not in ('suggestion', 'manual', 'stale') then
    raise exception 'invalid choice' using errcode = '22023';
  end if;
  select * into v_user from companion.messages where id = p_user_message_id and role = 'user';
  if v_user.id is null then
    return null;
  end if;
  update companion.messages set meta = coalesce(meta, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'inputSource', p_choice->'inputSource',
    'suggestionMessageId', p_choice->'suggestionMessageId',
    'suggestionIndex', p_choice->'suggestionIndex',
    'suggestionIntent', p_choice->'suggestionIntent'
  ))
  where id = v_user.id;

  select * into v_previous from companion.messages m
  where m.conversation_id = v_user.conversation_id and m.role = 'assistant' and not m.hidden
    and m.status in ('complete', 'crisis') and m.created_at < v_user.created_at
  order by m.created_at desc limit 1;
  if v_previous.id is not null and jsonb_typeof(v_previous.suggestions->'items') = 'array'
    and jsonb_array_length(v_previous.suggestions->'items') > 0 and not (v_previous.suggestions ? 'outcome') then
    -- 지난 칩(stale)을 고른 것은 이 셋에는 무시다.
    v_outcome := case
      when p_choice->>'inputSource' = 'suggestion' and p_choice->>'suggestionMessageId' = v_previous.id::text then 'chosen'
      else 'ignored'
    end;
    update companion.messages set suggestions = suggestions || jsonb_strip_nulls(jsonb_build_object(
      'outcome', v_outcome,
      'outcomeIndex', case when v_outcome = 'ignored' then null else p_choice->'suggestionIndex' end,
      'outcomeMessageId', v_user.id
    ))
    where id = v_previous.id;
  end if;
  return jsonb_build_object('recorded', true, 'outcome', v_outcome);
end;
$$;
revoke all on function public.companion_record_choice(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.companion_record_choice(uuid, jsonb) to service_role;

-- 20261118 판 + 전체 끄기 · 표시 수 · 요약 · 최근 칩 셋.
create or replace function public.companion_suggest_context(p_user_id uuid, p_character_id text, p_history_limit integer, p_now timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  v_gate jsonb;
  v_conversation companion.conversations;
  v_latest companion.messages;
  v_blocked boolean := false;
begin
  v_gate := public.companion_turn_gate(p_user_id, p_character_id, gen_random_uuid(), p_now, null);
  if v_gate->>'result' <> 'ok' then
    return jsonb_build_object('result', v_gate->>'result');
  end if;
  select * into s from companion.settings;

  select * into v_conversation from companion.conversations
  where user_id = p_user_id and character_id = p_character_id and kind = 'companion';
  select * into v_latest from companion.messages m
  where m.conversation_id = v_conversation.id and m.role = 'assistant' and not m.hidden and m.status in ('complete', 'crisis')
  order by m.created_at desc limit 1;
  if v_latest.id is not null then
    v_blocked := exists (
      select 1 from companion.messages m
      where m.conversation_id = v_conversation.id and m.role = 'user' and m.status = 'blocked' and m.created_at > v_latest.created_at
    );
  end if;

  return jsonb_build_object(
    'result', 'ok',
    'ageBand', v_gate->'ageBand',
    'l1', v_gate->'l1',
    'replySuggestions', coalesce((select p.reply_suggestions from companion.profiles p where p.user_id = p_user_id), true),
    'suggestionsEnabled', s.suggestions_enabled,
    'suggestionDisplayMax', s.suggestion_display_max,
    'persona', (select ch.persona from companion.characters ch where ch.id = p_character_id),
    'speechLevel', coalesce((
      select r.speech_level from companion.relationships r where r.user_id = p_user_id and r.character_id = p_character_id
    ), 'polite'),
    'summary', v_conversation.rolling_summary,
    'latest', case when v_latest.id is null then null else jsonb_build_object(
      'id', v_latest.id,
      'status', v_latest.status,
      'origin', v_latest.origin,
      'refusal', coalesce(v_latest.meta->>'refusal', 'false') not in ('false', ''),
      'suggestions', v_latest.suggestions
    ) end,
    'latestTurnBlocked', v_blocked,
    'recentChoiceSets', case when v_conversation.id is null then '[]'::jsonb else companion.choice_sets(v_conversation.id, 5) end,
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('role', h.role, 'text', h.text, 'segments', h.segments) order by h.created_at)
      from (
        select m.role, m.text, m.segments, m.created_at from companion.messages m
        where m.conversation_id = v_conversation.id and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
        order by m.created_at desc limit greatest(1, least(coalesce(p_history_limit, 6), 20))
      ) h
    ), '[]'::jsonb)
  );
end;
$$;

-- 20261121 판 + 전체 끄기 · 표시 수.
create or replace function public.companion_greet_context(p_user_id uuid, p_character_id text, p_now timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  v_gate jsonb;
  v_conversation uuid;
begin
  v_gate := public.companion_turn_gate(p_user_id, p_character_id, gen_random_uuid(), p_now, null);
  if v_gate->>'result' <> 'ok' then
    return jsonb_build_object('result', v_gate->>'result');
  end if;
  select * into s from companion.settings;
  select id into v_conversation from companion.conversations
  where user_id = p_user_id and character_id = p_character_id and kind = 'companion';

  return jsonb_build_object(
    'result', 'ok',
    'ageBand', v_gate->'ageBand',
    'l1', v_gate->'l1',
    'feedbackMode', v_gate->'feedbackMode',
    'replySuggestions', coalesce((select p.reply_suggestions from companion.profiles p where p.user_id = p_user_id), true),
    'suggestionsEnabled', s.suggestions_enabled,
    'suggestionDisplayMax', s.suggestion_display_max,
    'persona', (select ch.persona from companion.characters ch where ch.id = p_character_id),
    'speechLevel', coalesce((
      select r.speech_level from companion.relationships r where r.user_id = p_user_id and r.character_id = p_character_id
    ), 'polite'),
    'hasMessages', v_conversation is not null and exists (
      select 1 from companion.messages m where m.conversation_id = v_conversation
    ),
    'memories', coalesce((
      select jsonb_agg(content order by created_at desc) from (
        select content, created_at from companion.memories
        where user_id = p_user_id and deleted_at is null and (character_id = p_character_id or character_id is null)
        order by created_at desc limit s.memory_prompt_limit
      ) mm
    ), '[]'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------------ 기억 — 칩을 그대로 고른 말 표시

-- 20261120 판 + 메시지마다 `inputSource`(유저 메시지의 입력 출처, 없으면 null).
create or replace function public.companion_memory_source(p_conversation_id uuid, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with candidates as (
    select m.id, m.role, m.text, m.segments, m.created_at, m.meta->>'inputSource' as input_source
    from companion.messages m
    join companion.conversations c on c.id = m.conversation_id
    where m.conversation_id = p_conversation_id and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
      and (c.memory_extracted_until is null or m.created_at > c.memory_extracted_until)
    order by m.created_at desc
    limit greatest(least(p_limit, 200), 1)
  )
  select case when count(*) filter (where role = 'user') >= (select memory_every from companion.settings) then jsonb_build_object(
    'until', max(created_at),
    'sourceMessageId', (select id from candidates where role = 'user' order by created_at desc limit 1),
    'messages', jsonb_agg(jsonb_build_object('role', role, 'text', text, 'segments', segments, 'inputSource', input_source) order by created_at)
  ) else null end
  from candidates
$$;

-- ------------------------------------------------------------------ 선톡 — 첫 인사만 있는 대화 제외

create or replace function public.companion_proactive_candidates(p_now timestamptz, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('userId', x.user_id, 'characterId', x.character_id, 'conversationId', x.id)
    order by x.last_message_at), '[]'::jsonb)
  from (
    select y.* from (
      select distinct on (c.user_id) c.user_id, c.character_id, c.id, c.last_message_at
      from companion.conversations c
      left join companion.profiles p on p.user_id = c.user_id
      where c.kind = 'companion' and c.last_message_at is not null
        -- 유저가 한 번도 말하지 않은 대화(첫 인사만 있음)에는 선톡하지 않는다.
        and exists (select 1 from companion.messages m where m.conversation_id = c.id and m.role = 'user')
        and (
          companion.age_band(p.birth_year, p_now) = 'adult'
          or (companion.age_band(p.birth_year, p_now) = 'minor' and p.last_region is not null and p.last_region <> 'US')
        )
        and companion.proactive_skip_reason(c.user_id, c.last_message_at, p_now) is null
      order by c.user_id, c.last_message_at
    ) y
    order by y.last_message_at
    limit greatest(1, least(coalesce(p_limit, 20), 200))
  ) x
$$;

-- 20261115 판 + `hasUserMessage`.
create or replace function public.companion_proactive_context(p_user_id uuid, p_character_id text, p_history_limit integer, p_now timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'persona', ch.persona,
    'speechLevel', coalesce(r.speech_level, 'polite'),
    'summary', c.rolling_summary,
    'l1', p.l1,
    'ageBand', companion.age_band(p.birth_year, p_now),
    'hasConversation', c.id is not null,
    'hasUserMessage', c.id is not null and exists (
      select 1 from companion.messages m where m.conversation_id = c.id and m.role = 'user'
    ),
    'allowed', companion.age_band(p.birth_year, p_now) = 'adult'
      or (companion.age_band(p.birth_year, p_now) = 'minor' and p.last_region is not null and p.last_region <> 'US'),
    'skipReason', companion.proactive_skip_reason(p_user_id, c.last_message_at, p_now),
    'capReached', companion.proactive_skip_reason(p_user_id, c.last_message_at, p_now) is not null,
    'memories', coalesce((
      select jsonb_agg(content order by created_at desc) from (
        select content, created_at from companion.memories
        where user_id = p_user_id and deleted_at is null and (character_id = p_character_id or character_id is null)
        order by created_at desc limit s.memory_prompt_limit
      ) mm
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('role', h.role, 'text', h.text, 'segments', h.segments) order by h.created_at)
      from (
        select m.role, m.text, m.segments, m.created_at from companion.messages m
        where m.conversation_id = c.id and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
        order by m.created_at desc limit p_history_limit
      ) h
    ), '[]'::jsonb)
  )
  from companion.characters ch
  cross join companion.settings s
  left join companion.conversations c on c.user_id = p_user_id and c.character_id = ch.id and c.kind = 'companion'
  left join companion.relationships r on r.user_id = p_user_id and r.character_id = ch.id
  left join companion.profiles p on p.user_id = p_user_id
  where ch.id = p_character_id
$$;

-- ------------------------------------------------------------------ 지표 (service_role — ops-dashboard)

-- p_since 뒤의 칩 대상 캐릭터 메시지(보통 답 · 첫 인사 가운데 스위치가 켜져 칩을 만들려 한 것 — meta.suggestions가 있음).
-- p_playground: null이면 전부, 참이면 플레이그라운드만, 거짓이면 실제 유저만.
create or replace function public.companion_suggestion_stats(p_since timestamptz, p_playground boolean default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with eligible as (
    select m.id, m.meta, m.suggestions,
      case when jsonb_typeof(m.suggestions->'items') = 'array' then jsonb_array_length(m.suggestions->'items') else 0 end as shown
    from companion.messages m
    where m.role = 'assistant' and m.origin in ('turn', 'greeting') and m.created_at >= p_since
      and m.meta ? 'suggestions'
      and (p_playground is null or coalesce((m.meta->>'playground')::boolean, false) = p_playground)
  ),
  answered as (
    select * from eligible where shown > 0 and suggestions ? 'outcome'
  )
  select jsonb_build_object(
    'since', p_since,
    'eligible', (select count(*) from eligible),
    'shown', (select count(*) from eligible where shown > 0),
    'byCount', jsonb_build_object(
      '1', (select count(*) from eligible where shown = 1),
      '2', (select count(*) from eligible where shown = 2),
      '3', (select count(*) from eligible where shown = 3),
      'noValid', (select count(*) from eligible where shown = 0 and meta->>'suggestions' = 'no_valid_candidates'),
      'failed', (select count(*) from eligible where shown = 0 and coalesce(meta->>'suggestions', '') <> 'no_valid_candidates')
    ),
    'answered', (select count(*) from answered),
    'chosen', (select count(*) from answered where suggestions->>'outcome' = 'chosen'),
    'ignored', (select count(*) from answered where suggestions->>'outcome' = 'ignored'),
    'intents', coalesce((
      select jsonb_object_agg(intent, n) from (
        select item->>'intent' as intent, count(*) as n
        from eligible cross join lateral jsonb_array_elements(
          case when jsonb_typeof(suggestions->'items') = 'array' then suggestions->'items' else '[]'::jsonb end
        ) item
        group by 1
      ) i where intent is not null
    ), '{}'::jsonb),
    'chosenIntents', coalesce((
      select jsonb_object_agg(intent, n) from (
        select suggestions->'items'->((suggestions->>'outcomeIndex')::integer)->>'intent' as intent, count(*) as n
        from answered where suggestions->>'outcome' = 'chosen' and suggestions ? 'outcomeIndex'
        group by 1
      ) i where intent is not null
    ), '{}'::jsonb),
    'dropReasons', coalesce((
      select jsonb_object_agg(reason, n) from (
        select candidate->>'reason' as reason, count(*) as n
        from eligible cross join lateral jsonb_array_elements(
          case when jsonb_typeof(suggestions->'candidates') = 'array' then suggestions->'candidates' else '[]'::jsonb end
        ) candidate
        where candidate->>'reason' is not null
        group by 1
      ) r
    ), '{}'::jsonb),
    'latencyMs', (
      select jsonb_build_object(
        'p50', percentile_cont(0.5) within group (order by (meta->>'suggestionsMs')::numeric),
        'p95', percentile_cont(0.95) within group (order by (meta->>'suggestionsMs')::numeric),
        'n', count(*)
      )
      from eligible where jsonb_typeof(meta->'suggestionsMs') = 'number'
    ),
    'tokens', (
      select jsonb_build_object(
        'model', max(meta->'usage'->'suggestions'->>'model'),
        'calls', coalesce(sum((meta->'usage'->'suggestions'->>'calls')::numeric), 0),
        'inputTokens', coalesce(sum((meta->'usage'->'suggestions'->>'inputTokens')::numeric), 0),
        'cacheReadTokens', coalesce(sum((meta->'usage'->'suggestions'->>'cacheReadTokens')::numeric), 0),
        'cacheWriteTokens', coalesce(sum((meta->'usage'->'suggestions'->>'cacheWriteTokens')::numeric), 0),
        'outputTokens', coalesce(sum((meta->'usage'->'suggestions'->>'outputTokens')::numeric), 0)
      )
      from eligible where jsonb_typeof(meta->'usage'->'suggestions') = 'object'
    )
  )
$$;
revoke all on function public.companion_suggestion_stats(timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.companion_suggestion_stats(timestamptz, boolean) to service_role;
