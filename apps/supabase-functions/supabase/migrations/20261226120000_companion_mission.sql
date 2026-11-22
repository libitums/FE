-- AI 컴패니언 2단계 — 롤플레이 미션 DB(PRD docs/specs/ai-companion-mission.md §3 · §5 · §6, ADR-0177).
--
-- 미션 한 판 = `companion.conversations`의 `kind = 'mission'` 한 행(판마다 새 행). 컴패니언 대화와 섞이지 않는다(ADR-0177 D2) —
-- 기존 SQL의 `kind = 'companion'` 조건과 `conversations_companion_uniq`(kind = 'companion'만)는 그대로 두고, 미션의 턴 · 끝은
-- 이 파일의 미션 전용 함수가 한다(D3 — `companion_begin_turn` · `companion_finish_turn`에 분기를 넣지 않는다).
--
-- 표
--   companion.missions          미션의 최신 정의(저장소 파일 그대로) · 켜짐. 파일을 올리는 스크립트가 `companion_upsert_mission`으로 쓴다.
--   companion.mission_versions  정의의 판마다 한 행. 판(대화 행)은 시작할 때의 판을 가리켜, 도중에 파일이 바뀌어도 그 판의 정의로 채점한다.
--   companion.mission_results   채점 결과(판마다 하나). 세부 점수와 그때의 가중치를 함께 남긴다 — 최종 점수는 이 파일의 SQL이 계산한다.
--   companion.mission_usage     하루 무료 횟수의 셈(UTC 날짜 — `usage_daily`와 같은 경계).
--   기존 표에 더함: conversations(미션 칸) · credit_holds(판 단위 예약) · messages.origin 'mission' · plans.daily_free_missions · settings(미션 값).
--
-- 값(§3.9): 시작할 때 판 단위로 예약한다 — 오늘 무료 횟수가 남았으면 금액 0 예약(free_daily), 아니면 엽전 정액(coins). 턴마다 빼지 않는다.
--   결과 저장 → 확정 · 그만둠 · 새 판 · 방치 → 확정(돌려주지 않음) · 채점 실패 → 해제(돌려줌) · 채점 다시 시도 성공 → 다시 받는다(모자라면 안 받음).
--   정책(무료 횟수 · 정액 · 열림)은 `companion.mission_gate` · `companion.mission_price` · `companion.mission_bill` 셋에만 있다.
--
-- 기존 함수 가운데 다시 정의하는 것은 `companion_release_stale_holds` 하나다 — 판 단위 예약(reason 'mission')은 판이 끝날 때까지 열려 있어야 해서
-- 「10분 넘은 열린 예약 해제」 작업에서 뺀다. 메시지 · 사진 · 음성 예약의 동작은 그대로다.
--
-- **운영 적용은 사람이 한다. 운영 DB에는 1단계 마이그레이션 기록이 정리될 때까지 적용하지 않는다(PRD §0.9).**

-- ------------------------------------------------------------------ 정의 검사

-- 미션 정의(부록 A)에서 SQL이 기대는 최소만 본다. 맞으면 null, 아니면 틀린 칸 이름.
create function companion.mission_definition_error(d jsonb)
returns text language plpgsql immutable as $$
declare
  v_goal jsonb;
  v_ids text[] := '{}';
  v_required integer := 0;
begin
  if d is null or jsonb_typeof(d) <> 'object' then
    return 'definition';
  end if;
  if coalesce(d->>'id', '') !~ '^[a-z0-9][a-z0-9-]{0,63}$' then
    return 'id';
  end if;
  if coalesce(d->>'episodeId', '') !~ '^[a-z0-9][a-z0-9-]{0,63}$' then
    return 'episodeId';
  end if;
  if coalesce(jsonb_typeof(d->'version'), '') <> 'number' or (d->>'version') !~ '^[1-9][0-9]{0,5}$' then
    return 'version';
  end if;
  if coalesce(jsonb_typeof(d->'turnLimit'), '') <> 'number' or (d->>'turnLimit') !~ '^[1-9][0-9]?$' or (d->>'turnLimit')::integer > 50 then
    return 'turnLimit';
  end if;
  if coalesce(jsonb_typeof(d->'opening'), '') <> 'object' or coalesce(jsonb_typeof(d->'opening'->'ko'), '') <> 'string'
    or char_length(d->'opening'->>'ko') not between 1 and 500 then
    return 'opening';
  end if;
  if d ? 'counterpart' and jsonb_typeof(d->'counterpart') <> 'object' then
    return 'counterpart';
  end if;
  if coalesce(jsonb_typeof(d->'goals'), '') <> 'array' or jsonb_array_length(d->'goals') not between 1 and 20 then
    return 'goals';
  end if;
  for v_goal in select value from jsonb_array_elements(d->'goals') loop
    if jsonb_typeof(v_goal) <> 'object' or coalesce(v_goal->>'id', '') !~ '^[a-z0-9_-]{1,32}$' or (v_goal->>'id') = any (v_ids) then
      return 'goals[].id';
    end if;
    if coalesce(jsonb_typeof(v_goal->'required'), '') <> 'boolean' then
      return 'goals[].required';
    end if;
    v_ids := v_ids || (v_goal->>'id');
    if (v_goal->>'required')::boolean then
      v_required := v_required + 1;
    end if;
  end loop;
  if v_required = 0 then
    return 'goals[].required';
  end if;
  -- 목표 표현: 미션 파일의 모양 { id, ko, meaning }(계약 `missionTargetExpressionSchema`), 또는 id 글자만.
  if d ? 'targetExpressions' and (jsonb_typeof(d->'targetExpressions') <> 'array'
    or exists (select 1 from jsonb_array_elements(d->'targetExpressions') e
      where not (jsonb_typeof(e.value) = 'string'
        or (jsonb_typeof(e.value) = 'object' and coalesce(jsonb_typeof(e.value->'id'), '') = 'string')))) then
    return 'targetExpressions';
  end if;
  -- 에피소드 완료 키(앱의 `completionKeys`). 없으면 최종 테스트 하나(`RP` — 앱의 DEFAULT_CATALOG_COMPLETION).
  if d ? 'completionKeys' and (jsonb_typeof(d->'completionKeys') <> 'array' or jsonb_array_length(d->'completionKeys') = 0
    or exists (select 1 from jsonb_array_elements(d->'completionKeys') e where jsonb_typeof(e.value) <> 'string')) then
    return 'completionKeys';
  end if;
  return null;
end;
$$;
revoke all on function companion.mission_definition_error(jsonb) from public;

-- ------------------------------------------------------------------ 표

create table companion.missions (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  episode_id text not null check (episode_id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  version integer not null check (version >= 1),
  definition jsonb not null check (companion.mission_definition_error(definition) is null),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (definition->>'id' = id and definition->>'episodeId' = episode_id and (definition->>'version')::integer = version)
);

create table companion.mission_versions (
  mission_id text not null references companion.missions (id),
  version integer not null check (version >= 1),
  definition jsonb not null check (companion.mission_definition_error(definition) is null),
  created_at timestamptz not null default now(),
  primary key (mission_id, version)
);

-- 판. 미션 칸은 미션 행에만, 컴패니언 행은 지금과 같다(캐릭터 필수).
alter table companion.conversations drop constraint conversations_kind_check;
alter table companion.conversations add constraint conversations_kind_check check (kind in ('companion', 'mission'));
alter table companion.conversations alter column character_id drop not null;
alter table companion.conversations
  add column mission_id text,
  add column mission_version integer,
  add column status text check (status is null or status in ('active', 'finished', 'abandoned')),
  -- { goalsDone: [목표 id, 파일 순서], turns, hints, hintGoals: [힌트를 준 목표 id], offTask, stall(새 목표 없이 이어진 턴), gradingFailed? }
  add column mission_state jsonb check (mission_state is null or jsonb_typeof(mission_state) = 'object'),
  add column ended_at timestamptz,
  -- goals(모든 목표) · turn_limit(턴 상한) · finish(필수를 이룬 뒤 학습자가 끝냄): 판이 끝남(채점 대상). user · stale: 그만둠 · 새 판 · 방치(채점 없음).
  -- 필수만 이룬 판은 끝나지 않는다(end_reason null — 「성공 확정」, 대화는 이어진다). 성공 · 실패는 끝난 까닭이 아니라 필수 목표로 정한다.
  add column end_reason text check (end_reason is null or end_reason in ('goals', 'turn_limit', 'finish', 'user', 'stale'));
alter table companion.conversations
  add constraint conversations_mission_version_fkey foreign key (mission_id, mission_version)
    references companion.mission_versions (mission_id, version),
  add constraint conversations_kind_shape check (
    (kind = 'companion' and character_id is not null and mission_id is null and mission_version is null and status is null
      and mission_state is null and ended_at is null and end_reason is null)
    or (kind = 'mission' and mission_id is not null and mission_version is not null and status is not null and mission_state is not null)
  );
-- 진행 중인 판은 사용자당 하나(§3.3 [제안]).
create unique index conversations_mission_active_uniq on companion.conversations (user_id) where kind = 'mission' and status = 'active';
create index conversations_mission_idx on companion.conversations (user_id, mission_id, created_at desc) where kind = 'mission';
create index conversations_mission_stale_idx on companion.conversations (last_message_at) where kind = 'mission' and status = 'active';

-- 미션의 상대역 메시지(진입 대사 · 턴의 답)는 origin 'mission'. 컴패니언의 평가 · 지표 · 미디어(origin 'turn' · 'greeting' · 'proactive')에 섞이지 않는다.
alter table companion.messages drop constraint messages_origin_check;
alter table companion.messages
  add constraint messages_origin_check check (origin in ('turn', 'proactive', 'crisis', 'greeting', 'mission'));

create table companion.mission_results (
  conversation_id uuid primary key references companion.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id text not null,
  mission_version integer not null,
  outcome text not null check (outcome in ('success', 'fail')),
  end_reason text not null check (end_reason in ('goals', 'turn_limit', 'finish')),
  -- [{ id, achieved, byTurn, byGrader, evidence }] — 정의의 목표 순서.
  goals jsonb not null check (jsonb_typeof(goals) = 'array'),
  -- [{ id, used }] — 정의의 목표 표현 순서.
  expressions jsonb not null default '[]'::jsonb check (jsonb_typeof(expressions) = 'array'),
  task_score integer not null check (task_score between 0 and 100),
  accuracy_score integer not null check (accuracy_score between 0 and 100),
  expression_score integer not null check (expression_score between 0 and 100),
  pronunciation_score integer check (pronunciation_score is null or pronunciation_score between 0 and 100),
  hints_used integer not null check (hints_used >= 0),
  total_score integer not null check (total_score between 0 and 100),
  -- { task, accuracy, expression, hintPenalty } — 그때의 settings.
  weights jsonb not null check (jsonb_typeof(weights) = 'object'),
  -- { retry: [문장], summary }
  feedback jsonb not null check (jsonb_typeof(feedback) = 'object'),
  grader_model text check (grader_model is null or char_length(grader_model) <= 200),
  -- 이 결과로 받은 값: free_daily · coins · none(다시 시도 때 잔액이 모자라 받지 않음).
  payment text not null check (payment in ('free_daily', 'coins', 'none')),
  credits_spent integer not null default 0 check (credits_spent >= 0),
  created_at timestamptz not null default now(),
  foreign key (mission_id, mission_version) references companion.mission_versions (mission_id, version)
);
create index mission_results_user_idx on companion.mission_results (user_id, mission_id, created_at desc);

-- 진입 대사 · 목표 글의 자동 번역 캐시(PRD §9 M6). 미션 × 판 × 학습자 언어마다 한 행 — 판이 오르면 새로 만든다.
-- 미션 파일에 그 언어의 글이 있으면 그것을 먼저 쓰고(사람이 검수한 번역), 없을 때만 번역 노드로 만들어 여기에 남긴다(검수 전 초안).
-- translation: { opening: 글 | null, goals: { 목표 id: 글 } }.
create table companion.mission_translations (
  mission_id text not null,
  mission_version integer not null,
  language text not null check (language ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  translation jsonb not null check (jsonb_typeof(translation) = 'object'),
  model text check (model is null or char_length(model) <= 200),
  created_at timestamptz not null default now(),
  primary key (mission_id, mission_version, language),
  foreign key (mission_id, mission_version) references companion.mission_versions (mission_id, version)
);

create table companion.mission_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  used integer not null default 0 check (used >= 0),
  primary key (user_id, day)
);

-- 판 단위 예약: reason 'mission', client_message_id 자리에도 대화 id(열린 예약은 판마다 하나 — 기존 유니크 색인), conversation_id 칸.
-- 미션의 상대역은 캐스트가 아닐 수 있어 character_id를 비울 수 있다(메시지 · 사진 · 음성 예약은 지금처럼 늘 채운다).
alter table companion.credit_holds drop constraint credit_holds_reason_check;
alter table companion.credit_holds
  add constraint credit_holds_reason_check check (reason in ('message', 'photo', 'voice', 'photo_redraw', 'mission'));
alter table companion.credit_holds alter column character_id drop not null;
alter table companion.credit_holds
  add column conversation_id uuid references companion.conversations (id) on delete set null,
  add constraint credit_holds_character_shape check (reason = 'mission' or character_id is not null);
create index credit_holds_conversation_idx on companion.credit_holds (conversation_id) where conversation_id is not null;

-- 요금제별 하루 무료 미션. 값은 사용자 결정 M1 — 아래는 진행을 막지 않으려는 임시 기본값이다(free 1회만 PRD §3.9 결정).
alter table companion.plans
  add column daily_free_missions integer not null default 0 check (daily_free_missions between 0 and 100);
update companion.plans set daily_free_missions = case id
  when 'free' then 1
  when 'unlimited_tickets' then 1   -- 임시(M1)
  when 'chat_plus' then 3           -- 임시(M1)
  when 'premium' then 5             -- 임시(M1)
  else 0 end;

alter table companion.settings
  add column missions_enabled boolean not null default false,
  add column missions_testers_only boolean not null default true,
  -- 엽전 정액. 값은 사용자 결정 M1 — 임시 기본값(메시지 3엽전 × 학습자 턴 상한 10의 약 1/3).
  add column mission_cost integer not null default 10 check (mission_cost between 0 and 100000),
  -- 최종 = max(0, round(task × 과업 + accuracy × 정확도 + expression × 목표 표현) − hint_penalty × 힌트). M3 — N2 실측 뒤 조정.
  add column mission_weight_task numeric not null default 0.5 check (mission_weight_task between 0 and 1),
  add column mission_weight_accuracy numeric not null default 0.3 check (mission_weight_accuracy between 0 and 1),
  add column mission_weight_expression numeric not null default 0.2 check (mission_weight_expression between 0 and 1),
  add column mission_hint_penalty integer not null default 5 check (mission_hint_penalty between 0 and 100),
  add column mission_hint_limit integer not null default 3 check (mission_hint_limit between 0 and 20),
  -- 방치된 판을 닫는 시간(마지막 메시지 뒤, M8).
  add column mission_stale_after interval not null default interval '30 minutes' check (mission_stale_after >= interval '5 minutes');

alter table companion.missions enable row level security;
alter table companion.mission_versions enable row level security;
alter table companion.mission_results enable row level security;
alter table companion.mission_usage enable row level security;
alter table companion.mission_translations enable row level security;
revoke all on table companion.mission_translations from public, anon, authenticated;
grant select, insert, update, delete on table companion.mission_translations to service_role;
revoke all on table companion.missions, companion.mission_versions, companion.mission_results, companion.mission_usage
  from public, anon, authenticated;
grant select, insert, update, delete on table companion.missions, companion.mission_versions, companion.mission_results,
  companion.mission_usage to service_role;

-- ------------------------------------------------------------------ 내부 도우미

create function companion.mission_ts(p timestamptz)
returns text language sql immutable as $$
  select to_char(p at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;

-- 판이 쓰는 정의(시작할 때의 판).
create function companion.mission_definition_of(c companion.conversations)
returns jsonb language sql stable as $$
  select definition from companion.mission_versions where mission_id = c.mission_id and version = c.mission_version
$$;

-- 그 에피소드를 끝냈는가 — 진행 스냅숏의 catalogProgress(엽전 지급 · 학습 맥락과 같은 출처)에 완료 키가 모두 있는가.
create function companion.mission_episode_done(p_user_id uuid, p_episode_id text, p_keys jsonb)
returns boolean language sql stable as $$
  select coalesce((
    select bool_and(
      jsonb_typeof(lp.progress->'catalogProgress'->p_episode_id) = 'array'
      and (lp.progress->'catalogProgress'->p_episode_id) ? k.value
    )
    from public.learning_progress lp
    cross join jsonb_array_elements_text(coalesce(p_keys, '["RP"]'::jsonb)) k
    where lp.user_id = p_user_id and jsonb_typeof(lp.progress->'catalogProgress') = 'object'
  ), false)
$$;

-- 열림. 열렸으면 null, 아니면 까닭(disabled · testers_only · mission_disabled · episode_locked).
create function companion.mission_unavailable_reason(p_user_id uuid, m companion.missions, s companion.settings, p_tester boolean)
returns text language sql stable as $$
  select case
    when not s.missions_enabled then 'disabled'
    when s.missions_testers_only and not coalesce(p_tester, false) then 'testers_only'
    when not m.enabled then 'mission_disabled'
    when not companion.mission_episode_done(p_user_id, m.episode_id, m.definition->'completionKeys') then 'episode_locked'
  end
$$;

-- 하루 무료 미션 수: 무료 요금제 · 활성 구독 권한 · 옛 등급 가운데 가장 큰 값.
create function companion.mission_free_daily(p_user_id uuid, p_now timestamptz)
returns integer language sql stable as $$
  select coalesce(max(p.daily_free_missions), 0)
  from companion.plans p
  where p.id = 'free'
    or p.id in (
      select e.entitlement from companion.plan_entitlements e
      where e.user_id = p_user_id and companion.plan_active(e.status, e.expires_at, p_now)
    )
    or p.id in (
      select t.tier from companion.entitlements t
      where t.user_id = p_user_id and (t.expires_at is null or t.expires_at > p_now)
    )
$$;

-- 이번 판의 값. payment: free_daily(무료 횟수가 남음) · coins(정액). affordable: 시작할 수 있는가.
create function companion.mission_price(p_user_id uuid, p_now timestamptz)
returns jsonb language sql stable as $$
  with q as (
    select
      companion.mission_free_daily(p_user_id, p_now) as daily,
      coalesce((select used from companion.mission_usage where user_id = p_user_id and day = (p_now at time zone 'utc')::date), 0) as used,
      (select mission_cost from companion.settings) as cost,
      coalesce((select sub_balance + grant_balance + paid_balance from companion.credit_wallets where user_id = p_user_id), 0) as balance
  )
  select jsonb_build_object(
    'payment', case when used < daily then 'free_daily' else 'coins' end,
    'freeDaily', daily,
    'freeRemaining', greatest(0, daily - used),
    'cost', cost,
    'balance', balance,
    'affordable', used < daily or balance >= cost
  )
  from q
$$;

-- 계정 단위 판정 — 컴패니언 판정(`turn_gate_base` 20261127)의 연령 · 일시 차단 · 사용 시간과 같은 규칙. 통과면 null.
-- 지역은 요청에 없으니 마지막으로 받은 지역(`profiles.last_region`)으로 본다(첫 인사와 같다).
create function companion.mission_account_gate(p_user_id uuid, p_now timestamptz)
returns jsonb language plpgsql stable as $$
declare
  s companion.settings;
  v_profile companion.profiles;
  v_band text;
  v_age integer;
  v_blocked timestamptz;
  v_usage companion.usage_daily;
begin
  select * into s from companion.settings;
  select * into v_profile from companion.profiles where user_id = p_user_id;
  v_band := companion.age_band(v_profile.birth_year, p_now);
  v_age := extract(year from p_now)::integer - v_profile.birth_year;
  -- 하한은 컴패니언과 같은 만 14세(20261217 — 개인정보보호법 · 처리방침 7절).
  if v_band = 'minor' and v_age < 14 then
    return jsonb_build_object('result', 'age_restricted', 'detail', jsonb_build_object('reason', 'guardian_consent_required'));
  end if;
  select blocked_until into v_blocked from companion.moderation_state where user_id = p_user_id;
  if v_blocked is not null and v_blocked > p_now then
    return jsonb_build_object('result', 'temporarily_blocked', 'detail', jsonb_build_object(
      'until', to_char(v_blocked at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')));
  end if;
  select * into v_usage from companion.usage_daily where user_id = p_user_id and day = (p_now at time zone 'utc')::date;
  if v_band <> 'adult' and coalesce(v_profile.last_region, '') = 'US' and v_usage.user_id is not null then
    if v_usage.active_seconds >= s.us_minor_daily_seconds then
      return jsonb_build_object('result', 'usage_time_limit', 'detail', jsonb_build_object('limit', 'daily',
        'resetsAt', to_char(((p_now at time zone 'utc')::date + 1)::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')));
    end if;
    if v_usage.last_activity_at >= p_now - companion.usage_gap()
      and v_usage.continuous_started_at <= p_now - make_interval(secs => s.us_minor_continuous_seconds) then
      return jsonb_build_object('result', 'usage_time_limit', 'detail', jsonb_build_object('limit', 'continuous',
        'resetsAt', to_char((v_usage.last_activity_at + companion.usage_gap()) at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')));
    end if;
  end if;
  if v_band <> 'adult' and s.minor_daily_limit_seconds is not null and v_usage.active_seconds >= s.minor_daily_limit_seconds then
    return jsonb_build_object('result', 'usage_time_limit', 'detail', jsonb_build_object('limit', 'daily',
      'resetsAt', to_char(((p_now at time zone 'utc')::date + 1)::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')));
  end if;
  return null;
end;
$$;

-- 판정 하나(§3.9). 열림 → 계정 단위 → 값. 통과면 { result: 'ok', missionId, version, price }.
create function companion.mission_gate(p_user_id uuid, p_mission_id text, p_now timestamptz)
returns jsonb language plpgsql stable as $$
declare
  s companion.settings;
  v_tester boolean;
  v_mission companion.missions;
  v_reason text;
  v_reject jsonb;
  v_price jsonb;
begin
  select * into s from companion.settings;
  select coalesce(raw_app_meta_data->>'duru_tester' = 'true', false) into v_tester from auth.users where id = p_user_id;
  if v_tester is null then
    return jsonb_build_object('result', 'invalid_session');
  end if;
  select * into v_mission from companion.missions where id = p_mission_id;
  if not found then
    -- 스위치가 꺼져 있으면 미션이 있는지도 알리지 않는다.
    if not s.missions_enabled or (s.missions_testers_only and not v_tester) then
      return jsonb_build_object('result', 'not_available', 'detail', jsonb_build_object(
        'reason', case when not s.missions_enabled then 'disabled' else 'testers_only' end));
    end if;
    return jsonb_build_object('result', 'mission_not_found');
  end if;
  v_reason := companion.mission_unavailable_reason(p_user_id, v_mission, s, v_tester);
  if v_reason is not null then
    return jsonb_build_object('result', 'not_available', 'detail', jsonb_build_object('reason', v_reason));
  end if;
  v_reject := companion.mission_account_gate(p_user_id, p_now);
  if v_reject is not null then
    return v_reject;
  end if;
  v_price := companion.mission_price(p_user_id, p_now);
  if not (v_price->>'affordable')::boolean then
    return jsonb_build_object('result', 'insufficient_credits', 'detail', jsonb_build_object(
      'required', (v_price->>'cost')::integer, 'balance', (v_price->>'balance')::integer));
  end if;
  return jsonb_build_object('result', 'ok', 'missionId', v_mission.id, 'version', v_mission.version, 'price', v_price);
end;
$$;

-- 값을 받는다(지갑이 잠긴 채로 부른다). 무료 횟수가 남았으면 그것을 쓰고 금액 0 예약, 아니면 정액을 bucket_order대로 예약.
-- 잔액이 모자라면 p_allow_none이면 { payment: 'none' }(예약 없음), 아니면 insufficient_credits.
create function companion.mission_bill(p_user_id uuid, p_conversation_id uuid, p_now timestamptz, p_allow_none boolean)
returns jsonb language plpgsql as $$
declare
  s companion.settings;
  v_price jsonb;
  v_left integer;
  v_take integer;
  v_bucket text;
  v_buckets jsonb := '{}'::jsonb;
  v_hold companion.credit_holds;
begin
  select * into s from companion.settings;
  v_price := companion.mission_price(p_user_id, p_now);
  if v_price->>'payment' = 'free_daily' then
    insert into companion.mission_usage (user_id, day, used) values (p_user_id, (p_now at time zone 'utc')::date, 1)
    on conflict (user_id, day) do update set used = companion.mission_usage.used + 1;
    insert into companion.credit_holds (user_id, client_message_id, conversation_id, character_id, amount, buckets, trial, plan_free, reason)
    values (p_user_id, p_conversation_id, p_conversation_id, null, 0, '{}'::jsonb, false, true, 'mission')
    returning * into v_hold;
    return jsonb_build_object('result', 'ok', 'payment', 'free_daily', 'holdId', v_hold.id, 'amount', 0);
  end if;
  if (v_price->>'balance')::integer < s.mission_cost then
    if p_allow_none then
      return jsonb_build_object('result', 'ok', 'payment', 'none', 'holdId', null, 'amount', 0);
    end if;
    return jsonb_build_object('result', 'insufficient_credits', 'detail', jsonb_build_object(
      'required', s.mission_cost, 'balance', (v_price->>'balance')::integer));
  end if;
  perform companion.lock_wallet(p_user_id);
  v_left := s.mission_cost;
  foreach v_bucket in array s.bucket_order loop
    exit when v_left = 0;
    execute format('select %I from companion.credit_wallets where user_id = $1', v_bucket || '_balance') into v_take using p_user_id;
    v_take := least(v_take, v_left);
    if v_take > 0 then
      execute format('update companion.credit_wallets set %I = %I - $1, updated_at = now() where user_id = $2',
        v_bucket || '_balance', v_bucket || '_balance') using v_take, p_user_id;
      v_buckets := v_buckets || jsonb_build_object(v_bucket, v_take);
      v_left := v_left - v_take;
    end if;
  end loop;
  insert into companion.credit_holds (user_id, client_message_id, conversation_id, character_id, amount, buckets, trial, plan_free, reason)
  values (p_user_id, p_conversation_id, p_conversation_id, null, s.mission_cost, v_buckets, false, false, 'mission')
  returning * into v_hold;
  insert into companion.credit_ledger (user_id, delta, bucket, kind, reason, ref_id, hold_id)
  select p_user_id, -value::integer, key, 'reserve', 'mission', p_conversation_id::text, v_hold.id from jsonb_each_text(v_buckets);
  return jsonb_build_object('result', 'ok', 'payment', 'coins', 'holdId', v_hold.id, 'amount', v_hold.amount);
end;
$$;

-- 판의 살아 있는(해제되지 않은) 예약.
create function companion.mission_live_hold(p_conversation_id uuid)
returns companion.credit_holds language sql stable as $$
  select * from companion.credit_holds
  where conversation_id = p_conversation_id and reason = 'mission' and status <> 'released'
  order by created_at desc limit 1
$$;

-- 판을 그만둠 · 방치로 닫는다. 예약은 확정한다(돌려주지 않는다 — §3.6).
create function companion.mission_abandon(p_conversation_id uuid, p_reason text, p_now timestamptz)
returns void language plpgsql as $$
declare
  v_hold uuid;
begin
  update companion.conversations
  set status = 'abandoned', end_reason = p_reason, ended_at = coalesce(ended_at, p_now)
  where id = p_conversation_id and kind = 'mission' and status = 'active';
  for v_hold in select id from companion.credit_holds
    where conversation_id = p_conversation_id and reason = 'mission' and status = 'open' loop
    perform companion.settle_hold(v_hold);
  end loop;
end;
$$;

-- 필수 목표를 모두 이뤘는가 · 모든 목표를 이뤘는가(판 상태 mission_state의 goalsDone 기준).
create function companion.mission_required_done(p_state jsonb, d jsonb)
returns boolean language sql immutable as $$
  select not exists (
    select 1 from jsonb_array_elements(d->'goals') g
    where (g.value->>'required')::boolean and not coalesce(p_state->'goalsDone', '[]'::jsonb) ? (g.value->>'id')
  )
$$;
create function companion.mission_all_done(p_state jsonb, d jsonb)
returns boolean language sql immutable as $$
  select not exists (
    select 1 from jsonb_array_elements(d->'goals') g
    where not coalesce(p_state->'goalsDone', '[]'::jsonb) ? (g.value->>'id')
  )
$$;

-- 목표 진척 · 남은 턴 · 남은 힌트(앱 · 서버가 함께 쓰는 모양).
create function companion.mission_progress_json(c companion.conversations, d jsonb)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'status', c.status,
    'endReason', c.end_reason,
    'goals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.value->>'id', 'required', (g.value->>'required')::boolean, 'label', g.value->'label',
        'done', coalesce(c.mission_state->'goalsDone', '[]'::jsonb) ? (g.value->>'id')
      ) order by g.ordinality)
      from jsonb_array_elements(d->'goals') with ordinality g
    ), '[]'::jsonb),
    'turnsUsed', coalesce((c.mission_state->>'turns')::integer, 0),
    'turnLimit', (d->>'turnLimit')::integer,
    'turnsLeft', greatest(0, (d->>'turnLimit')::integer - coalesce((c.mission_state->>'turns')::integer, 0)),
    'hintsUsed', coalesce((c.mission_state->>'hints')::integer, 0),
    'hintLimit', s.mission_hint_limit,
    'hintsLeft', greatest(0, s.mission_hint_limit - coalesce((c.mission_state->>'hints')::integer, 0)),
    'offTask', coalesce((c.mission_state->>'offTask')::integer, 0),
    -- 새 목표 없이 이어진 학습자 턴 수 — 연출 지시의 「막힘」(mission-direction.ts).
    'stall', coalesce((c.mission_state->>'stall')::integer, 0),
    'gradingFailed', coalesce((c.mission_state->>'gradingFailed')::boolean, false),
    -- 필수 목표를 모두 이뤘는가. 판이 끝나지 않았는데 참이면 앱은 「미션 성공 — 계속하기 / 끝내기」를 띄운다.
    'requiredDone', companion.mission_required_done(c.mission_state, d)
  )
  from companion.settings s
$$;

-- 판의 대화(진입 대사 포함, 오래된 것부터). 숨긴 것 · 처리 중인 것은 뺀다.
create function companion.mission_history(p_conversation_id uuid, p_except uuid)
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('role', m.role, 'text', m.text, 'segments', m.segments) order by m.created_at), '[]'::jsonb)
  from companion.messages m
  where m.conversation_id = p_conversation_id and m.id is distinct from p_except
    and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
$$;

-- 판의 교정 카드(턴마다 저장된 것, 오래된 것부터).
create function companion.mission_corrections(p_conversation_id uuid)
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(companion.correction_json(c) order by m.created_at), '[]'::jsonb)
  from companion.corrections c
  join companion.messages m on m.id = c.message_id
  where m.conversation_id = p_conversation_id and c.status = 'ok'
$$;

-- 지금의 가중치.
create function companion.mission_weights()
returns jsonb language sql stable as $$
  select jsonb_build_object('task', mission_weight_task, 'accuracy', mission_weight_accuracy,
    'expression', mission_weight_expression, 'hintPenalty', mission_hint_penalty)
  from companion.settings
$$;

-- 목표 글에 학습자 언어 칸을 채운다 — 파일에 있으면 그대로, 없으면 번역 캐시의 글(있을 때만). en · ko · 언어 모름이면 그대로.
create function companion.mission_label_in(p_label jsonb, p_goal_id text, p_language text, p_cache jsonb)
returns jsonb language sql immutable as $$
  select case
    when p_language is null or lower(p_language) in ('en', 'ko') or lower(p_language) like 'ko-%' or p_label ? p_language then p_label
    when jsonb_typeof(p_cache->'goals'->p_goal_id) = 'string' then p_label || jsonb_build_object(p_language, p_cache->'goals'->>p_goal_id)
    else p_label
  end
$$;
revoke all on function companion.mission_label_in(jsonb, text, text, jsonb) from public;

-- 앱에 보이는 정의의 부분(판정 기준 · 역할 카드 본문 · 예시 대사는 빼고).
create function companion.mission_card_json(d jsonb)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'id', d->>'id',
    'episodeId', d->>'episodeId',
    'version', (d->>'version')::integer,
    'title', d->'title',
    'image', d->'image',
    'counterpart', jsonb_build_object('label', d->'counterpart'->'label', 'characterId', d->'counterpart'->>'characterId'),
    'opening', d->'opening',
    'goals', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.value->>'id', 'required', (g.value->>'required')::boolean, 'label', g.value->'label')
        order by g.ordinality)
      from jsonb_array_elements(d->'goals') with ordinality g
    ), '[]'::jsonb),
    'turnLimit', (d->>'turnLimit')::integer
  )
$$;

-- 리포트(§3.8). 이 미션 내 최고 기록과 고친 문장 목록을 함께.
create function companion.mission_report_json(r companion.mission_results)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'conversationId', r.conversation_id,
    'missionId', r.mission_id,
    'missionVersion', r.mission_version,
    'outcome', r.outcome,
    'endReason', r.end_reason,
    -- 목표 · 표현 · 다시 해 볼 표현 · 총평 · 최고 기록은 계약 `missionReportSchema`의 칸(done · ko · meaning · retry · summary · bestScore)으로도 낸다.
    'goals', (
      select coalesce(jsonb_agg(rg.value || jsonb_build_object('label', g.value->'label', 'required', (g.value->>'required')::boolean,
        'done', coalesce((rg.value->>'achieved')::boolean, false))
        order by g.ordinality), '[]'::jsonb)
      from jsonb_array_elements(r.goals) rg
      left join lateral (
        select gg.value, gg.ordinality from jsonb_array_elements(v.definition->'goals') with ordinality gg
        where gg.value->>'id' = rg.value->>'id'
      ) g on true
    ),
    'expressions', (
      select coalesce(jsonb_agg(re.value || jsonb_build_object(
        'ko', coalesce(te.value->>'ko', re.value->>'id'), 'meaning', coalesce(te.value->>'meaning', ''))
        order by re.ordinality), '[]'::jsonb)
      from jsonb_array_elements(r.expressions) with ordinality re
      left join lateral (
        select e.value from jsonb_array_elements(coalesce(v.definition->'targetExpressions', '[]'::jsonb)) e
        where jsonb_typeof(e.value) = 'object' and e.value->>'id' = re.value->>'id' limit 1
      ) te on true
    ),
    'retry', coalesce((
      select jsonb_agg(case when jsonb_typeof(x.value) = 'string' then jsonb_build_object('ko', x.value #>> '{}', 'meaning', '')
        else x.value end order by x.ordinality)
      from jsonb_array_elements(coalesce(r.feedback->'retry', '[]'::jsonb)) with ordinality x
    ), '[]'::jsonb),
    'summary', coalesce(r.feedback->>'summary', ''),
    'taskScore', r.task_score,
    'accuracyScore', r.accuracy_score,
    'expressionScore', r.expression_score,
    'pronunciationScore', r.pronunciation_score,
    'hintsUsed', r.hints_used,
    'totalScore', r.total_score,
    'weights', r.weights,
    'feedback', r.feedback,
    'corrections', companion.mission_corrections(r.conversation_id),
    'best', (select max(x.total_score) from companion.mission_results x where x.user_id = r.user_id and x.mission_id = r.mission_id),
    'bestScore', (select max(x.total_score) from companion.mission_results x where x.user_id = r.user_id and x.mission_id = r.mission_id),
    'payment', r.payment,
    'creditsSpent', r.credits_spent,
    'graderModel', r.grader_model,
    'createdAt', companion.mission_ts(r.created_at)
  )
  from companion.mission_versions v
  where v.mission_id = r.mission_id and v.version = r.mission_version
$$;

-- 사용자의 미션 판(남의 판 · 컴패니언 대화는 null).
create function companion.mission_conversation(p_user_id uuid, p_conversation_id uuid, p_lock boolean)
returns companion.conversations language plpgsql as $$
declare
  c companion.conversations;
begin
  if p_lock then
    select * into c from companion.conversations
    where id = p_conversation_id and user_id = p_user_id and kind = 'mission' for update;
  else
    select * into c from companion.conversations
    where id = p_conversation_id and user_id = p_user_id and kind = 'mission';
  end if;
  return c;
end;
$$;

revoke all on function companion.mission_ts(timestamptz) from public;
revoke all on function companion.mission_definition_of(companion.conversations) from public;
revoke all on function companion.mission_episode_done(uuid, text, jsonb) from public;
revoke all on function companion.mission_unavailable_reason(uuid, companion.missions, companion.settings, boolean) from public;
revoke all on function companion.mission_free_daily(uuid, timestamptz) from public;
revoke all on function companion.mission_price(uuid, timestamptz) from public;
revoke all on function companion.mission_account_gate(uuid, timestamptz) from public;
revoke all on function companion.mission_gate(uuid, text, timestamptz) from public;
revoke all on function companion.mission_bill(uuid, uuid, timestamptz, boolean) from public;
revoke all on function companion.mission_live_hold(uuid) from public;
revoke all on function companion.mission_abandon(uuid, text, timestamptz) from public;
revoke all on function companion.mission_required_done(jsonb, jsonb) from public;
revoke all on function companion.mission_all_done(jsonb, jsonb) from public;
revoke all on function companion.mission_progress_json(companion.conversations, jsonb) from public;
revoke all on function companion.mission_history(uuid, uuid) from public;
revoke all on function companion.mission_corrections(uuid) from public;
revoke all on function companion.mission_weights() from public;
revoke all on function companion.mission_card_json(jsonb) from public;
revoke all on function companion.mission_report_json(companion.mission_results) from public;
revoke all on function companion.mission_conversation(uuid, uuid, boolean) from public;

-- ------------------------------------------------------------------ 기존 함수 — 판 단위 예약은 정리 작업에서 뺀다

-- 20261130 판 + `reason <> 'mission'` 한 줄. 판 단위 예약은 판이 끝날 때(결과 저장 · 그만둠 · 채점 실패 · 방치 정리) 닫힌다.
create or replace function public.companion_release_stale_holds(p_older_than interval)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold record;
  v_count integer := 0;
  v_media interval := make_interval(mins => (select media_pending_minutes from companion.settings));
begin
  for v_hold in select id, user_id, client_message_id, reason from companion.credit_holds
    where status = 'open' and reason <> 'mission'
      and created_at < now() - case when reason = 'message' then p_older_than else greatest(p_older_than, v_media) end loop
    perform companion.release_hold(v_hold.id);
    if v_hold.reason = 'message' then
      update companion.messages set status = 'failed'
      where user_id = v_hold.user_id and client_message_id = v_hold.client_message_id and status = 'pending';
    else
      update companion.media set status = 'failed', failure = 'expired', error = 'stale hold released', finished_at = now()
      where hold_id = v_hold.id and status = 'pending';
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ------------------------------------------------------------------ 서버용 (service_role)

-- 미션 파일 → 표. 판(version)은 내용을 바꾸면 올린다 — 같은 판에 다른 내용 · 낮은 판은 거절(22023).
-- 반환: { id, version, changed }.
create function public.companion_upsert_mission(p_definition jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_error text := companion.mission_definition_error(p_definition);
  v_id text := p_definition->>'id';
  v_version integer;
  v_existing companion.missions;
  v_old jsonb;
begin
  if v_error is not null then
    raise exception 'invalid mission definition: %', v_error using errcode = '22023';
  end if;
  v_version := (p_definition->>'version')::integer;
  if p_definition->'counterpart' ? 'characterId'
    and not exists (select 1 from companion.characters where id = p_definition->'counterpart'->>'characterId') then
    raise exception 'invalid mission definition: counterpart.characterId' using errcode = '22023';
  end if;
  select * into v_existing from companion.missions where id = v_id for update;
  if found and v_existing.version > v_version then
    raise exception 'mission % is already at version %', v_id, v_existing.version using errcode = '22023';
  end if;
  select definition into v_old from companion.mission_versions where mission_id = v_id and version = v_version;
  if v_old is not null and v_old <> p_definition then
    raise exception 'mission % version % changed without a version bump', v_id, v_version using errcode = '22023';
  end if;
  if v_old is not null then
    return jsonb_build_object('id', v_id, 'version', v_version, 'changed', false);
  end if;
  insert into companion.missions (id, episode_id, version, definition)
  values (v_id, p_definition->>'episodeId', v_version, p_definition)
  on conflict (id) do update set episode_id = excluded.episode_id, version = excluded.version,
    definition = excluded.definition, updated_at = now();
  insert into companion.mission_versions (mission_id, version, definition) values (v_id, v_version, p_definition);
  return jsonb_build_object('id', v_id, 'version', v_version, 'changed', true);
end;
$$;

-- ① 판 시작(§3.3). 판정 → 진행 중이던 판은 그만둠(확정) → 대화 행 · 예약 · 진입 대사.
create function public.companion_mission_start(p_user_id uuid, p_mission_id text, p_now timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gate jsonb := companion.mission_gate(p_user_id, p_mission_id, p_now);
  v_price jsonb;
  v_mission companion.missions;
  v_def jsonb;
  v_old uuid;
  v_abandoned uuid[] := '{}';
  v_character text;
  v_conv companion.conversations;
  v_bill jsonb;
  v_opening uuid := gen_random_uuid();
begin
  if v_gate->>'result' <> 'ok' then
    return v_gate;
  end if;
  -- 사용자마다 줄을 세운다(시작 · 결과 저장 · 다른 차감이 같은 지갑 잠금을 쓴다). 잠근 뒤 값을 다시 본다.
  perform companion.lock_wallet(p_user_id);
  v_price := companion.mission_price(p_user_id, p_now);
  if not (v_price->>'affordable')::boolean then
    return jsonb_build_object('result', 'insufficient_credits', 'detail', jsonb_build_object(
      'required', (v_price->>'cost')::integer, 'balance', (v_price->>'balance')::integer));
  end if;

  for v_old in select id from companion.conversations
    where user_id = p_user_id and kind = 'mission' and status = 'active' for update loop
    perform companion.mission_abandon(v_old, 'user', p_now);
    v_abandoned := v_abandoned || v_old;
  end loop;

  select * into v_mission from companion.missions where id = p_mission_id;
  v_def := v_mission.definition;
  select id into v_character from companion.characters where id = v_def->'counterpart'->>'characterId';
  insert into companion.conversations (user_id, character_id, kind, mission_id, mission_version, status, mission_state, last_message_at)
  values (p_user_id, v_character, 'mission', v_mission.id, v_mission.version, 'active',
    jsonb_build_object('goalsDone', '[]'::jsonb, 'turns', 0, 'hints', 0, 'hintGoals', '[]'::jsonb, 'offTask', 0, 'stall', 0), p_now)
  returning * into v_conv;

  v_bill := companion.mission_bill(p_user_id, v_conv.id, p_now, false);
  if v_bill->>'result' <> 'ok' then
    raise exception 'mission billing failed after lock' using errcode = 'P0001';
  end if;

  insert into companion.messages (id, conversation_id, user_id, role, origin, status, segments, meta, created_at)
  values (
    v_opening, v_conv.id, p_user_id, 'assistant', 'mission', 'complete',
    jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('kind', 'speech', 'text', v_def->'opening'->>'ko',
      'translation', v_def->'opening'->>'en'))),
    jsonb_strip_nulls(jsonb_build_object('missionOpening', true, 'roman', v_def->'opening'->>'roman')),
    clock_timestamp()
  );

  return jsonb_build_object(
    'result', 'ok',
    'conversationId', v_conv.id,
    'mission', jsonb_build_object('id', v_mission.id, 'version', v_mission.version, 'definition', v_def),
    'state', companion.mission_progress_json(v_conv, v_def),
    'openingMessageId', v_opening,
    'opening', v_def->'opening',
    'persona', (select persona from companion.characters where id = v_character),
    -- 학습자 언어와 그 언어의 번역 캐시(없으면 null — 서버가 만들어 `companion_save_mission_translation`으로 남긴다).
    'l1', (select l1 from companion.profiles where user_id = p_user_id),
    'translation', (select t.translation from companion.mission_translations t
      where t.mission_id = v_mission.id and t.mission_version = v_mission.version
        and t.language = (select l1 from companion.profiles where user_id = p_user_id)),
    'payment', v_bill->>'payment',
    'creditsReserved', (v_bill->>'amount')::integer,
    'holdId', v_bill->'holdId',
    'freeRemaining', (companion.mission_price(p_user_id, p_now)->>'freeRemaining')::integer,
    'balance', (select sub_balance + grant_balance + paid_balance from companion.credit_wallets where user_id = p_user_id),
    'abandoned', to_jsonb(v_abandoned)
  );
end;
$$;

-- ② 턴의 시작(차감 없음). 판 확인 → 진행 중 턴 · 중복 → 계정 단위 판정 → 학습자 메시지(pending) 저장 → 프롬프트 재료.
create function public.companion_mission_begin_turn(
  p_user_id uuid,
  p_conversation_id uuid,
  p_client_message_id uuid,
  p_text text,
  p_input_mode text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c companion.conversations;
  v_def jsonb;
  v_existing record;
  v_reject jsonb;
  v_profile companion.profiles;
  v_band text;
  v_notice record;
  v_usage record;
  v_message_id uuid;
begin
  if p_text is null or char_length(p_text) not between 1 and 1000 or p_input_mode is null or p_input_mode not in ('text', 'voice')
    or p_client_message_id is null then
    raise exception 'invalid turn' using errcode = '22023';
  end if;
  c := companion.mission_conversation(p_user_id, p_conversation_id, true);
  if c.id is null then
    return jsonb_build_object('result', 'mission_not_found');
  end if;
  if c.status <> 'active' then
    return jsonb_build_object('result', 'mission_closed', 'detail', jsonb_build_object('status', c.status, 'endReason', c.end_reason));
  end if;
  if c.end_reason is not null then
    return jsonb_build_object('result', 'mission_ended', 'detail', jsonb_build_object('endReason', c.end_reason));
  end if;

  select id, status, created_at, conversation_id into v_existing from companion.messages
  where user_id = p_user_id and client_message_id = p_client_message_id;
  if found then
    if v_existing.status = 'pending' and v_existing.created_at >= p_now - companion.pending_timeout() then
      return jsonb_build_object('result', 'turn_in_progress');
    end if;
    if v_existing.status in ('complete', 'blocked', 'crisis') or v_existing.conversation_id <> c.id then
      return jsonb_build_object('result', 'duplicate_message', 'detail', jsonb_build_object(
        'messageId', v_existing.id, 'messageStatus', v_existing.status));
    end if;
  end if;
  if exists (
    select 1 from companion.messages
    where conversation_id = c.id and role = 'user' and status = 'pending'
      and created_at >= p_now - companion.pending_timeout()
      and client_message_id is distinct from p_client_message_id
  ) then
    return jsonb_build_object('result', 'turn_in_progress');
  end if;

  v_reject := companion.mission_account_gate(p_user_id, p_now);
  if v_reject is not null then
    return v_reject;
  end if;

  v_def := companion.mission_definition_of(c);
  insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, input_mode)
  values (c.id, p_user_id, 'user', 'pending', p_client_message_id, p_text, p_input_mode)
  on conflict (user_id, client_message_id) where client_message_id is not null do update set
    status = 'pending', text = excluded.text, input_mode = excluded.input_mode, created_at = clock_timestamp()
  returning id into v_message_id;
  delete from companion.messages where reply_to = v_message_id;
  delete from companion.corrections where message_id = v_message_id;

  select * into v_profile from companion.profiles where user_id = p_user_id;
  v_band := companion.age_band(v_profile.birth_year, p_now);
  select * into v_notice from companion.notice_state where user_id = p_user_id;
  select continuous_started_at, last_activity_at into v_usage from companion.usage_daily
  where user_id = p_user_id order by day desc limit 1;

  return jsonb_build_object(
    'result', 'ok',
    'conversationId', c.id,
    'userMessageId', v_message_id,
    'mission', jsonb_build_object('id', c.mission_id, 'version', c.mission_version, 'definition', v_def),
    'state', companion.mission_progress_json(c, v_def),
    'persona', (select persona from companion.characters where id = c.character_id),
    'profile', jsonb_build_object(
      'ageBand', v_band,
      'l1', v_profile.l1,
      'region', v_profile.last_region,
      'feedbackMode', coalesce(v_profile.feedback_mode, 'separate')
    ),
    'learning', public.companion_learning_context(p_user_id, 60),
    'notices', to_jsonb(array_remove(array[
      case when v_notice.last_ai_disclosure_at is null
        or v_notice.last_ai_disclosure_at < p_now - interval '3 hours' then 'ai_disclosure' end,
      case when v_band <> 'adult' and v_notice.minor_notice_at is null then 'minor_notice' end,
      case when v_usage.last_activity_at >= p_now - companion.usage_gap()
        and v_usage.continuous_started_at <= p_now - interval '3 hours'
        and (v_notice.last_break_reminder_at is null or v_notice.last_break_reminder_at < p_now - interval '3 hours')
        then 'break_reminder' end
    ], null)),
    'history', companion.mission_history(c.id, v_message_id)
  );
end;
$$;

-- ② 턴의 끝. 상대역 답 · 고지 · 교정 · 검사 기록 저장, 목표 진척 합치기(되돌리지 않음), 학습자 턴 수 +1, 끝 판정.
-- 끝(모든 목표 → goals, 턴 상한 → turn_limit)은 end_reason · ended_at에 적고 status는 active로 둔다 — 닫기는 mission-finish(close)가 한다.
-- 필수 목표만 이뤘으면 끝이 아니다(성공 확정 · 판은 이어진다 — state.requiredDone). 그 뒤 학습자의 끝내기는 close가 finish로 적는다.
-- p_assistant: { id, segments, meta } | null. p_moderation: [{ layer, category, action }]. p_feedback: 1단계 finish와 같은 교정 카드 | null.
-- p_mission: 상태 줄 { goals_done: [id], off_task: bool, closing: bool } | null. 실패 · 차단 · 위기 턴은 턴 수 · 진척에 세지 않는다.
create function public.companion_mission_finish_turn(
  p_user_id uuid,
  p_user_message_id uuid,
  p_status text,
  p_assistant jsonb,
  p_moderation jsonb,
  p_notices text[],
  p_feedback jsonb,
  p_mission jsonb,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  v_user companion.messages;
  c companion.conversations;
  v_def jsonb;
  v_before jsonb;
  v_done jsonb;
  v_turns integer;
  v_end text;
  v_day date := (p_now at time zone 'utc')::date;
  v_usage companion.usage_daily;
  v_gap_seconds integer;
  v_state companion.moderation_state;
begin
  if p_status is null or p_status not in ('complete', 'blocked', 'crisis', 'failed') then
    raise exception 'invalid turn status' using errcode = '22023';
  end if;
  select * into s from companion.settings;
  select m.* into v_user from companion.messages m
  join companion.conversations cc on cc.id = m.conversation_id
  where m.id = p_user_message_id and m.role = 'user' and m.user_id = p_user_id and cc.kind = 'mission';
  if not found then
    raise exception 'turn not found' using errcode = 'P0002';
  end if;
  c := companion.mission_conversation(p_user_id, v_user.conversation_id, true);
  update companion.messages set status = p_status where id = v_user.id;

  insert into companion.messages (conversation_id, user_id, role, origin, status, notice_kind, reply_to, created_at)
  select c.id, p_user_id, 'notice', 'turn', 'complete', kind, v_user.id, clock_timestamp()
  from unnest(coalesce(p_notices, array[]::text[])) as kind;

  if p_assistant is not null then
    insert into companion.messages (id, conversation_id, user_id, role, origin, status, segments, meta, reply_to, created_at)
    values (
      (p_assistant->>'id')::uuid, c.id, p_user_id, 'assistant', 'mission',
      case when p_status = 'crisis' then 'crisis' else 'complete' end,
      coalesce(p_assistant->'segments', '[]'::jsonb), coalesce(p_assistant->'meta', '{}'::jsonb), v_user.id, clock_timestamp()
    );
  end if;

  if p_status = 'complete' and p_feedback is not null then
    insert into companion.corrections (message_id, status, kind, items, better, l1_to_ko, card)
    values (
      v_user.id, p_feedback->>'status', nullif(p_feedback->>'kind', ''),
      case when jsonb_typeof(p_feedback->'items') = 'array' then p_feedback->'items' end,
      case when jsonb_typeof(p_feedback->'better') = 'object' then p_feedback->'better' end,
      null,
      p_feedback - 'userMessageId'
    )
    on conflict (message_id) do nothing;
  end if;

  insert into companion.moderation_events (user_id, message_id, layer, category, action)
  select p_user_id, v_user.id, r.layer, r.category, r.action
  from jsonb_to_recordset(coalesce(p_moderation, '[]'::jsonb)) as r(layer text, category text, action text);

  -- 반복 위반은 컴패니언과 같은 계정 단위 셈에 더한다(§3.10). 미션 턴은 예약이 없어 차감은 없다.
  if p_status = 'blocked' and exists (
    select 1 from jsonb_to_recordset(coalesce(p_moderation, '[]'::jsonb)) as r(layer text, action text)
    where r.layer = 'input' and r.action = 'block'
  ) then
    insert into companion.moderation_state (user_id) values (p_user_id) on conflict do nothing;
    select * into v_state from companion.moderation_state where user_id = p_user_id for update;
    if v_state.window_started_at is null or v_state.window_started_at < p_now - s.strike_window then
      v_state.strikes := 0;
      v_state.window_started_at := p_now;
    end if;
    update companion.moderation_state set strikes = v_state.strikes + 1, window_started_at = v_state.window_started_at
    where user_id = p_user_id;
  end if;

  if p_notices is not null and cardinality(p_notices) > 0 then
    insert into companion.notice_state (user_id) values (p_user_id) on conflict do nothing;
    update companion.notice_state set
      last_ai_disclosure_at = case when 'ai_disclosure' = any (p_notices) then p_now else last_ai_disclosure_at end,
      last_break_reminder_at = case when 'break_reminder' = any (p_notices) then p_now else last_break_reminder_at end,
      minor_notice_at = case when 'minor_notice' = any (p_notices) then p_now else minor_notice_at end
    where user_id = p_user_id;
  end if;

  v_def := companion.mission_definition_of(c);
  v_before := coalesce(c.mission_state->'goalsDone', '[]'::jsonb);
  if p_status = 'complete' and c.status = 'active' and c.end_reason is null then
    -- 정의에 있는 id만, 한 번 달성하면 되돌리지 않는다. 순서는 정의의 순서.
    select coalesce(jsonb_agg(g.value->>'id' order by g.ordinality), '[]'::jsonb) into v_done
    from jsonb_array_elements(v_def->'goals') with ordinality g
    where v_before ? (g.value->>'id')
      or (jsonb_typeof(p_mission->'goals_done') = 'array' and (p_mission->'goals_done') ? (g.value->>'id'));
    v_turns := coalesce((c.mission_state->>'turns')::integer, 0) + 1;
    if companion.mission_all_done(jsonb_build_object('goalsDone', v_done), v_def) then
      v_end := 'goals';
    elsif v_turns >= (v_def->>'turnLimit')::integer then
      v_end := 'turn_limit';
    end if;
    update companion.conversations set
      mission_state = mission_state || jsonb_build_object(
        'goalsDone', v_done,
        'turns', v_turns,
        'offTask', coalesce((mission_state->>'offTask')::integer, 0)
          + case when coalesce((p_mission->>'off_task')::boolean, false) then 1 else 0 end,
        'stall', case when jsonb_array_length(v_done) > jsonb_array_length(v_before) then 0
          else coalesce((mission_state->>'stall')::integer, 0) + 1 end
      ),
      end_reason = v_end,
      ended_at = case when v_end is not null then p_now end
    where id = c.id
    returning * into c;
  end if;

  if p_status <> 'failed' then
    update companion.conversations set last_message_at = p_now where id = c.id returning * into c;
    -- 미션의 대화 시간도 사용 시간에 센다(§3.10 [제안], M7).
    insert into companion.usage_daily (user_id, day) values (p_user_id, v_day) on conflict do nothing;
    select * into v_usage from companion.usage_daily where user_id = p_user_id and day = v_day for update;
    v_gap_seconds := extract(epoch from p_now - v_usage.last_activity_at)::integer;
    update companion.usage_daily set
      turns = turns + 1,
      active_seconds = active_seconds + case
        when v_gap_seconds is not null and v_gap_seconds <= extract(epoch from companion.usage_gap()) then v_gap_seconds else 0 end,
      continuous_started_at = case
        when v_gap_seconds is null or v_gap_seconds > extract(epoch from companion.usage_gap()) then p_now
        else continuous_started_at end,
      last_activity_at = p_now
    where user_id = p_user_id and day = v_day;
  end if;

  return jsonb_build_object(
    'result', 'ok',
    'state', companion.mission_progress_json(c, v_def),
    'newlyDone', coalesce((
      select jsonb_agg(x.value) from jsonb_array_elements_text(coalesce(c.mission_state->'goalsDone', '[]'::jsonb)) x
      where not v_before ? x.value
    ), '[]'::jsonb),
    'ended', c.end_reason
  );
end;
$$;

-- 힌트(§3.5). 상한 확인 → 힌트 수 +1 → 아직 못 이룬 목표 하나(필수 먼저, 파일 순서). 값은 받지 않는다.
-- 힌트 수는 문장을 만들기 전에 센다(만들기가 실패해도 돌려주지 않는다 — 버튼을 연달아 눌러 공짜로 여러 번 받지 않게).
create function public.companion_mission_take_hint(p_user_id uuid, p_conversation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  c companion.conversations;
  v_def jsonb;
  v_goal jsonb;
  v_hints integer;
begin
  select * into s from companion.settings;
  c := companion.mission_conversation(p_user_id, p_conversation_id, true);
  if c.id is null then
    return jsonb_build_object('result', 'mission_not_found');
  end if;
  if c.status <> 'active' then
    return jsonb_build_object('result', 'mission_closed', 'detail', jsonb_build_object('status', c.status, 'endReason', c.end_reason));
  end if;
  if c.end_reason is not null then
    return jsonb_build_object('result', 'mission_ended', 'detail', jsonb_build_object('endReason', c.end_reason));
  end if;
  v_def := companion.mission_definition_of(c);
  v_hints := coalesce((c.mission_state->>'hints')::integer, 0);
  if v_hints >= s.mission_hint_limit then
    return jsonb_build_object('result', 'hint_limit', 'detail', jsonb_build_object('limit', s.mission_hint_limit));
  end if;
  select g.value into v_goal
  from jsonb_array_elements(v_def->'goals') with ordinality g
  where not coalesce(c.mission_state->'goalsDone', '[]'::jsonb) ? (g.value->>'id')
  order by (g.value->>'required')::boolean desc, g.ordinality
  limit 1;
  if v_goal is null then
    return jsonb_build_object('result', 'no_goal_left');
  end if;
  update companion.conversations set mission_state = mission_state || jsonb_build_object(
    'hints', v_hints + 1,
    'hintGoals', coalesce(mission_state->'hintGoals', '[]'::jsonb) || to_jsonb(v_goal->>'id')
  )
  where id = c.id
  returning * into c;
  return jsonb_build_object(
    'result', 'ok',
    'goalId', v_goal->>'id',
    'goal', v_goal,
    'state', companion.mission_progress_json(c, v_def),
    'mission', jsonb_build_object('id', c.mission_id, 'version', c.mission_version, 'definition', v_def),
    'persona', (select persona from companion.characters where id = c.character_id),
    'l1', (select l1 from companion.profiles where user_id = p_user_id),
    'history', companion.mission_history(c.id, null)
  );
end;
$$;

-- ③ 닫기(mission-finish). 몇 번 불러도 같은 결과.
--   결과가 이미 있으면 { result: 'graded', report }. 그만둔 판이면 { result: 'abandoned' }.
--   p_abandon이면 그만둠(예약 확정, 환불 없음) → { result: 'abandoned' }.
--   아니면 끝난 판(end_reason goals · turn_limit · finish)이어야 하고 채점 재료 { result: 'grade', … }를 돌려준다.
--   끝나지 않았어도 필수 목표를 모두 이뤘으면 학습자의 끝내기다 — end_reason finish로 적고 채점 재료를 준다. 필수를 못 이뤘으면 not_ended.
create function public.companion_mission_close(p_user_id uuid, p_conversation_id uuid, p_abandon boolean, p_now timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c companion.conversations;
  v_result companion.mission_results;
  v_def jsonb;
  v_profile companion.profiles;
begin
  c := companion.mission_conversation(p_user_id, p_conversation_id, true);
  if c.id is null then
    return jsonb_build_object('result', 'mission_not_found');
  end if;
  select * into v_result from companion.mission_results where conversation_id = c.id;
  if found then
    return jsonb_build_object('result', 'graded', 'report', companion.mission_report_json(v_result));
  end if;
  if c.status = 'abandoned' then
    return jsonb_build_object('result', 'abandoned', 'endReason', c.end_reason);
  end if;
  if coalesce(p_abandon, false) then
    perform companion.mission_abandon(c.id, 'user', p_now);
    return jsonb_build_object('result', 'abandoned', 'endReason', 'user',
      'balance', (select sub_balance + grant_balance + paid_balance from companion.credit_wallets where user_id = p_user_id));
  end if;
  v_def := companion.mission_definition_of(c);
  if c.end_reason is null and companion.mission_required_done(c.mission_state, v_def) then
    update companion.conversations set end_reason = 'finish', ended_at = p_now where id = c.id returning * into c;
  end if;
  if c.end_reason is null or c.end_reason not in ('goals', 'turn_limit', 'finish') then
    return jsonb_build_object('result', 'not_ended', 'state', companion.mission_progress_json(c, v_def));
  end if;
  select * into v_profile from companion.profiles where user_id = p_user_id;
  return jsonb_build_object(
    'result', 'grade',
    'conversationId', c.id,
    'endReason', c.end_reason,
    'mission', jsonb_build_object('id', c.mission_id, 'version', c.mission_version, 'definition', v_def),
    'state', companion.mission_progress_json(c, v_def),
    'transcript', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'role', m.role, 'text', m.text, 'segments', m.segments,
        'inputMode', m.input_mode, 'createdAt', companion.mission_ts(m.created_at)) order by m.created_at)
      from companion.messages m
      where m.conversation_id = c.id and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
    ), '[]'::jsonb),
    'corrections', companion.mission_corrections(c.id),
    'weights', companion.mission_weights(),
    'profile', jsonb_build_object('l1', v_profile.l1, 'ageBand', companion.age_band(v_profile.birth_year, p_now))
  );
end;
$$;

-- ③ 결과 저장. 채점자의 세부 값을 받아 SQL이 점수를 계산한다(§3.7 — 같은 세부 값에 늘 같은 최종 점수).
-- p_result: { goals: [{ id, achieved, evidence? }], accuracy: 0 ~ 100, expressions: [{ id, used }], retry: [문장 ≤ 3], summary, graderModel }.
-- 목표의 최종 달성 = 턴에서 쌓인 것 ∪ 채점자가 찾은 것(§3.7 [제안], M4). 예약을 확정하고 판을 finished로 닫는다.
-- 채점 실패 뒤 다시 시도면 예약이 없으니 다시 받는다 — 무료 횟수 → 정액 → 둘 다 안 되면 받지 않는다(payment 'none').
create function public.companion_mission_save_result(p_user_id uuid, p_conversation_id uuid, p_result jsonb, p_now timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  c companion.conversations;
  v_existing companion.mission_results;
  v_def jsonb;
  v_goals jsonb;
  v_expressions jsonb;
  v_total_goals integer;
  v_achieved integer;
  v_required_missing integer;
  v_targets integer;
  v_used integer;
  v_task integer;
  v_accuracy integer;
  v_expression integer;
  v_hints integer;
  v_score integer;
  v_hold companion.credit_holds;
  v_bill jsonb;
  v_payment text;
  v_spent integer := 0;
  v_row companion.mission_results;
begin
  if p_result is null or jsonb_typeof(p_result) <> 'object'
    or coalesce(jsonb_typeof(p_result->'accuracy'), '') <> 'number' or (p_result->>'accuracy')::numeric not between 0 and 100
    or (p_result ? 'goals' and jsonb_typeof(p_result->'goals') <> 'array')
    or (p_result ? 'expressions' and jsonb_typeof(p_result->'expressions') <> 'array')
    or (p_result ? 'retry' and jsonb_typeof(p_result->'retry') <> 'array')
    or (p_result ? 'summary' and jsonb_typeof(p_result->'summary') not in ('string', 'null')) then
    raise exception 'invalid mission result' using errcode = '22023';
  end if;
  select * into s from companion.settings;
  perform companion.lock_wallet(p_user_id);
  c := companion.mission_conversation(p_user_id, p_conversation_id, true);
  if c.id is null then
    return jsonb_build_object('result', 'mission_not_found');
  end if;
  select * into v_existing from companion.mission_results where conversation_id = c.id;
  if found then
    return jsonb_build_object('result', 'graded', 'report', companion.mission_report_json(v_existing));
  end if;
  if c.status = 'abandoned' then
    return jsonb_build_object('result', 'abandoned', 'endReason', c.end_reason);
  end if;
  if c.end_reason is null or c.end_reason not in ('goals', 'turn_limit', 'finish') then
    return jsonb_build_object('result', 'not_ended');
  end if;
  v_def := companion.mission_definition_of(c);

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', g.value->>'id',
      'achieved', by_turn or by_grader,
      'byTurn', by_turn,
      'byGrader', by_grader,
      'evidence', evidence
    ) order by g.ordinality), '[]'::jsonb),
    count(*), count(*) filter (where by_turn or by_grader),
    count(*) filter (where (g.value->>'required')::boolean and not (by_turn or by_grader))
  into v_goals, v_total_goals, v_achieved, v_required_missing
  from jsonb_array_elements(v_def->'goals') with ordinality g
  cross join lateral (
    select
      coalesce(c.mission_state->'goalsDone', '[]'::jsonb) ? (g.value->>'id') as by_turn,
      coalesce((
        select bool_or(coalesce((r.value->>'achieved')::boolean, false))
        from jsonb_array_elements(coalesce(p_result->'goals', '[]'::jsonb)) r where r.value->>'id' = g.value->>'id'
      ), false) as by_grader,
      (
        select r.value->>'evidence' from jsonb_array_elements(coalesce(p_result->'goals', '[]'::jsonb)) r
        where r.value->>'id' = g.value->>'id' and jsonb_typeof(r.value->'evidence') = 'string' limit 1
      ) as evidence
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'used', used) order by t.ordinality), '[]'::jsonb),
    count(*), count(*) filter (where used)
  into v_expressions, v_targets, v_used
  from (
    select case when jsonb_typeof(e.value) = 'string' then e.value #>> '{}' else e.value->>'id' end as id, e.ordinality
    from jsonb_array_elements(coalesce(v_def->'targetExpressions', '[]'::jsonb)) with ordinality e
  ) t
  cross join lateral (
    select coalesce((
      select bool_or(coalesce((r.value->>'used')::boolean, false))
      from jsonb_array_elements(coalesce(p_result->'expressions', '[]'::jsonb)) r where r.value->>'id' = t.id
    ), false) as used
  ) x;

  -- 세부 점수는 정수로 남기되, 최종 점수는 반올림 전의 값으로 계산한다(PRD §3.7의 식 그대로 — 코어 `scoreMission`과 같다).
  -- 예: 목표 셋 중 하나면 과업 33.33…이고, 33으로 먼저 자르면 최종이 1점 어긋날 수 있다.
  v_task := round(100.0 * v_achieved / v_total_goals);
  v_accuracy := round((p_result->>'accuracy')::numeric);
  v_expression := case when v_targets = 0 then 100 else round(100.0 * v_used / v_targets) end;
  v_hints := coalesce((c.mission_state->>'hints')::integer, 0);
  v_score := greatest(0, least(100, round(round(s.mission_weight_task * (100.0 * v_achieved / v_total_goals)
    + s.mission_weight_accuracy * least(100, greatest(0, (p_result->>'accuracy')::numeric))
    + s.mission_weight_expression * (case when v_targets = 0 then 100 else 100.0 * v_used / v_targets end), 6))
    - s.mission_hint_penalty * v_hints));

  v_hold := companion.mission_live_hold(c.id);
  if v_hold.id is not null then
    perform companion.settle_hold(v_hold.id);
    v_payment := case when v_hold.plan_free then 'free_daily' else 'coins' end;
    v_spent := v_hold.amount;
  else
    v_bill := companion.mission_bill(p_user_id, c.id, p_now, true);
    v_payment := v_bill->>'payment';
    v_spent := (v_bill->>'amount')::integer;
    if v_bill->>'holdId' is not null then
      perform companion.settle_hold((v_bill->>'holdId')::uuid);
    end if;
  end if;

  insert into companion.mission_results (
    conversation_id, user_id, mission_id, mission_version, outcome, end_reason, goals, expressions,
    task_score, accuracy_score, expression_score, pronunciation_score, hints_used, total_score, weights, feedback,
    grader_model, payment, credits_spent, created_at
  ) values (
    c.id, p_user_id, c.mission_id, c.mission_version, case when v_required_missing = 0 then 'success' else 'fail' end, c.end_reason,
    v_goals, v_expressions, v_task, v_accuracy, v_expression, null, v_hints, v_score, companion.mission_weights(),
    jsonb_build_object(
      -- 다시 해 볼 표현: { ko, meaning }(코어 `normalizeGrade`의 모양). 글자만 오면 뜻은 빈 글.
      'retry', coalesce((
        select jsonb_agg(x.item order by x.ordinality) from (
          select jsonb_build_object(
              'ko', case when jsonb_typeof(value) = 'string' then value #>> '{}' else value->>'ko' end,
              'meaning', case when jsonb_typeof(value) = 'object' then coalesce(value->>'meaning', '') else '' end
            ) as item, ordinality
          from jsonb_array_elements(coalesce(p_result->'retry', '[]'::jsonb)) with ordinality
          where (jsonb_typeof(value) = 'string' and value #>> '{}' <> '')
            or (jsonb_typeof(value) = 'object' and coalesce(value->>'ko', '') <> '')
          order by ordinality limit 3
        ) x
      ), '[]'::jsonb),
      'summary', case when jsonb_typeof(p_result->'summary') = 'string' then p_result->>'summary' end
    ),
    left(p_result->>'graderModel', 200), v_payment, v_spent, p_now
  )
  returning * into v_row;

  update companion.conversations set status = 'finished', ended_at = coalesce(ended_at, p_now),
    mission_state = mission_state - 'gradingFailed'
  where id = c.id;

  return jsonb_build_object('result', 'graded', 'report', companion.mission_report_json(v_row),
    'balance', (select sub_balance + grant_balance + paid_balance from companion.credit_wallets where user_id = p_user_id));
end;
$$;

-- ③ 채점 실패. 예약을 해제해 값을 돌려주고(무료 횟수도 돌려준다), 판은 끝난 채(active · end_reason) 둬 채점만 다시 부를 수 있게 한다.
-- 반환: { result: 'released', refunded, payment, state, balance }. 이미 돌려줬으면 refunded 0.
create function public.companion_mission_grading_failed(p_user_id uuid, p_conversation_id uuid, p_now timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c companion.conversations;
  v_existing companion.mission_results;
  v_hold companion.credit_holds;
begin
  perform companion.lock_wallet(p_user_id);
  c := companion.mission_conversation(p_user_id, p_conversation_id, true);
  if c.id is null then
    return jsonb_build_object('result', 'mission_not_found');
  end if;
  select * into v_existing from companion.mission_results where conversation_id = c.id;
  if found then
    return jsonb_build_object('result', 'graded', 'report', companion.mission_report_json(v_existing));
  end if;
  if c.status = 'abandoned' then
    return jsonb_build_object('result', 'abandoned', 'endReason', c.end_reason);
  end if;
  if c.end_reason is null or c.end_reason not in ('goals', 'turn_limit', 'finish') then
    return jsonb_build_object('result', 'not_ended');
  end if;
  v_hold := companion.mission_live_hold(c.id);
  if v_hold.id is not null and v_hold.status = 'open' then
    perform companion.release_hold(v_hold.id);
    if v_hold.plan_free then
      update companion.mission_usage set used = greatest(0, used - 1)
      where user_id = p_user_id and day = (v_hold.created_at at time zone 'utc')::date;
    end if;
  else
    v_hold := null;
  end if;
  update companion.conversations set mission_state = mission_state || jsonb_build_object('gradingFailed', true)
  where id = c.id returning * into c;
  return jsonb_build_object(
    'result', 'released',
    'refunded', coalesce(v_hold.amount, 0),
    'payment', case when v_hold.id is null then null when v_hold.plan_free then 'free_daily' else 'coins' end,
    'state', companion.mission_progress_json(c, companion.mission_definition_of(c)),
    'balance', (select sub_balance + grant_balance + paid_balance from companion.credit_wallets where user_id = p_user_id)
  );
end;
$$;

-- 번역 캐시 저장(서버가 번역 노드로 만든 뒤). 이미 있으면 그대로 둔다(먼저 만든 것이 이긴다). 반환: { saved }.
create function public.companion_save_mission_translation(
  p_mission_id text, p_mission_version integer, p_language text, p_translation jsonb, p_model text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_translation is null or jsonb_typeof(p_translation) <> 'object' then
    raise exception 'invalid translation' using errcode = '22023';
  end if;
  insert into companion.mission_translations (mission_id, mission_version, language, translation, model)
  values (p_mission_id, p_mission_version, p_language, p_translation, left(p_model, 200))
  on conflict (mission_id, mission_version, language) do nothing;
  get diagnostics v_count = row_count;
  return jsonb_build_object('saved', v_count > 0);
end;
$$;

-- 방치된 판 닫기(pg_cron). 마지막 메시지 뒤 settings.mission_stale_after가 지난 진행 중인 판 → abandoned · stale, 예약 확정.
-- 채점이 실패해 값을 이미 돌려준 판(gradingFailed)은 그대로 둔다 — 채점만 다시 부를 수 있다. 닫은 판 수.
-- 필수 목표를 이룬 채 이어 가다(requiredDone) 방치된 판도 같다 — 리포트 없이 stale(채점은 LLM이라 여기서 못 한다). 앱은 나갈 때 끝내기를 부른다.
create function public.companion_close_stale_missions(p_now timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_count integer := 0;
  v_after interval := (select mission_stale_after from companion.settings);
begin
  for v_id in select id from companion.conversations
    where kind = 'mission' and status = 'active' and coalesce(last_message_at, created_at) < p_now - v_after
      and not coalesce((mission_state->>'gradingFailed')::boolean, false)
    for update skip locked loop
    perform companion.mission_abandon(v_id, 'stale', p_now);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ------------------------------------------------------------------ 앱용 (authenticated)

-- 미션 목록(§4.1). 스위치가 꺼졌거나 시험 계정 한정에 걸리면 빈 목록(enabled false).
-- { enabled, price: { payment, freeDaily, freeRemaining, cost, balance, affordable }, missions: [카드 + available · unavailableReason · best · plays] }
create function public.companion_list_missions()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  s companion.settings;
  v_tester boolean;
  v_l1 text := (select l1 from companion.profiles where user_id = auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select * into s from companion.settings;
  select coalesce(raw_app_meta_data->>'duru_tester' = 'true', false) into v_tester from auth.users where id = v_user;
  -- 값(price)은 스위치가 꺼져도 낸다 — 계약 `missionListSchema`는 늘 있다. freeLeft = freeRemaining(계약의 이름).
  if not s.missions_enabled or (s.missions_testers_only and not coalesce(v_tester, false)) then
    return jsonb_build_object('enabled', false, 'missions', '[]'::jsonb, 'price',
      companion.mission_price(v_user, now()) || jsonb_build_object('freeLeft', (companion.mission_price(v_user, now())->>'freeRemaining')::integer));
  end if;
  return jsonb_build_object(
    'enabled', true,
    'l1', (select l1 from companion.profiles where user_id = v_user),
    'price', companion.mission_price(v_user, now())
      || jsonb_build_object('freeLeft', (companion.mission_price(v_user, now())->>'freeRemaining')::integer),
    'missions', coalesce((
      select jsonb_agg(companion.mission_card_json(m.definition) || jsonb_build_object(
        -- 목표 글에 학습자 언어 칸(파일 → 번역 캐시 순서, 둘 다 없으면 영어만).
        'goals', coalesce((
          select jsonb_agg(jsonb_build_object('id', g.value->>'id', 'required', (g.value->>'required')::boolean,
            'label', companion.mission_label_in(g.value->'label', g.value->>'id', v_l1,
              (select t.translation from companion.mission_translations t
                where t.mission_id = m.id and t.mission_version = m.version and t.language = v_l1))) order by g.ordinality)
          from jsonb_array_elements(m.definition->'goals') with ordinality g
        ), '[]'::jsonb),
        'available', x.reason is null,
        'unavailableReason', x.reason,
        -- 계약 칸: 목록 안(스위치 켬 · 미션 켬)에서 남는 까닭은 episode_locked뿐이라 unlocked = available.
        'unlocked', x.reason is null,
        'counterpartLabel', m.definition->'counterpart'->>'label',
        'characterId', m.definition->'counterpart'->>'characterId',
        'best', (
          select jsonb_build_object('totalScore', r.total_score, 'outcome', r.outcome, 'createdAt', companion.mission_ts(r.created_at))
          from companion.mission_results r where r.user_id = v_user and r.mission_id = m.id
          order by r.total_score desc, r.created_at desc limit 1
        ),
        'plays', (select count(*) from companion.mission_results r where r.user_id = v_user and r.mission_id = m.id)
      ) order by m.episode_id, m.id)
      from companion.missions m
      cross join lateral (select companion.mission_unavailable_reason(v_user, m, s, v_tester) as reason) x
      where m.enabled
    ), '[]'::jsonb)
  );
end;
$$;

-- 지난 리포트(§3.8). p_mission_id가 null이면 모든 미션. 최신부터 50개. { results: [리포트], best: { 미션 id: 최고 점수 } }.
create function public.companion_list_mission_results(p_mission_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  return jsonb_build_object(
    -- 계약 `missionResultsSchema`의 칸(missionId · bestScore). p_mission_id가 null이면 missionId도 null(모든 미션).
    'missionId', p_mission_id,
    'bestScore', (select max(total_score) from companion.mission_results
      where user_id = v_user and (p_mission_id is null or mission_id = p_mission_id)),
    'results', coalesce((
      select jsonb_agg(companion.mission_report_json(r) order by r.created_at desc)
      from (
        select * from companion.mission_results
        where user_id = v_user and (p_mission_id is null or mission_id = p_mission_id)
        order by created_at desc limit 50
      ) r
    ), '[]'::jsonb),
    'best', coalesce((
      select jsonb_object_agg(mission_id, best) from (
        select mission_id, max(total_score) as best from companion.mission_results
        where user_id = v_user and (p_mission_id is null or mission_id = p_mission_id)
        group by mission_id
      ) b
    ), '{}'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------------ 운영 조회 (service_role, 읽기만)

-- 한 사용자의 미션: 오늘의 값 · 최근 판 50개(상태 · 예약 · 결과 요약).
create function public.companion_inspect_missions(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'settings', (
      select jsonb_build_object('enabled', missions_enabled, 'testersOnly', missions_testers_only, 'cost', mission_cost,
        'weights', companion.mission_weights(), 'hintLimit', mission_hint_limit, 'staleAfter', mission_stale_after::text)
      from companion.settings
    ),
    'price', companion.mission_price(p_user_id, now()),
    'missions', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'version', m.version, 'enabled', m.enabled,
        'unavailableReason', companion.mission_unavailable_reason(p_user_id, m, s,
          coalesce((select raw_app_meta_data->>'duru_tester' = 'true' from auth.users where id = p_user_id), false))
      ) order by m.episode_id, m.id)
      from companion.missions m cross join companion.settings s
    ), '[]'::jsonb),
    'games', coalesce((
      select jsonb_agg(jsonb_build_object(
        'conversationId', c.id,
        'missionId', c.mission_id,
        'missionVersion', c.mission_version,
        'characterId', c.character_id,
        'status', c.status,
        'endReason', c.end_reason,
        'state', c.mission_state,
        'createdAt', c.created_at,
        'lastMessageAt', c.last_message_at,
        'endedAt', c.ended_at,
        'messages', (select count(*) from companion.messages m where m.conversation_id = c.id),
        'holds', coalesce((
          select jsonb_agg(jsonb_build_object('id', h.id, 'status', h.status, 'amount', h.amount, 'free', h.plan_free,
            'createdAt', h.created_at, 'closedAt', h.closed_at) order by h.created_at)
          from companion.credit_holds h where h.conversation_id = c.id
        ), '[]'::jsonb),
        'result', (
          select jsonb_build_object('outcome', r.outcome, 'totalScore', r.total_score, 'taskScore', r.task_score,
            'accuracyScore', r.accuracy_score, 'expressionScore', r.expression_score, 'hintsUsed', r.hints_used,
            'payment', r.payment, 'creditsSpent', r.credits_spent, 'graderModel', r.grader_model)
          from companion.mission_results r where r.conversation_id = c.id
        )
      ) order by c.created_at desc)
      from (
        select * from companion.conversations where user_id = p_user_id and kind = 'mission' order by created_at desc limit 50
      ) c
    ), '[]'::jsonb)
  )
$$;

-- 한 판의 대화 전문. 메시지마다 내부 상태 · meta · 판정이 붙는다(컴패니언 `companion_inspect_conversation`과 같은 모양).
create function public.companion_inspect_mission(p_conversation_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'conversation', jsonb_build_object('id', c.id, 'userId', c.user_id, 'missionId', c.mission_id, 'missionVersion', c.mission_version,
      'status', c.status, 'endReason', c.end_reason, 'state', c.mission_state, 'createdAt', c.created_at, 'endedAt', c.ended_at),
    'definition', companion.mission_definition_of(c),
    'messages', coalesce((
      select jsonb_agg(companion.message_json(m) || jsonb_build_object(
        'rawStatus', m.status,
        'text', m.text,
        'replyTo', m.reply_to,
        'meta', m.meta,
        'moderation', coalesce((
          select jsonb_agg(jsonb_build_object('layer', e.layer, 'category', e.category, 'action', e.action, 'createdAt', e.created_at)
            order by e.created_at)
          from companion.moderation_events e where e.message_id = m.id
        ), '[]'::jsonb)
      ) order by m.created_at)
      from companion.messages m where m.conversation_id = c.id
    ), '[]'::jsonb),
    'result', (select companion.mission_report_json(r) from companion.mission_results r where r.conversation_id = c.id)
  )
  from companion.conversations c
  where c.id = p_conversation_id and c.kind = 'mission'
$$;

-- ------------------------------------------------------------------ 권한

revoke all on function public.companion_upsert_mission(jsonb) from public, anon, authenticated;
revoke all on function public.companion_mission_start(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_mission_begin_turn(uuid, uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_mission_finish_turn(uuid, uuid, text, jsonb, jsonb, text[], jsonb, jsonb, timestamptz)
  from public, anon, authenticated;
revoke all on function public.companion_mission_take_hint(uuid, uuid) from public, anon, authenticated;
revoke all on function public.companion_mission_close(uuid, uuid, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_mission_save_result(uuid, uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_mission_grading_failed(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_close_stale_missions(timestamptz) from public, anon, authenticated;
revoke all on function public.companion_inspect_missions(uuid) from public, anon, authenticated;
revoke all on function public.companion_inspect_mission(uuid) from public, anon, authenticated;
grant execute on function public.companion_upsert_mission(jsonb) to service_role;
grant execute on function public.companion_mission_start(uuid, text, timestamptz) to service_role;
grant execute on function public.companion_mission_begin_turn(uuid, uuid, uuid, text, text, timestamptz) to service_role;
grant execute on function public.companion_mission_finish_turn(uuid, uuid, text, jsonb, jsonb, text[], jsonb, jsonb, timestamptz)
  to service_role;
grant execute on function public.companion_mission_take_hint(uuid, uuid) to service_role;
grant execute on function public.companion_mission_close(uuid, uuid, boolean, timestamptz) to service_role;
grant execute on function public.companion_mission_save_result(uuid, uuid, jsonb, timestamptz) to service_role;
grant execute on function public.companion_mission_grading_failed(uuid, uuid, timestamptz) to service_role;
grant execute on function public.companion_close_stale_missions(timestamptz) to service_role;
revoke all on function public.companion_save_mission_translation(text, integer, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.companion_save_mission_translation(text, integer, text, jsonb, text) to service_role;
grant execute on function public.companion_inspect_missions(uuid) to service_role;
grant execute on function public.companion_inspect_mission(uuid) to service_role;

revoke all on function public.companion_list_missions() from public, anon;
revoke all on function public.companion_list_mission_results(text) from public, anon;
grant execute on function public.companion_list_missions() to authenticated;
grant execute on function public.companion_list_mission_results(text) to authenticated;
