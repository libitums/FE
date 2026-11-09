-- AI 컴패니언 — 추천 답변 칩(학습자가 탭해서 보낼 다음 말 셋: 이어 가기 · 되묻기 · 리액션, Edge Function `companion-suggest`).
--
--   매 턴 만들지 않고 앱의 「추천 답변」 버튼을 누를 때만 만든다. 만든 칩은 마지막 캐릭터 메시지의 `messages.suggestions`에 저장하고,
--   같은 메시지에 다시 누르면 저장된 칩을 돌려준다(모델 호출 없음). 새 턴이 오면 마지막 메시지가 바뀌어 캐시가 저절로 무효가 된다.
--   `companion.profiles.reply_suggestions`(기본 참)가 거짓이면 만들지 않는다.
--
--   서버용(service_role):
--     `companion_suggest_context` — `companion_turn_gate`와 같은 판정(시험 계정 · 티어 · 연령 · 일시 차단 · 이용 시간 · 진행 중인 턴)을
--       먼저 돌리고(멱등 검사는 새 id라 걸리지 않는다), 통과하면 페르소나 · 말투 단계 · 학습자 언어 · 연령대 · 칩 설정 · 마지막 캐릭터 메시지
--       (상태 · 출처 · 거절 여부 · 저장된 칩) · 그 뒤 유저 메시지가 차단됐는지 · 최근 대화를 돌려준다. 통과하지 못하면 `{result}`만.
--     `companion_save_suggestions` — 칩을 그 유저의 캐릭터 메시지에 저장한다. 찾지 못하면 false.
--   앱: `companion_save_profile`에 `p_reply_suggestions`, `companion_load_profile`이 `replySuggestions`를 더 돌려준다.
--   운영: `companion_operator_set_profile`에 `p_reply_suggestions`, `companion_inspect_testers`가 보여 준다. 기존 인수만 쓰는 호출은 그대로
--   돈다(새 인수는 기본값 null). 다시 실행해도 같은 결과다(열은 if not exists, 함수는 바꿔 쓰거나 지우고 다시 만든다).
--
-- 기존 컴패니언 마이그레이션(20261108 ~ 20261116) 뒤에 적용한다.

alter table companion.messages
  add column if not exists suggestions jsonb check (suggestions is null or jsonb_typeof(suggestions) = 'object');

alter table companion.profiles
  add column if not exists reply_suggestions boolean not null default true;

-- ------------------------------------------------------------------ 추천 답변 칩 (service_role)

create or replace function public.companion_suggest_context(p_user_id uuid, p_character_id text, p_history_limit integer, p_now timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_gate jsonb;
  v_conversation uuid;
  v_latest companion.messages;
  v_blocked boolean := false;
begin
  -- chat-send와 같은 판정. 지역은 이번 요청에 없으니 마지막으로 받은 지역으로 본다.
  v_gate := public.companion_turn_gate(p_user_id, p_character_id, gen_random_uuid(), p_now, null);
  if v_gate->>'result' <> 'ok' then
    return jsonb_build_object('result', v_gate->>'result');
  end if;

  select id into v_conversation from companion.conversations
  where user_id = p_user_id and character_id = p_character_id and kind = 'companion';
  select * into v_latest from companion.messages m
  where m.conversation_id = v_conversation and m.role = 'assistant' and not m.hidden and m.status in ('complete', 'crisis')
  order by m.created_at desc limit 1;
  -- 차단된 턴은 캐릭터 답을 남기지 않는다 — 마지막 캐릭터 메시지 뒤에 차단된 유저 메시지가 있으면 마지막 턴이 차단된 것이다.
  if v_latest.id is not null then
    v_blocked := exists (
      select 1 from companion.messages m
      where m.conversation_id = v_conversation and m.role = 'user' and m.status = 'blocked' and m.created_at > v_latest.created_at
    );
  end if;

  return jsonb_build_object(
    'result', 'ok',
    'ageBand', v_gate->'ageBand',
    'l1', v_gate->'l1',
    'replySuggestions', coalesce((select p.reply_suggestions from companion.profiles p where p.user_id = p_user_id), true),
    'persona', (select ch.persona from companion.characters ch where ch.id = p_character_id),
    'speechLevel', coalesce((
      select r.speech_level from companion.relationships r where r.user_id = p_user_id and r.character_id = p_character_id
    ), 'polite'),
    'latest', case when v_latest.id is null then null else jsonb_build_object(
      'id', v_latest.id,
      'status', v_latest.status,
      'origin', v_latest.origin,
      -- 거절 턴(정책 거절로 캐릭터가 대신 한 말)은 meta.refusal에 표시가 있다고 본다. 값이 거짓 · 비어 있으면 거절이 아니다.
      'refusal', coalesce(v_latest.meta->>'refusal', 'false') not in ('false', ''),
      'suggestions', v_latest.suggestions
    ) end,
    'latestTurnBlocked', v_blocked,
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('role', h.role, 'text', h.text, 'segments', h.segments) order by h.created_at)
      from (
        select m.role, m.text, m.segments, m.created_at from companion.messages m
        where m.conversation_id = v_conversation and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
        order by m.created_at desc limit greatest(1, least(coalesce(p_history_limit, 6), 20))
      ) h
    ), '[]'::jsonb)
  );
end;
$$;

-- p_suggestions: { items: [{text, meaning, intent}], model, createdAt, playground? }. 그 유저의 캐릭터 메시지가 아니면 false.
create or replace function public.companion_save_suggestions(p_user_id uuid, p_message_id uuid, p_suggestions jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_suggestions is null or jsonb_typeof(p_suggestions) <> 'object'
    or jsonb_typeof(p_suggestions->'items') is distinct from 'array' then
    raise exception 'invalid suggestions' using errcode = '22023';
  end if;
  update companion.messages set suggestions = p_suggestions
  where id = p_message_id and user_id = p_user_id and role = 'assistant';
  return found;
end;
$$;

-- ------------------------------------------------------------------ 앱용 (authenticated)

create or replace function public.companion_load_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'birthYear', birth_year,
    'ageSource', age_source,
    'l1', l1,
    'feedbackMode', feedback_mode,
    'proactivePref', proactive_pref,
    'proactiveHour', proactive_hour,
    'timezone', timezone,
    'replySuggestions', reply_suggestions
  )
  from companion.profiles
  where user_id = auth.uid();
$$;

drop function if exists public.companion_save_profile(integer, text, text, text, text, integer, text);
drop function if exists public.companion_save_profile(integer, text, text, text, text, integer, text, boolean);
-- null인 인수는 그 열을 바꾸지 않는다. 생년과 출처는 둘 다 주거나 둘 다 비워야 한다. 생년은 올해를 넘을 수 없다.
-- 선톡: p_proactive_hour -1이면 선호 시각을 지우고(아무 때나), p_timezone ''이면 시간대를 지운다. 추천 답변 칩: p_reply_suggestions.
create function public.companion_save_profile(
  p_birth_year integer,
  p_age_source text,
  p_l1 text,
  p_feedback_mode text,
  p_proactive_pref text default null,
  p_proactive_hour integer default null,
  p_timezone text default null,
  p_reply_suggestions boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if (p_birth_year is null) <> (p_age_source is null)
    or (p_birth_year is not null and (
      p_birth_year < 1900 or p_birth_year > extract(year from now())::integer
    ))
    or (p_age_source is not null and p_age_source not in ('self', 'social', 'store_signal'))
    or (p_l1 is not null and p_l1 !~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$')
    or (p_feedback_mode is not null and p_feedback_mode not in ('separate', 'natural', 'prefix'))
    or not companion.valid_proactive_prefs(p_proactive_pref, p_proactive_hour, p_timezone) then
    raise exception 'invalid companion profile' using errcode = '22023';
  end if;
  insert into companion.profiles (user_id, birth_year, age_source, l1, feedback_mode, updated_at)
  values (auth.uid(), p_birth_year, p_age_source, p_l1, p_feedback_mode, now())
  on conflict (user_id) do update set
    birth_year = coalesce(excluded.birth_year, companion.profiles.birth_year),
    age_source = coalesce(excluded.age_source, companion.profiles.age_source),
    l1 = coalesce(excluded.l1, companion.profiles.l1),
    feedback_mode = coalesce(excluded.feedback_mode, companion.profiles.feedback_mode),
    updated_at = now();
  update companion.profiles set
    proactive_pref = coalesce(p_proactive_pref, proactive_pref),
    proactive_hour = case when p_proactive_hour = -1 then null else coalesce(p_proactive_hour::smallint, proactive_hour) end,
    timezone = case when p_timezone = '' then null else coalesce(p_timezone, timezone) end,
    reply_suggestions = coalesce(p_reply_suggestions, reply_suggestions)
  where user_id = auth.uid();
end;
$$;

-- ------------------------------------------------------------------ 운영 (service_role)

create or replace function public.companion_inspect_testers()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', u.id,
    'email', u.email,
    'ageBand', companion.age_band(p.birth_year, now()),
    'birthYear', p.birth_year,
    'l1', p.l1,
    'region', p.last_region,
    'feedbackMode', p.feedback_mode,
    'proactivePref', coalesce(p.proactive_pref, 'daily1'),
    'proactiveHour', p.proactive_hour,
    'timezone', p.timezone,
    'replySuggestions', coalesce(p.reply_suggestions, true)
  ) order by u.email), '[]'::jsonb)
  from auth.users u
  left join companion.profiles p on p.user_id = u.id
  where u.raw_app_meta_data->>'duru_tester' = 'true'
$$;

drop function if exists public.companion_operator_set_profile(uuid, integer, boolean, text, text, text, text, integer, text);
drop function if exists public.companion_operator_set_profile(uuid, integer, boolean, text, text, text, text, integer, text, boolean);
-- 플레이그라운드에서 시험 계정의 연령 · 모국어 · 피드백 방식 · 지역 · 선톡 설정 · 추천 답변 칩을 바꾼다. null 인수는 그 열을 바꾸지 않고,
-- p_clear_age면 생년을, p_region ''이면 지역을, p_proactive_hour -1이면 선호 시각을, p_timezone ''이면 시간대를 지운다.
create function public.companion_operator_set_profile(
  p_user_id uuid, p_birth_year integer, p_clear_age boolean, p_l1 text, p_feedback_mode text, p_region text,
  p_proactive_pref text default null, p_proactive_hour integer default null, p_timezone text default null,
  p_reply_suggestions boolean default null
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
  if not companion.valid_proactive_prefs(p_proactive_pref, p_proactive_hour, p_timezone) then
    raise exception 'invalid companion profile' using errcode = '22023';
  end if;
  insert into companion.profiles (user_id) values (p_user_id) on conflict do nothing;
  update companion.profiles set
    birth_year = case when p_clear_age then null else coalesce(p_birth_year::smallint, birth_year) end,
    age_source = case when p_clear_age then null when p_birth_year is not null then 'self' else age_source end,
    l1 = coalesce(p_l1, l1),
    feedback_mode = coalesce(p_feedback_mode, feedback_mode),
    -- 빈 문자열이면 지역을 지운다(null은 그대로 둔다).
    last_region = case when p_region = '' then null else coalesce(p_region, last_region) end,
    proactive_pref = coalesce(p_proactive_pref, proactive_pref),
    proactive_hour = case when p_proactive_hour = -1 then null else coalesce(p_proactive_hour::smallint, proactive_hour) end,
    timezone = case when p_timezone = '' then null else coalesce(p_timezone, timezone) end,
    reply_suggestions = coalesce(p_reply_suggestions, reply_suggestions),
    updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function public.companion_suggest_context(uuid, text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.companion_suggest_context(uuid, text, integer, timestamptz) to service_role;
revoke all on function public.companion_save_suggestions(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.companion_save_suggestions(uuid, uuid, jsonb) to service_role;
revoke all on function public.companion_save_profile(integer, text, text, text, text, integer, text, boolean) from public, anon;
grant execute on function public.companion_save_profile(integer, text, text, text, text, integer, text, boolean) to authenticated;
revoke all on function public.companion_operator_set_profile(uuid, integer, boolean, text, text, text, text, integer, text, boolean) from public, anon, authenticated;
grant execute on function public.companion_operator_set_profile(uuid, integer, boolean, text, text, text, text, integer, text, boolean) to service_role;
