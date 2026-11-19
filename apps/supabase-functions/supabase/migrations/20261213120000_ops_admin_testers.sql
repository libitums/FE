-- 운영 도구 2차(ops-dashboard `docs/admin-contract.md` §E-A) — 시험 계정 페이지 · 엽전 지급 고르기 · 대화 조각.
-- 20261212(ops 스키마 · `ops.actor` · `ops.log` · `ops.is_tester` · `ops.user_row`) 뒤에 적용한다. 공통 규칙은 20261212 그대로다.
--
-- 바뀌는 것:
--   · UserRow에 `paid`(결제한 적 있음): 그 사용자의 `companion.store_events`가 있거나(20261129가 있을 때만) 원장에 구매 · 구독
--     지급(reason `purchase` · `subscription`)이 있으면 true. 시험 계정 잔액 맞추기(reason `operator`)는 결제가 아니라 세지 않는다.
--   · `ops_user_conversation` — 메시지마다 `segments`(`companion.messages.segments` 그대로).
--   · `ops_grant_credits` — 메모가 늘 필수(btrim 1 ~ 200자, 아니면 `invalid_memo`).
-- 새 RPC: 찾기(필터) · 국가 목록 · 시험 계정 목록 · 시험 계정 상태, 시험 계정 전환 · 프로필 · 학습 범위 · 친밀도 · 구독 플랜 · 학습 초기화.
--
-- 정한 것(실제 스키마 때문):
--   · 스냅샷 셀피(`snapshot_self`)는 boolean이 아니라 `female` · `male` · `hidden`이라 `p_snapshot_self text`로 받는다.
--   · 친밀도: 턴 로직(20261204 `companion_finish_turn`)은 하한 0만 두고 상한이 없다 — 이 RPC는 0 ~ 10000을 받는다.
--     말투 단계는 턴과 같은 문턱(`speech_casual_at` · `speech_slang_at`, 캐릭터 `maxSpeechLevel`까지)으로 다시 계산한다 — 시험용이라 내려가기도 한다.
--   · 학습 초기화의 코인 수령: 원장은 지울 수 있지만(트리거 · 외래 키 없음) 지우면 지갑 합 = 원장 합이 깨지고 지급 기록이 사라진다.
--     그래서 지우지 않고, 수령 지급(reason `learning` · `launch_bonus` · `streak`)의 ref_id 끝에 `|reset@<epoch>`를 붙여
--     `companion.grant_once`의 「같은 ref_id면 다시 주지 않음」에서 풀어 준다. 이미 받은 엽전은 지갑에 그대로 남는다.
--   · 시험 계정 구독 플랜 행은 `environment 'sandbox'`로 넣는다(실제 매출 집계에 섞이지 않게).
--
-- 다시 적용해도 같은 결과다.

-- ------------------------------------------------------------------ 내부 도우미

-- 결제한 적이 있나. 20261129 표가 없으면 원장만 본다.
create or replace function ops.is_paid(p_user uuid)
returns boolean language plpgsql stable set search_path = '' as $$
declare
  v_store boolean := false;
begin
  if exists (
    select 1 from companion.credit_ledger
    where user_id = p_user and kind = 'grant' and reason in ('purchase', 'subscription')
  ) then
    return true;
  end if;
  if to_regclass('companion.store_events') is not null then
    execute 'select exists (select 1 from companion.store_events where user_id = $1)' into v_store using p_user;
  end if;
  return coalesce(v_store, false);
end;
$$;

-- UserRow(계약 §A + §E-A `paid`).
create or replace function ops.user_row(p_user uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'name', lp.name,
    'country', coalesce(lp.country_code, cp.last_region),
    'createdAt', u.created_at,
    'lastSignInAt', u.last_sign_in_at,
    'provider', u.raw_app_meta_data->>'provider',
    'tester', coalesce(u.raw_app_meta_data->>'duru_tester' = 'true', false),
    'tier', ops.tier_of(u.id),
    'balance', coalesce(w.sub_balance + w.grant_balance + w.paid_balance, 0),
    'blockedUntil', case when ms.blocked_until > now() then ms.blocked_until end,
    'paid', ops.is_paid(u.id)
  )
  from auth.users u
  left join public.learner_profiles lp on lp.user_id = u.id
  left join companion.profiles cp on cp.user_id = u.id
  left join companion.credit_wallets w on w.user_id = u.id
  left join companion.moderation_state ms on ms.user_id = u.id
  where u.id = p_user
$$;

-- 시험 계정 상태의 profile(행이 없으면 열 기본값).
create or replace function ops.tester_profile(p_user uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'birthYear', p.birth_year,
    'ageSource', p.age_source,
    'l1', p.l1,
    'feedbackMode', p.feedback_mode,
    'region', p.last_region,
    'proactivePref', coalesce(p.proactive_pref, 'daily1'),
    'proactiveHour', p.proactive_hour,
    'timezone', p.timezone,
    'replySuggestions', coalesce(p.reply_suggestions, true),
    'snapshotSelf', coalesce(p.snapshot_self, 'female'),
    'learningScope', coalesce(p.learning_scope, 'auto'),
    'learningUnits', to_jsonb(coalesce(p.learning_units, '{}'::text[]))
  )
  from (select 1) one
  left join companion.profiles p on p.user_id = p_user
$$;

-- 구독 플랜 행. 20261129 표가 없으면 null.
create or replace function ops.tester_plans(p_user uuid)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_plans jsonb;
begin
  if to_regclass('companion.plan_entitlements') is null then
    return null;
  end if;
  execute $q$
    select coalesce(jsonb_agg(jsonb_build_object('entitlement', entitlement, 'status', status, 'expiresAt', expires_at,
      'store', store, 'productId', product_id) order by entitlement), '[]'::jsonb)
    from companion.plan_entitlements where user_id = $1
  $q$ into v_plans using p_user;
  return v_plans;
end;
$$;

-- 학습 코인 수령(학습 · 출시 보너스 · 연속 학습) 가운데 초기화로 풀지 않은 것.
create or replace function ops.coin_claims(p_user uuid)
returns integer language sql stable set search_path = '' as $$
  select count(*)::integer from companion.credit_ledger
  where user_id = p_user and kind = 'grant' and reason in ('learning', 'launch_bonus', 'streak')
    and ref_id is not null and ref_id not like '%|reset@%'
$$;

revoke all on all functions in schema ops from public, anon, authenticated;

-- ------------------------------------------------------------------ 바뀌는 RPC

create or replace function public.ops_user_conversation(
  p_actor text, p_user uuid, p_character text, p_before timestamptz default null, p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_messages jsonb;
begin
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if p_character is null or btrim(p_character) = '' then
    raise exception 'invalid_character' using errcode = '22023';
  end if;
  if p_limit is null or p_limit not between 1 and 300 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;
  -- 캐릭터 답은 대개 segments만 있다(text는 사용자 메시지). 숨긴 메시지도 운영자에게는 그대로 보인다.
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'role', m.role, 'origin', m.origin, 'text', m.text,
    'segments', m.segments, 'status', m.status, 'creditsSpent', m.credits_spent, 'createdAt', m.created_at)
    order by m.created_at desc), '[]'::jsonb)
  into v_messages
  from (
    select m.* from companion.messages m
    join companion.conversations c on c.id = m.conversation_id
    where c.user_id = p_user and c.character_id = p_character and c.kind = 'companion'
      and (p_before is null or m.created_at < p_before)
    order by m.created_at desc
    limit p_limit
  ) m;
  perform ops.log(v_actor, 'view', 'user_conversation', p_user, jsonb_build_object('character', p_character));
  return jsonb_build_object('messages', v_messages);
end;
$$;

-- 20261212 판 + 메모 필수.
create or replace function public.ops_grant_credits(
  p_actor text, p_users uuid[], p_amount integer, p_reason text, p_memo text, p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_users uuid[];
  v_user uuid;
  v_granted integer := 0;
  v_duplicate integer := 0;
  v_missing uuid[] := '{}';
  v_memo text := btrim(p_memo);
begin
  if p_users is null or cardinality(p_users) = 0 then
    raise exception 'invalid_users' using errcode = '22023';
  end if;
  select array_agg(u order by ord) into v_users
  from (select u, min(ord) as ord from unnest(p_users) with ordinality as t(u, ord) where u is not null group by u) s;
  if v_users is null then
    raise exception 'invalid_users' using errcode = '22023';
  end if;
  if cardinality(v_users) > 1000 then
    raise exception 'too_many_users' using errcode = '22023';
  end if;
  if p_amount is null or p_amount not between 1 and 10000 then
    raise exception 'amount_out_of_range' using errcode = '22023';
  end if;
  if p_reason is null or p_reason not in ('cs', 'event', 'test', 'other') then
    raise exception 'invalid_reason' using errcode = '22023';
  end if;
  if v_memo is null or char_length(v_memo) not between 1 and 200 then
    raise exception 'invalid_memo' using errcode = '22023';
  end if;
  if p_request_id is null then
    raise exception 'invalid_request_id' using errcode = '22023';
  end if;

  foreach v_user in array v_users loop
    if not ops.user_exists(v_user) then
      v_missing := v_missing || v_user;
    elsif public.companion_grant_credits(v_user, 'grant', p_amount, 'ops_grant', 'ops-' || p_request_id || '-' || v_user, null) then
      v_granted := v_granted + 1;
    else
      v_duplicate := v_duplicate + 1;
    end if;
  end loop;

  perform ops.log(v_actor, 'write', 'grant_credits', case when cardinality(v_users) = 1 then v_users[1] end, jsonb_build_object(
    'amount', p_amount, 'reason', p_reason, 'memo', v_memo, 'requestId', p_request_id, 'count', cardinality(v_users),
    'granted', v_granted, 'duplicate', v_duplicate, 'missing', cardinality(v_missing),
    'users', to_jsonb(v_users[1:50])));
  return jsonb_build_object('ok', true, 'granted', v_granted, 'duplicate', v_duplicate, 'missing', to_jsonb(v_missing),
    'total', v_granted * p_amount);
end;
$$;

-- ------------------------------------------------------------------ 새 읽기 RPC

-- 필터 찾기(엽전 지급 대상 고르기). 조건은 모두 AND, 가입 최신순. total은 limit · offset 전 수. 열람 기록 detail = 받은 필터.
create or replace function public.ops_search_users(
  p_actor text,
  p_query text default null,
  p_country text default null,
  p_tester boolean default null,
  p_tier text default null,
  p_joined_after timestamptz default null,
  p_joined_before timestamptz default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_query text := nullif(btrim(p_query), '');
  v_uuid uuid;
  v_pattern text;
  v_total integer;
  v_items jsonb;
begin
  if v_query is not null and char_length(v_query) not between 2 and 200 then
    raise exception 'invalid_query' using errcode = '22023';
  end if;
  if p_country is not null and p_country !~ '^[A-Z]{2}$' then
    raise exception 'invalid_country' using errcode = '22023';
  end if;
  if p_tier is not null and p_tier not in ('free', 'chat_plus', 'premium', 'unlimited_tickets') then
    raise exception 'invalid_tier' using errcode = '22023';
  end if;
  if p_limit is null or p_limit not between 1 and 1000 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;
  if p_offset is null or p_offset not between 0 and 100000 then
    raise exception 'invalid_offset' using errcode = '22023';
  end if;
  if v_query ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_uuid := v_query::uuid;
  elsif v_query is not null then
    v_pattern := '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  with matched as (
    select u.id, u.created_at
    from auth.users u
    left join public.learner_profiles lp on lp.user_id = u.id
    left join companion.profiles cp on cp.user_id = u.id
    where (v_query is null or (v_uuid is not null and u.id = v_uuid)
        or (v_pattern is not null and (u.email ilike v_pattern or lp.name ilike v_pattern)))
      and (p_country is null or coalesce(lp.country_code, cp.last_region) = p_country)
      and (p_tester is null or coalesce(u.raw_app_meta_data->>'duru_tester' = 'true', false) = p_tester)
      and (p_joined_after is null or u.created_at >= p_joined_after)
      and (p_joined_before is null or u.created_at < p_joined_before)
      and (p_tier is null or ops.tier_of(u.id) = p_tier)
  )
  select
    (select count(*)::integer from matched),
    coalesce((
      select jsonb_agg(ops.user_row(x.id) order by x.created_at desc, x.id)
      from (select id, created_at from matched order by created_at desc, id limit p_limit offset p_offset) x
    ), '[]'::jsonb)
  into v_total, v_items;

  perform ops.log(v_actor, 'view', 'search_users', null, jsonb_strip_nulls(jsonb_build_object(
    'query', v_query, 'country', p_country, 'tester', p_tester, 'tier', p_tier,
    'joinedAfter', p_joined_after, 'joinedBefore', p_joined_before, 'limit', p_limit, 'offset', p_offset)));
  return jsonb_build_object('items', v_items, 'total', v_total);
end;
$$;

-- 국가별 사용자 수(UserRow의 country 기준, 모르는 사람은 뺀다). 한 사람의 정보가 아니라 기록하지 않는다.
create or replace function public.ops_countries(p_actor text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
begin
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object('country', c.country, 'users', c.users) order by c.users desc, c.country)
    from (
      select coalesce(lp.country_code, cp.last_region) as country, count(*)::integer as users
      from auth.users u
      left join public.learner_profiles lp on lp.user_id = u.id
      left join companion.profiles cp on cp.user_id = u.id
      where coalesce(lp.country_code, cp.last_region) is not null
      group by 1
    ) c
  ), '[]'::jsonb));
end;
$$;

create or replace function public.ops_list_testers(p_actor text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_items jsonb;
begin
  select coalesce(jsonb_agg(ops.user_row(x.id) order by x.email, x.id), '[]'::jsonb) into v_items
  from (
    select id, email from auth.users
    where raw_app_meta_data->>'duru_tester' = 'true'
    order by email, id
    limit 500
  ) x;
  perform ops.log(v_actor, 'view', 'list_testers', null, '{}'::jsonb);
  return jsonb_build_object('items', v_items);
end;
$$;

-- 시험 계정 조작 패널 한 번에. 시험 계정이 아니면 {ok:false, error:'not_a_tester'}(열람 기록 refused).
create or replace function public.ops_tester_state(p_actor text, p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_available jsonb;
  v_result jsonb;
begin
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if not ops.is_tester(p_user) then
    perform ops.log(v_actor, 'view', 'tester_state', p_user, jsonb_build_object('error', 'not_a_tester'), 'refused');
    return jsonb_build_object('ok', false, 'error', 'not_a_tester');
  end if;
  if to_regclass('companion.plans') is not null then
    execute $q$
      select coalesce(jsonb_agg(id order by sort_order, id), '[]'::jsonb) from companion.plans where id <> 'free'
    $q$ into v_available;
  end if;

  select jsonb_build_object(
    'ok', true,
    'user', ops.user_row(p_user),
    'profile', ops.tester_profile(p_user),
    'wallet', jsonb_build_object('sub', coalesce(w.sub_balance, 0), 'grant', coalesce(w.grant_balance, 0),
      'paid', coalesce(w.paid_balance, 0), 'subExpiresAt', w.sub_expires_at),
    'tier', (select jsonb_build_object('tier', e.tier, 'expiresAt', e.expires_at) from companion.entitlements e where e.user_id = p_user),
    'plans', ops.tester_plans(p_user),
    'plansAvailable', v_available,
    'characters', coalesce((
      select jsonb_agg(jsonb_build_object(
        'character', k.id,
        'name', k.persona->>'name',
        'intimacy', coalesce(r.intimacy, 0),
        'speechLevel', coalesce(r.speech_level, 'polite'),
        'messages', (select count(*) from companion.messages m join companion.conversations c on c.id = m.conversation_id
          where c.user_id = p_user and c.character_id = k.id)
      ) order by k.sort_order, k.id)
      from companion.characters k
      left join companion.relationships r on r.user_id = p_user and r.character_id = k.id
    ), '[]'::jsonb),
    'learning', jsonb_build_object(
      'hasProgress', exists (select 1 from public.learning_progress where user_id = p_user),
      'updatedAt', (select updated_at from public.learning_progress where user_id = p_user),
      'days', (select count(*) from public.learning_days where user_id = p_user),
      'lastDay', (select max(day) from public.learning_days where user_id = p_user),
      'coinClaims', ops.coin_claims(p_user)
    ),
    'moderation', jsonb_build_object('strikes', coalesce(ms.strikes, 0), 'blockedUntil', ms.blocked_until)
  ) into v_result
  from (select 1) one
  left join companion.credit_wallets w on w.user_id = p_user
  left join companion.moderation_state ms on ms.user_id = p_user;

  perform ops.log(v_actor, 'view', 'tester_state', p_user, '{}'::jsonb);
  return v_result;
end;
$$;

-- ------------------------------------------------------------------ 새 쓰기 RPC

-- 시험 계정 전환 · 해제(`raw_app_meta_data.duru_tester`). 이것이 전환이라 시험 계정 확인이 없다. 앱은 로그인 토큰에서 읽는다.
-- 해제하면 운영자가 넣은 등급도 지운다 — 구독 플랜의 운영 표시 행(store `ops`, product_id `ops_tester`)과 옛 등급 행
-- (`companion.entitlements` source `ops_admin` · `playground`). 해제 뒤에는 ops_tester_* 가 not_a_tester로 거절해 패널에서
-- 지울 수 없고, 남겨 두면 등급이 그대로이고 매일 크론(grant_plan_coins)이 스토어를 보지 않고 플랜 엽전을 계속 준다.
-- 스토어(RevenueCat) 행은 건드리지 않는다. 지운 수는 `removed:{plans, tier}`로 돌려주고 기록한다(켤 때는 0).
create or replace function public.ops_set_tester(p_actor text, p_user uuid, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_before boolean;
  v_paid boolean;
  v_plans integer := 0;
  v_tier integer := 0;
  v_removed jsonb;
begin
  if p_on is null then
    raise exception 'invalid_value' using errcode = '22023';
  end if;
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  select coalesce(raw_app_meta_data->>'duru_tester' = 'true', false) into v_before from auth.users where id = p_user for update;
  update auth.users set raw_app_meta_data = case
    when p_on then coalesce(raw_app_meta_data, '{}'::jsonb) || '{"duru_tester": true}'::jsonb
    else coalesce(raw_app_meta_data, '{}'::jsonb) - 'duru_tester' end
  where id = p_user;
  if not p_on then
    if to_regclass('companion.plan_entitlements') is not null then
      execute $q$
        with d as (
          delete from companion.plan_entitlements where user_id = $1 and store = 'ops' and product_id = 'ops_tester' returning 1
        ) select count(*)::integer from d
      $q$ into v_plans using p_user;
    end if;
    with d as (
      delete from companion.entitlements where user_id = p_user and source in ('ops_admin', 'playground') returning 1
    ) select count(*)::integer into v_tier from d;
  end if;
  v_removed := jsonb_build_object('plans', v_plans, 'tier', v_tier);
  v_paid := ops.is_paid(p_user);
  perform ops.log(v_actor, 'write', 'set_tester', p_user,
    jsonb_build_object('before', v_before, 'after', p_on, 'paid', v_paid, 'removed', v_removed));
  return jsonb_build_object('ok', true, 'before', v_before, 'after', p_on, 'paid', v_paid, 'removed', v_removed);
end;
$$;

-- companion_operator_set_profile을 감싼다(null = 그대로, p_region · p_timezone '' = 지움, p_proactive_hour -1 = 지움,
-- p_clear_age = 나이 지움). 칸마다 먼저 검사해 `invalid_<칸>`으로 알린다.
create or replace function public.ops_tester_set_profile(
  p_actor text,
  p_user uuid,
  p_birth_year integer default null,
  p_clear_age boolean default null,
  p_l1 text default null,
  p_feedback_mode text default null,
  p_region text default null,
  p_proactive_pref text default null,
  p_proactive_hour integer default null,
  p_timezone text default null,
  p_reply_suggestions boolean default null,
  p_snapshot_self text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_detail jsonb := jsonb_strip_nulls(jsonb_build_object(
    'birthYear', p_birth_year, 'clearAge', p_clear_age, 'l1', p_l1, 'feedbackMode', p_feedback_mode, 'region', p_region,
    'proactivePref', p_proactive_pref, 'proactiveHour', p_proactive_hour, 'timezone', p_timezone,
    'replySuggestions', p_reply_suggestions, 'snapshotSelf', p_snapshot_self));
begin
  if p_birth_year is not null and p_birth_year not between 1900 and extract(year from now())::integer then
    raise exception 'invalid_birth_year' using errcode = '22023';
  end if;
  if p_l1 is not null and p_l1 !~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$' then
    raise exception 'invalid_l1' using errcode = '22023';
  end if;
  if p_feedback_mode is not null and p_feedback_mode not in ('separate', 'natural', 'prefix') then
    raise exception 'invalid_feedback_mode' using errcode = '22023';
  end if;
  if p_region is not null and p_region <> '' and p_region !~ '^[A-Z]{2}$' then
    raise exception 'invalid_region' using errcode = '22023';
  end if;
  if p_proactive_pref is not null and p_proactive_pref not in ('off', 'daily1', 'daily2') then
    raise exception 'invalid_proactive_pref' using errcode = '22023';
  end if;
  if p_proactive_hour is not null and p_proactive_hour not between -1 and 23 then
    raise exception 'invalid_proactive_hour' using errcode = '22023';
  end if;
  if p_timezone is not null and p_timezone <> '' and (
    p_timezone !~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+){0,2}$'
    or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
  ) then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;
  if p_snapshot_self is not null and p_snapshot_self not in ('female', 'male', 'hidden') then
    raise exception 'invalid_snapshot_self' using errcode = '22023';
  end if;
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if not ops.is_tester(p_user) then
    perform ops.log(v_actor, 'write', 'tester_set_profile', p_user, v_detail || '{"error": "not_a_tester"}'::jsonb, 'refused');
    return jsonb_build_object('ok', false, 'error', 'not_a_tester');
  end if;
  begin
    perform public.companion_operator_set_profile(p_user, p_birth_year, coalesce(p_clear_age, false), p_l1, p_feedback_mode,
      p_region, p_proactive_pref, p_proactive_hour, p_timezone, p_reply_suggestions, p_snapshot_self);
  exception when check_violation or invalid_parameter_value then
    raise exception 'invalid_profile' using errcode = '22023';
  end;
  perform ops.log(v_actor, 'write', 'tester_set_profile', p_user, v_detail);
  return jsonb_build_object('ok', true, 'profile', ops.tester_profile(p_user));
end;
$$;

-- companion_operator_set_learning_scope를 감싼다(p_units null = 고른 목록 그대로).
create or replace function public.ops_tester_set_learning_scope(p_actor text, p_user uuid, p_scope text, p_units text[] default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_profile jsonb;
begin
  if p_scope is null or p_scope not in ('auto', 'manual') then
    raise exception 'invalid_scope' using errcode = '22023';
  end if;
  if p_units is not null and (
    (select count(distinct u) from unnest(p_units) u where u is not null) > 50
    or exists (select 1 from unnest(p_units) u where u is not null and u !~ '^[a-z0-9][a-z0-9-]{0,63}$')
  ) then
    raise exception 'invalid_units' using errcode = '22023';
  end if;
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if not ops.is_tester(p_user) then
    perform ops.log(v_actor, 'write', 'tester_set_learning_scope', p_user,
      jsonb_build_object('scope', p_scope, 'units', to_jsonb(p_units), 'error', 'not_a_tester'), 'refused');
    return jsonb_build_object('ok', false, 'error', 'not_a_tester');
  end if;
  perform public.companion_operator_set_learning_scope(p_user, p_scope, p_units);
  v_profile := ops.tester_profile(p_user);
  perform ops.log(v_actor, 'write', 'tester_set_learning_scope', p_user,
    jsonb_build_object('scope', p_scope, 'units', v_profile->'learningUnits'));
  return jsonb_build_object('ok', true, 'learningScope', v_profile->'learningScope', 'learningUnits', v_profile->'learningUnits');
end;
$$;

-- 친밀도를 숫자로 맞춘다(0 ~ 10000, 턴의 하한 0). 관계 행이 없으면 만든다. 말투 단계는 턴과 같은 문턱으로 다시 계산.
create or replace function public.ops_tester_set_intimacy(p_actor text, p_user uuid, p_character text, p_value integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  s companion.settings;
  v_max text;
  v_level text;
  v_before integer;
begin
  if p_character is null or not exists (select 1 from companion.characters where id = p_character) then
    raise exception 'invalid_character' using errcode = '22023';
  end if;
  if p_value is null or p_value not between 0 and 10000 then
    raise exception 'invalid_value' using errcode = '22023';
  end if;
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if not ops.is_tester(p_user) then
    perform ops.log(v_actor, 'write', 'tester_set_intimacy', p_user,
      jsonb_build_object('character', p_character, 'value', p_value, 'error', 'not_a_tester'), 'refused');
    return jsonb_build_object('ok', false, 'error', 'not_a_tester');
  end if;
  select * into s from companion.settings;
  select coalesce(persona->>'maxSpeechLevel', 'slang') into v_max from companion.characters where id = p_character;
  v_level := case when p_value >= s.speech_slang_at then 'slang' when p_value >= s.speech_casual_at then 'casual' else 'polite' end;
  if companion.speech_rank(v_level) > companion.speech_rank(v_max) then
    v_level := v_max;
  end if;
  select intimacy into v_before from companion.relationships where user_id = p_user and character_id = p_character for update;
  insert into companion.relationships (user_id, character_id, intimacy, speech_level, updated_at)
  values (p_user, p_character, p_value, v_level, now())
  on conflict (user_id, character_id) do update set intimacy = excluded.intimacy, speech_level = excluded.speech_level, updated_at = now();
  perform ops.log(v_actor, 'write', 'tester_set_intimacy', p_user, jsonb_build_object(
    'character', p_character, 'before', coalesce(v_before, 0), 'after', p_value, 'speechLevel', v_level));
  return jsonb_build_object('ok', true, 'before', coalesce(v_before, 0), 'after', p_value);
end;
$$;

-- 구독 플랜(`companion.plan_entitlements`) 켜기 · 끄기. 켜면 운영 표시 행(product_id `ops_tester`, store `ops`, sandbox)으로 upsert,
-- 끄면 그 플랜 행을 지운다. 20261129 표가 없으면 {ok:false, error:'plans_unavailable'}(refused).
-- 그 플랜에 스토어 행(store가 `ops`가 아님 — RevenueCat이 넣은 실제 구독, 상태 무관)이 있으면 켜기 · 끄기 모두
-- {ok:false, error:'store_plan'}(refused) — 덮어쓰거나 지우면 실제 구독 기록이 망가진다.
-- 다시 켤 때 운영 행이 아직 활성이면 period_started_at을 그대로 둔다 — grant_plan_coins의 ref_id가 그 시각이라,
-- 바꾸면 다음 크론에 첫 달 엽전을 또 준다. 끝난(만료 · 상태 끝) 운영 행을 다시 켜면 새 기간(now())이다.
create or replace function public.ops_tester_set_plan(
  p_actor text, p_user uuid, p_entitlement text, p_active boolean, p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_detail jsonb := jsonb_build_object('entitlement', p_entitlement, 'active', p_active, 'expiresAt', p_expires_at);
  v_known boolean;
  v_store boolean;
begin
  if p_entitlement is null or btrim(p_entitlement) = '' then
    raise exception 'invalid_entitlement' using errcode = '22023';
  end if;
  if p_active is null then
    raise exception 'invalid_value' using errcode = '22023';
  end if;
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if not ops.is_tester(p_user) then
    perform ops.log(v_actor, 'write', 'tester_set_plan', p_user, v_detail || '{"error": "not_a_tester"}'::jsonb, 'refused');
    return jsonb_build_object('ok', false, 'error', 'not_a_tester');
  end if;
  if to_regclass('companion.plan_entitlements') is null or to_regclass('companion.plans') is null then
    perform ops.log(v_actor, 'write', 'tester_set_plan', p_user, v_detail || '{"error": "plans_unavailable"}'::jsonb, 'refused');
    return jsonb_build_object('ok', false, 'error', 'plans_unavailable');
  end if;
  execute 'select exists (select 1 from companion.plans where id = $1 and id <> ''free'')' into v_known using p_entitlement;
  if not v_known then
    raise exception 'invalid_entitlement' using errcode = '22023';
  end if;
  execute 'select exists (select 1 from companion.plan_entitlements where user_id = $1 and entitlement = $2 and store is distinct from ''ops'')'
    into v_store using p_user, p_entitlement;
  if v_store then
    perform ops.log(v_actor, 'write', 'tester_set_plan', p_user, v_detail || '{"error": "store_plan"}'::jsonb, 'refused');
    return jsonb_build_object('ok', false, 'error', 'store_plan');
  end if;
  if p_active then
    execute $q$
      insert into companion.plan_entitlements as t (user_id, entitlement, product_id, store, environment, status, will_renew,
        period_started_at, expires_at, pending_product_id, source_event_id, last_event_at, updated_at)
      values ($1, $2, 'ops_tester', 'ops', 'sandbox', 'active', false, now(), $3, null, 'ops:' || gen_random_uuid(), now(), now())
      on conflict (user_id, entitlement) do update set
        product_id = excluded.product_id, store = excluded.store, environment = excluded.environment, status = 'active',
        will_renew = false,
        period_started_at = case when companion.plan_active(t.status, t.expires_at, now()) then t.period_started_at
          else excluded.period_started_at end,
        expires_at = excluded.expires_at,
        pending_product_id = null, source_event_id = excluded.source_event_id, last_event_at = excluded.last_event_at,
        updated_at = now()
    $q$ using p_user, p_entitlement, p_expires_at;
  else
    execute 'delete from companion.plan_entitlements where user_id = $1 and entitlement = $2 and store = ''ops'''
      using p_user, p_entitlement;
  end if;
  perform ops.log(v_actor, 'write', 'tester_set_plan', p_user, v_detail);
  return jsonb_build_object('ok', true, 'plans', ops.tester_plans(p_user));
end;
$$;

-- 학습 진도 · 연속 학습일을 지우고 학습 코인 수령을 다시 받을 수 있게 한다(위 머리말: 원장은 지우지 않고 ref_id를 바꾼다).
-- 앱 기기의 진도는 앱에서 로그아웃해야 지워진다(앱이 다시 올리면 진도가 돌아온다).
create or replace function public.ops_tester_reset_learning(p_actor text, p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_progress integer;
  v_days integer;
  v_claims integer;
  v_deleted jsonb;
begin
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if not ops.is_tester(p_user) then
    perform ops.log(v_actor, 'write', 'tester_reset_learning', p_user, '{"error": "not_a_tester"}'::jsonb, 'refused');
    return jsonb_build_object('ok', false, 'error', 'not_a_tester');
  end if;
  delete from public.learning_progress where user_id = p_user;
  get diagnostics v_progress = row_count;
  delete from public.learning_days where user_id = p_user;
  get diagnostics v_days = row_count;
  update companion.credit_ledger
  set ref_id = ref_id || '|reset@' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint
  where user_id = p_user and kind = 'grant' and reason in ('learning', 'launch_bonus', 'streak')
    and ref_id is not null and ref_id not like '%|reset@%';
  get diagnostics v_claims = row_count;
  v_deleted := jsonb_build_object('progress', v_progress, 'days', v_days, 'claims', v_claims);
  perform ops.log(v_actor, 'write', 'tester_reset_learning', p_user, jsonb_build_object('deleted', v_deleted));
  return jsonb_build_object('ok', true, 'deleted', v_deleted);
end;
$$;

-- ------------------------------------------------------------------ 권한

revoke all on all functions in schema ops from public, anon, authenticated;
revoke all on function public.ops_user_conversation(text, uuid, text, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.ops_grant_credits(text, uuid[], integer, text, text, uuid) from public, anon, authenticated;
revoke all on function public.ops_search_users(text, text, text, boolean, text, timestamptz, timestamptz, integer, integer)
  from public, anon, authenticated;
revoke all on function public.ops_countries(text) from public, anon, authenticated;
revoke all on function public.ops_list_testers(text) from public, anon, authenticated;
revoke all on function public.ops_tester_state(text, uuid) from public, anon, authenticated;
revoke all on function public.ops_set_tester(text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.ops_tester_set_profile(text, uuid, integer, boolean, text, text, text, text, integer, text, boolean, text)
  from public, anon, authenticated;
revoke all on function public.ops_tester_set_learning_scope(text, uuid, text, text[]) from public, anon, authenticated;
revoke all on function public.ops_tester_set_intimacy(text, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.ops_tester_set_plan(text, uuid, text, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.ops_tester_reset_learning(text, uuid) from public, anon, authenticated;
grant execute on function public.ops_user_conversation(text, uuid, text, timestamptz, integer) to service_role;
grant execute on function public.ops_grant_credits(text, uuid[], integer, text, text, uuid) to service_role;
grant execute on function public.ops_search_users(text, text, text, boolean, text, timestamptz, timestamptz, integer, integer)
  to service_role;
grant execute on function public.ops_countries(text) to service_role;
grant execute on function public.ops_list_testers(text) to service_role;
grant execute on function public.ops_tester_state(text, uuid) to service_role;
grant execute on function public.ops_set_tester(text, uuid, boolean) to service_role;
grant execute on function public.ops_tester_set_profile(text, uuid, integer, boolean, text, text, text, text, integer, text, boolean, text)
  to service_role;
grant execute on function public.ops_tester_set_learning_scope(text, uuid, text, text[]) to service_role;
grant execute on function public.ops_tester_set_intimacy(text, uuid, text, integer) to service_role;
grant execute on function public.ops_tester_set_plan(text, uuid, text, boolean, timestamptz) to service_role;
grant execute on function public.ops_tester_reset_learning(text, uuid) to service_role;
