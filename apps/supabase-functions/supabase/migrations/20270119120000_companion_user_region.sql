-- 나라 판정을 온보딩 나라로 채운다(ADR-0127 · ADR-0191 개정, 2026-11-27).
--
-- 운영 사실(2026-11-27 SELECT): `companion.profiles.last_region`은 7,304명 전원 null이다 — 앱이 chat-send에 `client_region`을
-- 보내지 않는다(`chat-send-handler.ts` `body.client_region ?? null`). 그래서 「미성년 + 나라 앎 + US 아님」 조건이 아무에게도
-- 맞지 않아 미성년의 선톡 · 스토리 반응이 모두 `not_allowed`였다(11-27 일반 사용자의 첫 스토리 반응 2건 실패).
-- 온보딩 ② 나라(`public.learner_profiles.country_code`)는 채팅한 미성년 297명 중 296명, 성인 2,114명 중 2,108명이 가지고 있다.
--
-- 바꾸는 것:
-- 1. `companion.user_region(user)` = 기기 지역(`last_region`, 빈 문자열은 없음) → 온보딩 나라. 둘 다 없으면 null.
-- 2. 같은 뜻(「이 사람은 미국인가 · 어느 나라인가」)으로 `last_region`만 보던 판정을 이 함수로 바꾼다.
--    - `companion_proactive_context`: `allowed`(미성년 + 나라 앎 + US 아님) · `localHour`(`companion.user_timezone` — 선톡
--      빈도 판정 `proactive_skip_reason`과 같은 시간대).
--    - `companion_proactive_candidates`: 선톡 후보의 같은 연령 · 나라 조건.
--    - `companion.turn_gate_base`: 미국 판정(SB 1119 이용 시간 · 장기 기억 끔) · 응답의 `region`(위기 연락처 지역) =
--      요청 지역 → `user_region`.
--    - `companion_memory_flush_candidates`: 쉬는 대화 기억 뽑기의 `memoryEnabled`(관문과 같은 미국 판정).
-- 3. `companion_proactive_context`에 `reactionAllowed`를 더한다 — 스토리 반응 전용(사용자 결정 2026-11-27): 성인, 또는
--    나라를 알고 US가 아닌 미성년 · 나이 모름. 나이 모름은 「18세 미만 설정」 그대로(로맨스 없음 · 동기 출력 검사는 Edge가
--    ageBand로 한다) — 반응 허용에서만 빠지지 않는다. 선톡의 `allowed`는 나이 모름을 지금처럼 막는다.
--
-- 바꾸지 않는 것(근거):
-- - 시간대 함수 `companion.user_timezone` · `proactive_skip_reason` · `memory_batch`는 이미 `last_region` 다음에 온보딩 나라
--   (`country_timezone`)로 넘어간다.
-- - 운영 화면(`ops_*` · `companion_inspect_testers`)은 온보딩 나라를 먼저 보여 준다 — 표시용이라 그대로.
-- - 스토리 알림 후보의 `country`는 알림 문구 언어(온보딩 나라 먼저)라 뜻이 다르다.
-- - `begin_turn_base` · `companion_operator_set_profile`은 `last_region`을 적는 곳이다.
--
-- 함수 정의는 운영과 저장소가 어긋난 적이 있어(20261217 · 20261228) 통째로 다시 쓰지 않고, 지금 정의에서 해당 줄만 바꾼다.
-- 줄이 없으면(정의가 예상과 다르면) 멈춘다. 다시 실행해도 같다(이미 바뀌었으면 건너뜀).

create or replace function companion.user_region(p_user_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select nullif(p.last_region, '') from companion.profiles p where p.user_id = p_user_id),
    (select lp.country_code from public.learner_profiles lp where lp.user_id = p_user_id)
  )
$$;
revoke all on function companion.user_region(uuid) from public, anon, authenticated;

do $$
declare
  v_def text := pg_get_functiondef('public.companion_proactive_context(uuid,text,integer,timestamptz)'::regprocedure);
  v_allowed text := E'      or (companion.age_band(p.birth_year, p_now) = ''minor'' and p.last_region is not null and p.last_region <> ''US'')\n    ),\n';
  v_allowed_new text := E'      or (companion.age_band(p.birth_year, p_now) = ''minor'' and coalesce(companion.user_region(p_user_id), ''US'') <> ''US'')\n    ),\n'
    || E'    -- 스토리 반응 전용(20270119, 사용자 결정 2026-11-27): 나이 모름도 미성년과 같은 기준(나라 앎 · US 아님).\n'
    || E'    ''reactionAllowed'', not companion.friend_hidden(p_user_id, ch.persona, p_now) and (\n'
    || E'      companion.age_band(p.birth_year, p_now) = ''adult''\n'
    || E'      or coalesce(companion.user_region(p_user_id), ''US'') <> ''US''\n'
    || E'    ),\n';
  v_hour text := E'    ''localHour'', case when coalesce(p.timezone, companion.default_timezone(p.last_region)) is null then null\n'
    || E'      else extract(hour from p_now at time zone coalesce(p.timezone, companion.default_timezone(p.last_region)))::integer end,\n';
  v_hour_new text := E'    ''localHour'', extract(hour from p_now at time zone companion.user_timezone(p_user_id))::integer,\n';
begin
  if position('''reactionAllowed''' in v_def) > 0 then
    return;
  end if;
  if position(v_allowed in v_def) = 0 then
    raise exception 'companion_proactive_context: allowed line not found';
  end if;
  if position(v_hour in v_def) = 0 then
    raise exception 'companion_proactive_context: localHour line not found';
  end if;
  execute replace(replace(v_def, v_allowed, v_allowed_new), v_hour, v_hour_new);
end $$;

do $$
declare
  v_def text := pg_get_functiondef('public.companion_proactive_candidates(timestamptz,integer)'::regprocedure);
  v_line text := 'or (companion.age_band(p.birth_year, p_now) = ''minor'' and p.last_region is not null and p.last_region <> ''US'')';
  v_new text := 'or (companion.age_band(p.birth_year, p_now) = ''minor'' and coalesce(companion.user_region(c.user_id), ''US'') <> ''US'')';
begin
  if position(v_new in v_def) > 0 then
    return;
  end if;
  if position(v_line in v_def) = 0 then
    raise exception 'companion_proactive_candidates: region line not found';
  end if;
  execute replace(v_def, v_line, v_new);
end $$;

do $$
declare
  v_def text := pg_get_functiondef('companion.turn_gate_base(uuid,text,uuid,timestamptz,text)'::regprocedure);
  v_line text := 'v_region := coalesce(nullif(p_region, ''''), v_profile.last_region);';
  v_new text := 'v_region := coalesce(nullif(p_region, ''''), companion.user_region(p_user_id));';
  v_note text := '-- 미국 판정: 이번 요청의 기기 지역 또는 마지막으로 받은 지역(O12';
  v_note_new text := '-- 미국 판정: 이번 요청의 기기 지역 → 마지막으로 받은 지역 → 온보딩 나라(20270119 · O12';
begin
  if position(v_new in v_def) > 0 then
    return;
  end if;
  if position(v_line in v_def) = 0 then
    raise exception 'turn_gate_base: region line not found';
  end if;
  execute replace(replace(v_def, v_line, v_new), v_note, v_note_new);
end $$;

do $$
declare
  v_def text := pg_get_functiondef('public.companion_memory_flush_candidates(timestamptz,integer)'::regprocedure);
  v_line text := 'not (coalesce(p.last_region, '''') = ''US'' and (';
  v_new text := 'not (coalesce(companion.user_region(c.user_id), '''') = ''US'' and (';
begin
  if position(v_new in v_def) > 0 then
    return;
  end if;
  if position(v_line in v_def) = 0 then
    raise exception 'companion_memory_flush_candidates: region line not found';
  end if;
  execute replace(v_def, v_line, v_new);
end $$;
