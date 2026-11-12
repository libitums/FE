-- AI 컴패니언 — 답변 평가(👍/👎)와 고쳐서 다시 보내기(PRD §3.15 · API §2.8, 2026-11-10).
--
--   답변 평가: 캐릭터 메시지마다 유저가 👍/👎를 남긴다. 메시지당 하나(`companion.message_ratings`, 기본 키 = 메시지)이고 다시 누르면
--   바꾸거나 지운다. 👎만 이유를 고른다(여럿 — awkward_korean · out_of_character · too_hard · uncomfortable · other)와 짧은 글(200자).
--   첫 인사 · 선톡 · 거절 답에도 달고, 위기 안내 · 공지 · 숨긴 메시지에는 달지 않는다.
--     · `companion_rate_message(p_message_id, p_rating, p_reasons, p_note)` — 앱(유저 토큰). `p_rating` null이면 지운다.
--     · `companion_operator_rate_message(p_user_id, …)` — 플레이그라운드(ops-dashboard, 서버 키). 시험 계정만.
--     · `companion.message_json`이 `rating { value, reasons, note }`(없으면 null)를 싣는다 — 메시지 목록 · 운영 조회 모두.
--     · `companion_rating_stats(p_since, p_playground, p_limit)` — 👍/👎 수, 캐릭터 · 모델 · 출처(origin)별, 이유별, 최근 👎 목록(평가 세트
--       후보로 옮길 원문 — 캐릭터 답 · 그 앞 유저 말). 서버 키만.
--     대화가 지워지면(초기화 · 계정 삭제) 메시지를 따라 지워진다.
--
--   고쳐서 다시 보내기: `chat-send`의 `replaces_message_id`가 오면 `companion_begin_replacement`가 `companion_begin_turn` 대신 돈다.
--     · 고칠 수 있는 것은 그 대화의 마지막 유저 메시지 하나 — 그 뒤에 다른 유저 메시지도, 그 메시지의 답이 아닌 캐릭터 메시지(선톡 등)도
--       없어야 한다. 아니면 `not_latest_message`(409). 그 턴이 아직 도는 중이면 `turn_in_progress`.
--     · 이전 턴(유저 메시지와 그 캐릭터 답 — 교정 · 칩 · 평가는 메시지를 따라, 공지는 두고)을 지우지 않고 `hidden`으로 숨긴 뒤 보통 턴을 시작한다. 시작이
--       크레딧 부족 등으로 막히면 숨긴 것도 되돌린다(세이브포인트). 숨긴 메시지 `meta.replacedBy` = 새 유저 메시지, 새 유저 메시지
--       `meta.replaces` = 이전 유저 메시지. 같은 `client_message_id`로 다시 부르면(재시도) 숨기기를 건너뛰고 시작만 다시 한다(멱등).
--     · 숨긴 메시지는 이미 지난 대화 · 기억 · 요약 원문 · 칩 이력에서 빠진다(`not hidden`). 메시지 목록에서는 고쳐서 숨긴 것을 아예 빼고,
--       운영 조회는 그대로 보인다. 칩 지표도 고쳐서 숨긴 캐릭터 답을 뺀다.
--     · 차감 · 입력 검사 · 위반 횟수는 새 턴에 그대로다(이전 턴의 차감 · 위반은 되돌리지 않는다).
--
-- 기존 컴패니언 마이그레이션(20261108 ~ 20261123) 뒤에 적용한다. 다시 적용해도 같은 결과다.

-- ------------------------------------------------------------------ 답변 평가

create table if not exists companion.message_ratings (
  message_id uuid primary key references companion.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  value text not null check (value in ('up', 'down')),
  reasons text[] not null default '{}'
    check (reasons <@ array['awkward_korean', 'out_of_character', 'too_hard', 'uncomfortable', 'other']::text[]),
  note text check (note is null or char_length(note) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 이유 · 글은 👎에만.
  check (value = 'down' or (cardinality(reasons) = 0 and note is null))
);
create index if not exists message_ratings_user_idx on companion.message_ratings (user_id, updated_at desc);
alter table companion.message_ratings enable row level security;

-- 평가를 저장한다(앱 · 운영 공통). 본인 대화의 보이는 캐릭터 메시지(위기 안내 제외)만 — 아니면 P0002. `p_rating` null이면 지운다.
create or replace function companion.rate_message(
  p_user_id uuid,
  p_message_id uuid,
  p_rating text,
  p_reasons text[],
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reasons text[];
  v_note text;
begin
  if p_rating is not null and p_rating not in ('up', 'down') then
    raise exception 'invalid rating' using errcode = '22023';
  end if;
  if not exists (
    select 1 from companion.messages m
    where m.id = p_message_id and m.user_id = p_user_id and m.role = 'assistant' and not m.hidden
      and m.origin <> 'crisis' and m.status = 'complete'
  ) then
    raise exception 'message not found' using errcode = 'P0002';
  end if;
  if p_rating is null then
    delete from companion.message_ratings where message_id = p_message_id;
    return;
  end if;
  select coalesce(array_agg(distinct r order by r), '{}') into v_reasons
  from unnest(coalesce(p_reasons, '{}')) r where r is not null;
  v_note := nullif(btrim(coalesce(p_note, '')), '');
  if p_rating = 'up' and (cardinality(v_reasons) > 0 or v_note is not null) then
    raise exception 'reasons only for down' using errcode = '22023';
  end if;
  if not v_reasons <@ array['awkward_korean', 'out_of_character', 'too_hard', 'uncomfortable', 'other']::text[]
    or char_length(coalesce(v_note, '')) > 200 then
    raise exception 'invalid reasons' using errcode = '22023';
  end if;
  insert into companion.message_ratings (message_id, user_id, value, reasons, note)
  values (p_message_id, p_user_id, p_rating, v_reasons, v_note)
  on conflict (message_id) do update set
    value = excluded.value, reasons = excluded.reasons, note = excluded.note, updated_at = now();
end;
$$;

create or replace function public.companion_rate_message(p_message_id uuid, p_rating text, p_reasons text[], p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  perform companion.rate_message(auth.uid(), p_message_id, p_rating, p_reasons, p_note);
end;
$$;

create or replace function public.companion_operator_rate_message(
  p_user_id uuid,
  p_message_id uuid,
  p_rating text,
  p_reasons text[],
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from auth.users where id = p_user_id and raw_app_meta_data->>'duru_tester' = 'true') then
    raise exception 'not a tester' using errcode = 'P0002';
  end if;
  perform companion.rate_message(p_user_id, p_message_id, p_rating, p_reasons, p_note);
end;
$$;

-- 메시지 한 줄에 평가를 더한다(20261119의 본문 + `rating`).
create or replace function companion.message_json(m companion.messages)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', m.id,
    'role', m.role,
    'origin', m.origin,
    'status', companion.visible_status(m.status, m.created_at, now()),
    'hidden', m.hidden,
    'text', case when m.role = 'user' then m.text end,
    'inputMode', m.input_mode,
    'segments', case when m.hidden then '[]'::jsonb else m.segments end,
    'notice', case when m.notice_kind is null then null else jsonb_build_object('kind', m.notice_kind) end,
    'feedback', case when m.role = 'user' then (
      select companion.correction_json(c) from companion.corrections c where c.message_id = m.id
    ) end,
    -- 추천 답변 칩(20261118 · 20261119). 저장 모양은 `{items, model, createdAt, playground?}`이고 목록에는 `items`만 싣는다.
    'suggestions', case when m.role = 'assistant' and not m.hidden then m.suggestions->'items' end,
    -- 답변 평가(20261124). 캐릭터 메시지에만, 없으면 null.
    'rating', case when m.role = 'assistant' then (
      select jsonb_build_object('value', r.value, 'reasons', to_jsonb(r.reasons), 'note', r.note)
      from companion.message_ratings r where r.message_id = m.id
    ) end,
    'createdAt', to_char(m.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
$$;

-- 메시지 목록: 고쳐서 숨긴 턴(`meta.replacedBy`)은 아예 뺀다. 나머지는 20261109 그대로.
create or replace function public.companion_list_messages(p_character_id text, p_before timestamptz, p_limit integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rows jsonb;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_character_id is null or p_limit is null or p_limit not between 1 and 50 then
    raise exception 'invalid page' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(companion.message_json(m) order by m.created_at desc), '[]'::jsonb), count(*)
  into v_rows, v_count
  from (
    select m.* from companion.messages m
    join companion.conversations c on c.id = m.conversation_id
    where c.user_id = auth.uid() and c.character_id = p_character_id and c.kind = 'companion'
      and (p_before is null or m.created_at < p_before)
      and companion.visible_status(m.status, m.created_at, now()) is not null
      and not (m.hidden and m.meta ? 'replacedBy')
    order by m.created_at desc
    limit p_limit + 1
  ) m;
  if v_count > p_limit then
    v_rows := v_rows - p_limit;
  end if;
  return jsonb_build_object('messages', v_rows, 'hasMore', v_count > p_limit);
end;
$$;

-- 👍/👎 지표. `p_playground`: null 전부 · true 플레이그라운드 계정의 턴만(`meta.playground`) · false 실제 유저만.
create or replace function public.companion_rating_stats(p_since timestamptz, p_playground boolean default null, p_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with rated as (
    select r.*, m.origin, m.meta, m.segments, m.reply_to, m.created_at as message_at, c.character_id, c.user_id as owner,
      coalesce(m.meta->>'model', 'unknown') as model
    from companion.message_ratings r
    join companion.messages m on m.id = r.message_id
    join companion.conversations c on c.id = m.conversation_id
    where r.updated_at >= p_since
      and (p_playground is null or coalesce((m.meta->>'playground')::boolean, false) = p_playground)
  )
  select jsonb_build_object(
    'since', p_since,
    'up', (select count(*) from rated where value = 'up'),
    'down', (select count(*) from rated where value = 'down'),
    'byCharacter', coalesce((
      select jsonb_object_agg(character_id, jsonb_build_object('up', up, 'down', down)) from (
        select character_id, count(*) filter (where value = 'up') as up, count(*) filter (where value = 'down') as down
        from rated group by 1
      ) g
    ), '{}'::jsonb),
    'byModel', coalesce((
      select jsonb_object_agg(model, jsonb_build_object('up', up, 'down', down)) from (
        select model, count(*) filter (where value = 'up') as up, count(*) filter (where value = 'down') as down
        from rated group by 1
      ) g
    ), '{}'::jsonb),
    'byOrigin', coalesce((
      select jsonb_object_agg(origin, jsonb_build_object('up', up, 'down', down)) from (
        select origin, count(*) filter (where value = 'up') as up, count(*) filter (where value = 'down') as down
        from rated group by 1
      ) g
    ), '{}'::jsonb),
    'reasons', coalesce((
      select jsonb_object_agg(reason, n) from (
        select reason, count(*) as n from rated cross join lateral unnest(reasons) reason
        where value = 'down' group by 1
      ) g
    ), '{}'::jsonb),
    'recentDown', coalesce((
      select jsonb_agg(jsonb_build_object(
        'messageId', d.message_id, 'userId', d.owner, 'characterId', d.character_id, 'origin', d.origin,
        'model', d.model, 'reasons', to_jsonb(d.reasons), 'note', d.note, 'ratedAt', d.updated_at,
        'messageAt', d.message_at, 'segments', d.segments,
        'userText', (select u.text from companion.messages u where u.id = d.reply_to)
      ) order by d.updated_at desc)
      from (
        select * from rated where value = 'down' order by updated_at desc
        limit greatest(1, least(coalesce(p_limit, 50), 200))
      ) d
    ), '[]'::jsonb)
  )
$$;

-- ------------------------------------------------------------------ 고쳐서 다시 보내기

-- `companion_begin_turn`과 같은 인수 + 고칠 유저 메시지. 반환도 같다(막히면 `{result}` — not_latest_message · turn_in_progress ·
-- duplicate_message, 또는 시작의 trial_exhausted · insufficient_credits).
create or replace function public.companion_begin_replacement(
  p_user_id uuid,
  p_character_id text,
  p_client_message_id uuid,
  p_text text,
  p_input_mode text,
  p_history_limit integer,
  p_region text,
  p_now timestamptz,
  p_replaces_message_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation companion.conversations;
  v_old companion.messages;
  v_retry boolean := false;
  v_result jsonb;
  v_new uuid;
begin
  select * into v_conversation from companion.conversations
  where user_id = p_user_id and character_id = p_character_id and kind = 'companion'
  for update;
  if not found then
    return jsonb_build_object('result', 'not_latest_message');
  end if;
  select * into v_old from companion.messages
  where id = p_replaces_message_id and conversation_id = v_conversation.id and user_id = p_user_id and role = 'user';
  if not found then
    return jsonb_build_object('result', 'not_latest_message');
  end if;
  if v_old.client_message_id = p_client_message_id then
    return jsonb_build_object('result', 'duplicate_message');
  end if;

  if v_old.hidden then
    -- 같은 요청의 재시도: 이미 이 client_message_id의 메시지로 바뀌었다.
    v_retry := exists (
      select 1 from companion.messages n
      where n.id = (v_old.meta->>'replacedBy')::uuid and n.client_message_id = p_client_message_id
    );
    if not v_retry then
      return jsonb_build_object('result', 'not_latest_message');
    end if;
  else
    if v_old.status = 'pending' then
      return jsonb_build_object('result', 'turn_in_progress');
    end if;
    if exists (
      select 1 from companion.messages m
      where m.conversation_id = v_conversation.id and m.id <> v_old.id and not m.hidden
        and m.role in ('user', 'assistant') and m.created_at > v_old.created_at
        and (m.role = 'user' or m.reply_to is distinct from v_old.id)
    ) then
      return jsonb_build_object('result', 'not_latest_message');
    end if;
  end if;

  begin
    if not v_retry then
      update companion.messages
      set hidden = true, meta = meta || jsonb_build_object('replacedAt', p_now)
      where conversation_id = v_conversation.id and (id = v_old.id or (reply_to = v_old.id and role = 'assistant'));
    end if;
    v_result := public.companion_begin_turn(
      p_user_id, p_character_id, p_client_message_id, p_text, p_input_mode, p_history_limit, p_region, p_now);
    if v_result->>'result' <> 'ok' then
      -- 숨기기를 되돌린다(아래 예외 처리가 세이브포인트로 돌린다). 변수 v_result는 남는다.
      raise exception using errcode = 'P0001', message = 'begin_replacement_rollback';
    end if;
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'begin_replacement_rollback' then
      raise;
    end if;
    return v_result;
  end;

  v_new := (v_result->>'userMessageId')::uuid;
  update companion.messages set meta = meta || jsonb_build_object('replacedBy', v_new)
  where conversation_id = v_conversation.id and hidden and (id = v_old.id or (reply_to = v_old.id and role = 'assistant'));
  update companion.messages set meta = meta || jsonb_build_object('replaces', v_old.id) where id = v_new;
  return v_result;
end;
$$;

-- 칩 지표: 고쳐서 숨긴 캐릭터 답은 뺀다(20261123 본문 + 한 줄).
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
    where m.role = 'assistant' and m.origin in ('turn', 'greeting', 'proactive') and m.created_at >= p_since
      and m.meta ? 'suggestions'
      and not (m.hidden and m.meta ? 'replacedBy')
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

-- ------------------------------------------------------------------ 권한

revoke all on function companion.rate_message(uuid, uuid, text, text[], text) from public, anon, authenticated;
revoke all on function public.companion_rate_message(uuid, text, text[], text) from public, anon;
grant execute on function public.companion_rate_message(uuid, text, text[], text) to authenticated;
revoke all on function public.companion_operator_rate_message(uuid, uuid, text, text[], text) from public, anon, authenticated;
grant execute on function public.companion_operator_rate_message(uuid, uuid, text, text[], text) to service_role;
revoke all on function public.companion_rating_stats(timestamptz, boolean, integer) from public, anon, authenticated;
grant execute on function public.companion_rating_stats(timestamptz, boolean, integer) to service_role;
revoke all on function public.companion_begin_replacement(uuid, text, uuid, text, text, integer, text, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.companion_begin_replacement(uuid, text, uuid, text, text, integer, text, timestamptz, uuid)
  to service_role;
revoke all on function public.companion_suggestion_stats(timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.companion_suggestion_stats(timestamptz, boolean) to service_role;
