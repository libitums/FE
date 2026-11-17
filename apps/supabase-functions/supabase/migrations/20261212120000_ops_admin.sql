-- 운영 도구(ops-dashboard `ops_admin`) — 사용자 조회 · 시험 계정 조작 · 정지 · 공개 스위치 · 엽전 지급 · 푸시 기록 · 감사 기록.
-- 기획 · 계약은 ops-dashboard `docs/admin.md` · `docs/admin-contract.md` §A가 진다.
--
-- 길은 하나다: `public.ops_*` — `service_role`만(운영 도구 서버가 서버 키로 부른다). 표는 `ops` 스키마에 두고 RPC로만 읽고 쓴다.
--   · 첫 인수는 늘 `p_actor`(운영자 로그인). 비면 `actor_required`.
--   · 읽기 RPC는 부를 때마다 `ops.audit_log`에 `kind='view'` 한 줄(열람 자동 기록). 설정 · 감사 기록 보기는 기록하지 않는다.
--   · 쓰기 RPC는 `kind='write'` 한 줄. 시험 계정만 되는 조작의 거절은 예외 대신 `{ok:false, error:'not_a_tester'}`를 돌려주고
--     `result='refused'`로 남긴다(예외면 기록도 롤백된다). 입력 검증 실패는 예외(`invalid_<칸>` 등)이고 기록하지 않는다.
--   · 운영 적용 전일 수 있는 표(`companion.plans` · `plan_entitlements` · `store_events`, 20261129)는 `to_regclass`로 보고
--     동적 SQL로만 읽는다 — 없으면 그 칸이 null이다. 이 파일은 20261129가 있든 없든 적용된다.
--
-- 기존 RPC의 시험 계정 확인(Q9):
--   · `companion_grant_credits` — reason `operator`는 시험 계정만(`not_a_tester`). reason 목록에 `ops_grant`(운영 지급)를 더한다.
--   · `companion_set_entitlement` — 시험 계정만. 부르는 곳이 플레이그라운드(ops-dashboard `companion.py`)뿐이다 — 구독 등급은
--     `plan_entitlements`(웹훅)가 쓰고 이 함수를 부르지 않는다.
-- 원장 kind에 `revoke`를 더한다(20261129와 같은 목록 — 시험 계정 잔액 내리기가 쓴다. 20261129가 나중에 와도 그대로 다시 건다).
--
-- 다시 적용해도 같은 결과다.

create schema if not exists ops;
revoke all on schema ops from public, anon, authenticated;

-- ------------------------------------------------------------------ 표

create table if not exists ops.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null check (char_length(actor) between 1 and 200),
  kind text not null check (kind in ('view', 'write', 'export')),
  action text not null check (char_length(action) between 1 and 100),
  target_user uuid,
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  result text not null default 'ok' check (result in ('ok', 'refused', 'error'))
);
create index if not exists audit_log_target_idx on ops.audit_log (target_user, at desc);
create index if not exists audit_log_at_idx on ops.audit_log (at desc);

-- 운영자 메모. 지우면 표시만(deleted_at) — 누가 지웠는지 남긴다.
create table if not exists ops.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  actor text not null check (char_length(actor) between 1 and 200),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text
);
create index if not exists user_notes_user_idx on ops.user_notes (user_id, created_at desc);

-- 운영자가 손으로 보낸 푸시(공지 · 시험 발송). FE 자동 캠페인 `push_campaign_sends`와 다른 것이다.
create table if not exists ops.push_sends (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor text not null check (char_length(actor) between 1 and 200),
  audience jsonb not null check (jsonb_typeof(audience) = 'object'),
  user_count integer not null check (user_count >= 0),
  title text not null check (char_length(title) between 1 and 100),
  body text not null check (char_length(body) between 1 and 500),
  target jsonb,
  test boolean not null,
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  summary jsonb,
  finished_at timestamptz
);
create index if not exists push_sends_created_idx on ops.push_sends (created_at desc);

alter table ops.audit_log enable row level security;
alter table ops.user_notes enable row level security;
alter table ops.push_sends enable row level security;
revoke all on table ops.audit_log, ops.user_notes, ops.push_sends from public, anon, authenticated, service_role;

-- 원장 회수(revoke) — 20261129와 같은 목록.
alter table companion.credit_ledger drop constraint if exists credit_ledger_kind_check;
alter table companion.credit_ledger add constraint credit_ledger_kind_check
  check (kind in ('grant', 'reserve', 'settle', 'release', 'expire', 'revoke'));

-- ------------------------------------------------------------------ 내부 도우미 (ops 스키마, 노출 안 됨)

create or replace function ops.actor(p_actor text)
returns text language plpgsql immutable set search_path = '' as $$
declare
  v text := btrim(p_actor);
begin
  if v is null or v = '' then
    raise exception 'actor_required' using errcode = '22023';
  end if;
  if char_length(v) > 200 then
    raise exception 'invalid_actor' using errcode = '22023';
  end if;
  return v;
end;
$$;

create or replace function ops.log(p_actor text, p_kind text, p_action text, p_target uuid, p_detail jsonb, p_result text default 'ok')
returns bigint language sql set search_path = '' as $$
  insert into ops.audit_log (actor, kind, action, target_user, detail, result)
  values (p_actor, p_kind, p_action, p_target, coalesce(p_detail, '{}'::jsonb), p_result)
  returning id
$$;

create or replace function ops.is_tester(p_user uuid)
returns boolean language sql stable set search_path = '' as $$
  select coalesce((select raw_app_meta_data->>'duru_tester' = 'true' from auth.users where id = p_user), false)
$$;

create or replace function ops.user_exists(p_user uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from auth.users where id = p_user)
$$;

-- 대화 등급(companion.tier_of). 무료인데 티켓 무제한 권한이 있으면 `unlimited_tickets`(20261129가 있을 때만).
create or replace function ops.tier_of(p_user uuid)
returns text language plpgsql stable set search_path = '' as $$
declare
  v_tier text := companion.tier_of(p_user, now());
  v_tickets boolean;
begin
  if v_tier = 'free' and to_regclass('companion.plan_entitlements') is not null then
    execute 'select companion.has_unlimited_tickets($1, now())' into v_tickets using p_user;
    if v_tickets then
      return 'unlimited_tickets';
    end if;
  end if;
  return v_tier;
end;
$$;

-- UserRow(계약 §A). 정지는 지금 걸려 있을 때만 blockedUntil. 없는 사용자면 null.
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
    'blockedUntil', case when ms.blocked_until > now() then ms.blocked_until end
  )
  from auth.users u
  left join public.learner_profiles lp on lp.user_id = u.id
  left join companion.profiles cp on cp.user_id = u.id
  left join companion.credit_wallets w on w.user_id = u.id
  left join companion.moderation_state ms on ms.user_id = u.id
  where u.id = p_user
$$;

-- 목록의 덧붙임: 기간 안 보낸 메시지 · 쓴 엽전(예약 − 해제) · 한 신고 · 지금 스트라이크.
create or replace function ops.user_stats(p_user uuid, p_since timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'messages', (select count(*) from companion.messages m
      where m.user_id = p_user and m.role = 'user' and m.created_at >= p_since),
    'creditsSpent', (select coalesce(-sum(l.delta), 0)::integer from companion.credit_ledger l
      where l.user_id = p_user and l.kind in ('reserve', 'release') and l.created_at >= p_since),
    'reports', (select count(*) from companion.message_reports r where r.user_id = p_user and r.created_at >= p_since),
    'strikes', coalesce((select strikes from companion.moderation_state where user_id = p_user), 0)
  )
$$;

revoke all on all functions in schema ops from public, anon, authenticated;

-- ------------------------------------------------------------------ 읽기 RPC (service_role, 열람 기록)

create or replace function public.ops_find_users(p_actor text, p_query text, p_limit integer default 20)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_query text := btrim(p_query);
  v_pattern text;
  v_items jsonb;
begin
  if v_query is null or char_length(v_query) not between 2 and 200 then
    raise exception 'invalid_query' using errcode = '22023';
  end if;
  if p_limit is null or p_limit not between 1 and 100 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;
  if v_query ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select coalesce(jsonb_agg(ops.user_row(u.id)), '[]'::jsonb) into v_items
    from auth.users u where u.id = v_query::uuid;
  else
    v_pattern := '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    select coalesce(jsonb_agg(ops.user_row(x.id) order by x.created_at desc), '[]'::jsonb) into v_items
    from (
      select u.id, u.created_at from auth.users u
      left join public.learner_profiles lp on lp.user_id = u.id
      where u.email ilike v_pattern or lp.name ilike v_pattern
      order by u.created_at desc
      limit p_limit
    ) x;
  end if;
  perform ops.log(v_actor, 'view', 'find_users', null, jsonb_build_object('query', v_query));
  return jsonb_build_object('items', v_items);
end;
$$;

create or replace function public.ops_list_users(p_actor text, p_kind text, p_days integer default 7, p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_since timestamptz;
  v_items jsonb;
begin
  if p_kind is null or p_kind not in ('recent', 'usage', 'reports') then
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  if p_days is null or p_days not between 1 and 90 then
    raise exception 'invalid_days' using errcode = '22023';
  end if;
  if p_limit is null or p_limit not between 1 and 200 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;
  v_since := now() - make_interval(days => p_days);

  if p_kind = 'recent' then
    select coalesce(jsonb_agg(ops.user_row(x.id) || ops.user_stats(x.id, v_since) order by x.created_at desc), '[]'::jsonb)
    into v_items
    from (select id, created_at from auth.users order by created_at desc limit p_limit) x;
  elsif p_kind = 'usage' then
    select coalesce(jsonb_agg(ops.user_row(x.user_id) || ops.user_stats(x.user_id, v_since)
      order by x.messages desc, x.spent desc, x.user_id), '[]'::jsonb)
    into v_items
    from (
      select a.user_id, sum(a.messages) as messages, sum(a.spent) as spent
      from (
        select m.user_id, count(*) as messages, 0::bigint as spent
        from companion.messages m where m.role = 'user' and m.created_at >= v_since group by m.user_id
        union all
        select l.user_id, 0, -sum(l.delta)
        from companion.credit_ledger l where l.kind in ('reserve', 'release') and l.created_at >= v_since group by l.user_id
      ) a
      group by a.user_id
      having sum(a.messages) > 0 or sum(a.spent) > 0
      order by 2 desc, 3 desc, 1
      limit p_limit
    ) x;
  else
    select coalesce(jsonb_agg(ops.user_row(x.user_id) || ops.user_stats(x.user_id, v_since)
      order by x.score desc, x.user_id), '[]'::jsonb)
    into v_items
    from (
      select a.user_id, sum(a.n) as score
      from (
        select r.user_id, count(*) as n from companion.message_reports r where r.created_at >= v_since group by r.user_id
        union all
        select s.user_id, s.strikes::bigint from companion.moderation_state s where s.strikes > 0
      ) a
      group by a.user_id
      order by 2 desc, 1
      limit p_limit
    ) x;
  end if;

  perform ops.log(v_actor, 'view', 'list_users', null, jsonb_build_object('kind', p_kind, 'days', p_days));
  return jsonb_build_object('items', v_items);
end;
$$;

-- 붙여 넣은 목록 → 사용자. 줄마다 uuid 또는 이메일(대소문자 무시, 정확히 일치). 빈 줄은 건너뛰고 같은 줄 · 같은 사람은 한 번만.
create or replace function public.ops_resolve_users(p_actor text, p_lines text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_found jsonb;
  v_missing jsonb;
begin
  if p_lines is null then
    raise exception 'invalid_lines' using errcode = '22023';
  end if;
  if cardinality(p_lines) > 1000 then
    raise exception 'too_many_users' using errcode = '22023';
  end if;
  with lines as (
    select line, min(ord) as ord
    from (select btrim(l) as line, ord from unnest(p_lines) with ordinality as t(l, ord)) s
    where line <> ''
    group by line
  ), matched as (
    select l.line, l.ord, (
      select u.id from auth.users u
      -- case로 가른다 — and는 평가 순서를 보장하지 않아 이메일 줄에서 uuid 변환이 먼저 돌 수 있다.
      where case when l.line ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then u.id = l.line::uuid else lower(u.email) = lower(l.line) end
      order by u.created_at
      limit 1
    ) as user_id
    from lines l
  )
  select
    coalesce((select jsonb_agg(ops.user_row(f.user_id) order by f.ord)
      from (select user_id, min(ord) as ord from matched where user_id is not null group by user_id) f), '[]'::jsonb),
    coalesce((select jsonb_agg(line order by ord) from matched where user_id is null), '[]'::jsonb)
  into v_found, v_missing;
  perform ops.log(v_actor, 'view', 'resolve_users', null, jsonb_build_object(
    'lines', cardinality(p_lines), 'found', jsonb_array_length(v_found), 'missing', jsonb_array_length(v_missing)));
  return jsonb_build_object('found', v_found, 'missing', v_missing);
end;
$$;

create or replace function public.ops_user_detail(p_actor text, p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_learning jsonb;
  v_plan jsonb;
  v_entitlements jsonb;
  v_store jsonb;
  v_source text;
  v_expires timestamptz;
  v_found boolean := false;
  v_result jsonb;
begin
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;

  -- 학습: 날 수 · 마지막 날 · 연속(마지막 날로 끝나는 줄, 마지막 날이 어제보다 앞이면 0) · 최근 30일 · 진행 스냅숏 크기.
  select jsonb_build_object(
    'days', (select count(*) from public.learning_days where user_id = p_user),
    'lastDay', (select max(day) from public.learning_days where user_id = p_user),
    'streak', coalesce((
      with d as (
        select day, day - (row_number() over (order by day))::integer as grp
        from public.learning_days where user_id = p_user
      )
      select count(*) from d
      where grp = (select grp from d order by day desc limit 1)
        and (select max(day) from d) >= current_date - 1
    ), 0),
    'recentDays', coalesce((
      select jsonb_agg(day order by day desc)
      from (select day from public.learning_days where user_id = p_user order by day desc limit 30) r
    ), '[]'::jsonb),
    'progressBytes', (select octet_length(progress::text) from public.learning_progress where user_id = p_user)
  ) into v_learning;

  -- 등급 · 구독. 20261129 표가 없으면 entitlements · storeEvents는 null.
  if to_regclass('companion.plan_entitlements') is not null then
    execute $q$
      select coalesce(jsonb_agg(jsonb_build_object(
        'entitlement', entitlement, 'productId', product_id, 'store', store, 'environment', environment, 'status', status,
        'willRenew', will_renew, 'periodStartedAt', period_started_at, 'expiresAt', expires_at, 'lastEventAt', last_event_at)
        order by entitlement), '[]'::jsonb)
      from companion.plan_entitlements where user_id = $1
    $q$ into v_entitlements using p_user;
    execute $q$
      select e.expires_at, true from companion.plan_entitlements e join companion.plans p on p.id = e.entitlement
      where e.user_id = $1 and p.chat_rank > 0 and companion.plan_active(e.status, e.expires_at, now())
      order by p.chat_rank desc limit 1
    $q$ into v_expires, v_found using p_user;
    if v_found then
      v_source := 'store';
    end if;
  end if;
  if not coalesce(v_found, false) then
    select source, expires_at into v_source, v_expires from companion.entitlements
    where user_id = p_user and (expires_at is null or expires_at > now());
  end if;
  if to_regclass('companion.store_events') is not null then
    execute $q$
      select coalesce(jsonb_agg(jsonb_build_object(
        'at', coalesce(event_at, received_at), 'type', type, 'productId', product_id, 'store', payload->>'store',
        'environment', environment) order by coalesce(event_at, received_at) desc), '[]'::jsonb)
      from (select * from companion.store_events where user_id = $1 order by coalesce(event_at, received_at) desc limit 20) s
    $q$ into v_store using p_user;
  end if;
  v_plan := jsonb_build_object('tier', ops.tier_of(p_user), 'source', v_source, 'expiresAt', v_expires,
    'entitlements', v_entitlements, 'storeEvents', v_store);

  select jsonb_build_object(
    'user', ops.user_row(p_user),
    'profile', (
      select jsonb_build_object('birthYear', p.birth_year, 'l1', p.l1, 'feedbackMode', p.feedback_mode, 'lastRegion', p.last_region,
        'timezone', p.timezone, 'proactivePref', p.proactive_pref, 'replySuggestions', p.reply_suggestions)
      from companion.profiles p where p.user_id = p_user
    ),
    'learning', v_learning,
    'wallet', jsonb_build_object(
      'sub', coalesce(w.sub_balance, 0),
      'subExpiresAt', w.sub_expires_at,
      'grant', coalesce(w.grant_balance, 0),
      'paid', coalesce(w.paid_balance, 0),
      'ledger', coalesce((
        select jsonb_agg(jsonb_build_object('at', l.created_at, 'delta', l.delta, 'bucket', l.bucket, 'kind', l.kind,
          'reason', l.reason, 'refId', l.ref_id) order by l.created_at desc)
        from (select * from companion.credit_ledger where user_id = p_user order by created_at desc limit 50) l
      ), '[]'::jsonb),
      'holds', (select count(*) from companion.credit_holds where user_id = p_user and status = 'open')
    ),
    'plan', v_plan,
    'moderation', jsonb_build_object(
      'strikes', coalesce(ms.strikes, 0),
      'blockedUntil', ms.blocked_until,
      'events', coalesce((
        select jsonb_agg(jsonb_build_object('at', e.created_at, 'stage', e.layer, 'category', e.category, 'action', e.action)
          order by e.created_at desc)
        from (select * from companion.moderation_events where user_id = p_user order by created_at desc limit 20) e
      ), '[]'::jsonb)
    ),
    -- 신고는 학습자가 자기 대화의 캐릭터 메시지에 한 것이다(신고한 사람 = 이 사용자).
    'reports', jsonb_build_object('received', coalesce((
      select jsonb_agg(jsonb_build_object('at', r.created_at, 'reason', r.reason, 'messageId', r.message_id,
        'characterId', c.character_id, 'text', m.text) order by r.created_at desc)
      from (select * from companion.message_reports where user_id = p_user order by created_at desc limit 20) r
      join companion.messages m on m.id = r.message_id
      left join companion.conversations c on c.id = m.conversation_id
    ), '[]'::jsonb)),
    'feedback', coalesce((
      select jsonb_agg(jsonb_build_object('at', f.created_at, 'kind', f.kind, 'rating', f.rating, 'message', f.message)
        order by f.created_at desc)
      from (select * from public.feedback where user_id = p_user order by created_at desc limit 20) f
    ), '[]'::jsonb),
    'push', jsonb_build_object('devices', coalesce((
      select jsonb_agg(jsonb_build_object('environment', d.environment, 'lastActiveAt', d.last_active_at) order by d.last_active_at desc)
      from public.push_devices d where d.user_id = p_user
    ), '[]'::jsonb)),
    'companion', jsonb_build_object('characters', coalesce((
      select jsonb_agg(jsonb_build_object(
        'characterId', k.character_id,
        'intimacy', r.intimacy,
        'speechLevel', r.speech_level,
        'messages', (select count(*) from companion.messages m join companion.conversations c on c.id = m.conversation_id
          where c.user_id = p_user and c.character_id = k.character_id),
        'lastAt', (select max(c.last_message_at) from companion.conversations c where c.user_id = p_user and c.character_id = k.character_id)
      ) order by k.character_id)
      from (
        select character_id from companion.conversations where user_id = p_user
        union
        select character_id from companion.relationships where user_id = p_user
      ) k
      left join companion.relationships r on r.user_id = p_user and r.character_id = k.character_id
    ), '[]'::jsonb)),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object('id', n.id, 'actor', n.actor, 'body', n.body, 'createdAt', n.created_at)
        order by n.created_at desc)
      from ops.user_notes n where n.user_id = p_user and n.deleted_at is null
    ), '[]'::jsonb),
    'ops', coalesce((
      select jsonb_agg(jsonb_build_object('at', a.at, 'actor', a.actor, 'kind', a.kind, 'action', a.action, 'detail', a.detail,
        'result', a.result) order by a.id desc)
      from (select * from ops.audit_log where target_user = p_user and kind <> 'view' order by id desc limit 50) a
    ), '[]'::jsonb)
  ) into v_result
  from (select 1) one
  left join companion.credit_wallets w on w.user_id = p_user
  left join companion.moderation_state ms on ms.user_id = p_user;

  perform ops.log(v_actor, 'view', 'user_detail', p_user, '{}'::jsonb);
  return v_result;
end;
$$;

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
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'role', m.role, 'origin', m.origin, 'text', m.text, 'status', m.status,
    'creditsSpent', m.credits_spent, 'createdAt', m.created_at) order by m.created_at desc), '[]'::jsonb)
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

create or replace function public.ops_user_memory(p_actor text, p_user uuid, p_character text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_result jsonb;
begin
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if p_character is null or btrim(p_character) = '' then
    raise exception 'invalid_character' using errcode = '22023';
  end if;
  -- 그 캐릭터의 기억과 모든 캐릭터가 읽는 공유 기억(character_id null — shared). 지운 것도 보인다.
  select jsonb_build_object(
    'memories', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'text', content, 'kind', kind, 'shared', character_id is null,
        'updatedAt', coalesce(updated_at, created_at), 'deletedAt', deleted_at, 'deletedReason', deleted_reason)
        order by created_at desc)
      from companion.memories
      where user_id = p_user and (character_id = p_character or character_id is null)
    ), '[]'::jsonb),
    'relationship', (select jsonb_build_object('intimacy', intimacy, 'speechLevel', speech_level)
      from companion.relationships where user_id = p_user and character_id = p_character)
  ) into v_result;
  perform ops.log(v_actor, 'view', 'user_memory', p_user, jsonb_build_object('character', p_character));
  return v_result;
end;
$$;

create or replace function public.ops_user_media(p_actor text, p_user uuid, p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_items jsonb;
begin
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if p_limit is null or p_limit not between 1 and 200 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'kind', x.kind, 'status', x.status, 'characterId', x.character_id,
    'storagePath', x.storage_path, 'createdAt', x.created_at) order by x.created_at desc), '[]'::jsonb)
  into v_items
  from (select * from companion.media where user_id = p_user order by created_at desc limit p_limit) x;
  perform ops.log(v_actor, 'view', 'user_media', p_user, '{}'::jsonb);
  return jsonb_build_object('items', v_items);
end;
$$;

-- 시간순 한 줄들. 원장은 지급 · 회수 · 소멸만(예약 · 확정 · 해제는 턴마다라 빼고), 판정은 allow를 뺀다. 운영 기록은 열람을 뺀다.
create or replace function public.ops_user_timeline(p_actor text, p_user uuid, p_limit integer default 200)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_all jsonb;
  v_store jsonb := '[]'::jsonb;
  v_items jsonb;
begin
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if p_limit is null or p_limit not between 1 and 500 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(e), '[]'::jsonb) into v_all from (
    select jsonb_build_object('at', u.created_at, 'kind', 'signup',
      'summary', '가입' || coalesce(' · ' || (u.raw_app_meta_data->>'provider'), ''),
      'detail', jsonb_build_object('provider', u.raw_app_meta_data->>'provider')) as e
    from auth.users u where u.id = p_user
    union all
    select * from (
      select jsonb_build_object('at', d.day::timestamp at time zone 'UTC', 'kind', 'learning', 'summary', '학습한 날',
        'detail', jsonb_build_object('day', d.day))
      from public.learning_days d where d.user_id = p_user order by d.day desc limit p_limit
    ) s
    union all
    select * from (
      select jsonb_build_object('at', l.created_at, 'kind', 'ledger',
        'summary', '엽전 ' || case when l.delta > 0 then '+' else '' end || l.delta || ' · ' || coalesce(l.reason, l.kind),
        'detail', jsonb_build_object('delta', l.delta, 'bucket', l.bucket, 'kind', l.kind, 'reason', l.reason, 'refId', l.ref_id))
      from companion.credit_ledger l where l.user_id = p_user and l.kind in ('grant', 'revoke', 'expire')
      order by l.created_at desc limit p_limit
    ) s
    union all
    select * from (
      select jsonb_build_object('at', r.created_at, 'kind', 'report', 'summary', '신고 · ' || left(r.reason, 60),
        'detail', jsonb_build_object('messageId', r.message_id, 'reason', r.reason))
      from companion.message_reports r where r.user_id = p_user order by r.created_at desc limit p_limit
    ) s
    union all
    select * from (
      select jsonb_build_object('at', e.created_at, 'kind', 'moderation', 'summary', '판정 ' || e.action || ' · ' || e.category,
        'detail', jsonb_build_object('stage', e.layer, 'category', e.category, 'action', e.action, 'messageId', e.message_id))
      from companion.moderation_events e where e.user_id = p_user and e.action <> 'allow' order by e.created_at desc limit p_limit
    ) s
    union all
    select * from (
      select jsonb_build_object('at', a.at, 'kind', 'ops',
        'summary', '운영 ' || a.action || case when a.result <> 'ok' then ' (' || a.result || ')' else '' end,
        'detail', jsonb_build_object('actor', a.actor, 'action', a.action, 'result', a.result, 'detail', a.detail))
      from ops.audit_log a where a.target_user = p_user and a.kind <> 'view' order by a.id desc limit p_limit
    ) s
    union all
    select * from (
      select jsonb_build_object('at', n.created_at, 'kind', 'note', 'summary', '메모 · ' || left(n.body, 60),
        'detail', jsonb_build_object('id', n.id, 'actor', n.actor))
      from ops.user_notes n where n.user_id = p_user and n.deleted_at is null order by n.created_at desc limit p_limit
    ) s
    union all
    select * from (
      select jsonb_build_object('at', f.created_at, 'kind', 'feedback',
        'summary', '피드백 ' || f.rating || '점' || coalesce(' · ' || left(f.message, 60), ''),
        'detail', jsonb_build_object('kind', f.kind, 'rating', f.rating))
      from public.feedback f where f.user_id = p_user order by f.created_at desc limit p_limit
    ) s
  ) x;

  if to_regclass('companion.store_events') is not null then
    execute $q$
      select coalesce(jsonb_agg(jsonb_build_object('at', coalesce(event_at, received_at), 'kind', 'store',
        'summary', '스토어 ' || type || coalesce(' · ' || product_id, ''),
        'detail', jsonb_build_object('type', type, 'action', action, 'productId', product_id, 'outcome', outcome,
          'environment', environment))), '[]'::jsonb)
      from (select * from companion.store_events where user_id = $1 order by coalesce(event_at, received_at) desc limit $2) s
    $q$ into v_store using p_user, p_limit;
  end if;

  select coalesce(jsonb_agg(e order by (e->>'at')::timestamptz desc), '[]'::jsonb) into v_items
  from (
    select e from jsonb_array_elements(v_all || v_store) e
    order by (e->>'at')::timestamptz desc
    limit p_limit
  ) t;
  perform ops.log(v_actor, 'view', 'user_timeline', p_user, '{}'::jsonb);
  return jsonb_build_object('items', v_items);
end;
$$;

-- ------------------------------------------------------------------ 쓰기 RPC (service_role, 쓰기 기록)

create or replace function public.ops_add_note(p_actor text, p_user uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_body text := btrim(p_body);
  v_id uuid;
begin
  if v_body is null or char_length(v_body) not between 1 and 2000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  insert into ops.user_notes (user_id, actor, body) values (p_user, v_actor, v_body) returning id into v_id;
  perform ops.log(v_actor, 'write', 'add_note', p_user, jsonb_build_object('noteId', v_id));
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.ops_delete_note(p_actor text, p_note uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_user uuid;
begin
  update ops.user_notes set deleted_at = now(), deleted_by = v_actor
  where id = p_note and deleted_at is null
  returning user_id into v_user;
  if v_user is null then
    raise exception 'not_found';
  end if;
  perform ops.log(v_actor, 'write', 'delete_note', v_user, jsonb_build_object('noteId', p_note));
  return jsonb_build_object('ok', true);
end;
$$;

-- 엽전 지급(실제 사용자 가능, 지급만). grant 버킷 · 만료 없음 · 원장 reason `ops_grant`, ref_id `ops-<요청>-<사용자>` —
-- 같은 요청을 다시 보내면 이미 받은 사람은 duplicate로 센다. 없는 사용자는 missing.
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
  v_memo text := nullif(btrim(p_memo), '');
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
  if v_memo is not null and char_length(v_memo) > 200 then
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

-- 시험 계정 잔액을 한 버킷에서 직접 맞춘다. 차이를 원장 grant(+) · revoke(−)로 남긴다(reason `operator`) — 지갑 합 = 원장 합.
create or replace function public.ops_tester_set_balance(p_actor text, p_user uuid, p_bucket text, p_balance integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_before integer;
  v_delta integer;
begin
  if p_bucket is null or p_bucket not in ('sub', 'grant', 'paid') then
    raise exception 'invalid_bucket' using errcode = '22023';
  end if;
  if p_balance is null or p_balance not between 0 and 1000000 then
    raise exception 'invalid_balance' using errcode = '22023';
  end if;
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if not ops.is_tester(p_user) then
    perform ops.log(v_actor, 'write', 'tester_set_balance', p_user,
      jsonb_build_object('bucket', p_bucket, 'balance', p_balance, 'error', 'not_a_tester'), 'refused');
    return jsonb_build_object('ok', false, 'error', 'not_a_tester');
  end if;

  perform companion.lock_wallet(p_user);
  execute format('select %I from companion.credit_wallets where user_id = $1', p_bucket || '_balance') into v_before using p_user;
  v_delta := p_balance - v_before;
  if v_delta <> 0 then
    execute format('update companion.credit_wallets set %I = $1, updated_at = now() where user_id = $2', p_bucket || '_balance')
      using p_balance, p_user;
    insert into companion.credit_ledger (user_id, delta, bucket, kind, reason)
    values (p_user, v_delta, p_bucket, case when v_delta > 0 then 'grant' else 'revoke' end, 'operator');
  end if;
  perform ops.log(v_actor, 'write', 'tester_set_balance', p_user,
    jsonb_build_object('bucket', p_bucket, 'before', v_before, 'after', p_balance));
  return jsonb_build_object('ok', true, 'before', v_before, 'after', p_balance);
end;
$$;

-- 시험 계정 등급(옛 `companion.entitlements`, source `ops_admin`). p_tier null · 'free'면 지운다.
create or replace function public.ops_tester_set_tier(p_actor text, p_user uuid, p_tier text, p_expires_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_tier text := nullif(nullif(btrim(p_tier), ''), 'free');
begin
  if v_tier is not null and v_tier not in ('chat_plus', 'premium') then
    raise exception 'invalid_tier' using errcode = '22023';
  end if;
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if not ops.is_tester(p_user) then
    perform ops.log(v_actor, 'write', 'tester_set_tier', p_user,
      jsonb_build_object('tier', v_tier, 'expiresAt', p_expires_at, 'error', 'not_a_tester'), 'refused');
    return jsonb_build_object('ok', false, 'error', 'not_a_tester');
  end if;
  begin
    perform public.companion_set_entitlement(p_user, v_tier, p_expires_at, 'ops_admin');
  exception when check_violation then
    -- 20261129 전에는 옛 등급 표가 premium만 받는다.
    raise exception 'invalid_tier' using errcode = '22023';
  end;
  perform ops.log(v_actor, 'write', 'tester_set_tier', p_user, jsonb_build_object('tier', v_tier, 'expiresAt', p_expires_at));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.ops_tester_reset(p_actor text, p_user uuid, p_character text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
begin
  if p_character is null or btrim(p_character) = '' then
    raise exception 'invalid_character' using errcode = '22023';
  end if;
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if not ops.is_tester(p_user) then
    perform ops.log(v_actor, 'write', 'tester_reset', p_user,
      jsonb_build_object('character', p_character, 'error', 'not_a_tester'), 'refused');
    return jsonb_build_object('ok', false, 'error', 'not_a_tester');
  end if;
  perform public.companion_operator_reset(p_user, p_character);
  perform ops.log(v_actor, 'write', 'tester_reset', p_user, jsonb_build_object('character', p_character));
  return jsonb_build_object('ok', true);
end;
$$;

-- 컴패니언 이용 정지 · 해제(실제 사용자 가능). p_until null이면 해제. 스트라이크 초기화는 창(window)도 비운다.
create or replace function public.ops_set_suspension(
  p_actor text, p_user uuid, p_until timestamptz, p_reset_strikes boolean, p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_reason text := btrim(p_reason);
  v_before jsonb;
  v_after jsonb;
begin
  if v_reason is null or char_length(v_reason) not between 1 and 200 then
    raise exception 'invalid_reason' using errcode = '22023';
  end if;
  if p_until is not null and p_until <= now() then
    raise exception 'invalid_until' using errcode = '22023';
  end if;
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  select jsonb_build_object('strikes', coalesce((select strikes from companion.moderation_state where user_id = p_user), 0),
    'blockedUntil', (select blocked_until from companion.moderation_state where user_id = p_user)) into v_before;
  insert into companion.moderation_state as t (user_id, strikes, window_started_at, blocked_until)
  values (p_user, 0, null, p_until)
  on conflict (user_id) do update set
    blocked_until = p_until,
    strikes = case when coalesce(p_reset_strikes, false) then 0 else t.strikes end,
    window_started_at = case when coalesce(p_reset_strikes, false) then null else t.window_started_at end
  returning jsonb_build_object('strikes', strikes, 'blockedUntil', blocked_until) into v_after;
  perform ops.log(v_actor, 'write', 'set_suspension', p_user, jsonb_build_object(
    'until', p_until, 'resetStrikes', coalesce(p_reset_strikes, false), 'reason', v_reason, 'before', v_before, 'after', v_after));
  return jsonb_build_object('ok', true, 'before', v_before, 'after', v_after);
end;
$$;

-- 설정 보기(기록하지 않음).
create or replace function public.ops_settings(p_actor text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
begin
  return (select jsonb_build_object('testersOnly', testers_only) from companion.settings);
end;
$$;

create or replace function public.ops_set_testers_only(p_actor text, p_value boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_before boolean;
begin
  if p_value is null then
    raise exception 'invalid_value' using errcode = '22023';
  end if;
  select testers_only into v_before from companion.settings for update;
  update companion.settings set testers_only = p_value;
  perform ops.log(v_actor, 'write', 'set_testers_only', null, jsonb_build_object('before', v_before, 'after', p_value));
  return jsonb_build_object('ok', true, 'before', v_before, 'after', p_value);
end;
$$;

-- 푸시 대상 · 기기 수. 기기가 있는 사람만 센다. all은 목록을 내지 않고(userIds null), inactive는 모든 기기의
-- last_active_at이 N일보다 오래된 사람(1000명을 넘으면 too_many_users). 계산일 뿐이라 기록하지 않는다.
create or replace function public.ops_push_audience(p_actor text, p_kind text, p_users uuid[] default null, p_days integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_ids uuid[];
  v_users integer;
  v_devices integer;
begin
  if p_kind is null or p_kind not in ('all', 'users', 'inactive') then
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  if p_kind = 'all' then
    select count(distinct user_id), count(*) into v_users, v_devices from public.push_devices;
    return jsonb_build_object('users', v_users, 'devices', v_devices, 'userIds', null);
  end if;
  if p_kind = 'users' then
    if p_users is null or cardinality(p_users) = 0 then
      raise exception 'invalid_users' using errcode = '22023';
    end if;
    if cardinality(p_users) > 1000 then
      raise exception 'too_many_users' using errcode = '22023';
    end if;
    select array_agg(distinct user_id) into v_ids from public.push_devices where user_id = any (p_users);
  else
    if p_days is null or p_days not between 1 and 365 then
      raise exception 'invalid_days' using errcode = '22023';
    end if;
    select array_agg(user_id) into v_ids from (
      select user_id from public.push_devices group by user_id
      having max(last_active_at) < now() - make_interval(days => p_days)
    ) s;
    if cardinality(v_ids) > 1000 then
      raise exception 'too_many_users' using errcode = '22023';
    end if;
  end if;
  v_ids := coalesce(v_ids, '{}');
  select count(*) into v_devices from public.push_devices where user_id = any (v_ids);
  return jsonb_build_object('users', cardinality(v_ids), 'devices', v_devices, 'userIds', to_jsonb(v_ids));
end;
$$;

create or replace function public.ops_push_begin(
  p_actor text, p_audience jsonb, p_user_count integer, p_title text, p_body text, p_target jsonb, p_test boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_id uuid;
  v_target_user uuid;
begin
  if p_audience is null or jsonb_typeof(p_audience) <> 'object' then
    raise exception 'invalid_audience' using errcode = '22023';
  end if;
  if p_user_count is null or p_user_count < 0 then
    raise exception 'invalid_user_count' using errcode = '22023';
  end if;
  if p_title is null or char_length(p_title) not between 1 and 100 then
    raise exception 'invalid_title' using errcode = '22023';
  end if;
  if p_body is null or char_length(p_body) not between 1 and 500 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;
  if p_target is not null and jsonb_typeof(p_target) <> 'object' then
    raise exception 'invalid_target' using errcode = '22023';
  end if;
  if p_test is null then
    raise exception 'invalid_test' using errcode = '22023';
  end if;
  insert into ops.push_sends (actor, audience, user_count, title, body, target, test)
  values (v_actor, p_audience, p_user_count, p_title, p_body, p_target, p_test)
  returning id into v_id;
  -- 한 사람에게 보내면(시험 발송) 그 사람의 운영 기록에 남는다.
  if jsonb_typeof(p_audience->'userIds') = 'array' and jsonb_array_length(p_audience->'userIds') = 1
    and (p_audience->'userIds'->>0) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_target_user := (p_audience->'userIds'->>0)::uuid;
  end if;
  perform ops.log(v_actor, 'write', 'push_begin', v_target_user, jsonb_build_object(
    'id', v_id, 'test', p_test, 'userCount', p_user_count, 'title', p_title, 'audience', p_audience - 'userIds'));
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.ops_push_finish(p_actor text, p_id uuid, p_status text, p_summary jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_row ops.push_sends;
begin
  if p_status is null or p_status not in ('sent', 'failed') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  select * into v_row from ops.push_sends where id = p_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if v_row.status <> 'sending' then
    perform ops.log(v_actor, 'write', 'push_finish', null,
      jsonb_build_object('id', p_id, 'status', p_status, 'error', 'already_finished'), 'refused');
    return jsonb_build_object('ok', false, 'error', 'already_finished');
  end if;
  update ops.push_sends set status = p_status, summary = p_summary, finished_at = now() where id = p_id;
  perform ops.log(v_actor, 'write', 'push_finish', null, jsonb_build_object('id', p_id, 'status', p_status, 'summary', p_summary),
    case when p_status = 'sent' then 'ok' else 'error' end);
  return jsonb_build_object('ok', true);
end;
$$;

-- 서버 쪽 사건(내보내기 등)을 남긴다.
create or replace function public.ops_log(p_actor text, p_kind text, p_action text, p_target uuid, p_detail jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
begin
  if p_kind is null or p_kind not in ('view', 'write', 'export') then
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  if p_action is null or char_length(btrim(p_action)) not between 1 and 100 then
    raise exception 'invalid_action' using errcode = '22023';
  end if;
  if p_detail is not null and jsonb_typeof(p_detail) <> 'object' then
    raise exception 'invalid_detail' using errcode = '22023';
  end if;
  perform ops.log(v_actor, p_kind, btrim(p_action), p_target, p_detail);
  return jsonb_build_object('ok', true);
end;
$$;

-- 감사 기록 보기(기록하지 않음). id 내림차순, p_before(id)보다 앞의 것.
create or replace function public.ops_audit(
  p_actor text, p_kind text default null, p_target uuid default null, p_before bigint default null, p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
begin
  if p_kind is not null and p_kind not in ('view', 'write', 'export') then
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  if p_limit is null or p_limit not between 1 and 500 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object('id', a.id, 'at', a.at, 'actor', a.actor, 'kind', a.kind, 'action', a.action,
      'targetUser', a.target_user, 'detail', a.detail, 'result', a.result) order by a.id desc)
    from (
      select * from ops.audit_log
      where (p_kind is null or kind = p_kind)
        and (p_target is null or target_user = p_target)
        and (p_before is null or id < p_before)
      order by id desc
      limit p_limit
    ) a
  ), '[]'::jsonb));
end;
$$;

-- ------------------------------------------------------------------ 기존 RPC의 시험 계정 확인 (Q9)

-- 20261112 판 + reason `ops_grant`(운영 지급) · reason `operator`는 시험 계정만.
create or replace function public.companion_grant_credits(
  p_user_id uuid, p_bucket text, p_amount integer, p_reason text, p_ref_id text, p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_bucket not in ('sub', 'grant', 'paid') or p_amount is null or p_amount <= 0
    or p_reason not in ('subscription', 'purchase', 'signup', 'operator', 'ops_grant') then
    raise exception 'invalid grant' using errcode = '22023';
  end if;
  if p_reason = 'operator' and not ops.is_tester(p_user_id) then
    raise exception 'not_a_tester' using errcode = 'P0002';
  end if;
  if p_ref_id is not null and exists (
    select 1 from companion.credit_ledger where kind = 'grant' and reason = p_reason and ref_id = p_ref_id
  ) then
    return false;
  end if;
  perform companion.lock_wallet(p_user_id);
  execute format('update companion.credit_wallets set %I = %I + $1, updated_at = now() where user_id = $2',
    p_bucket || '_balance', p_bucket || '_balance') using p_amount, p_user_id;
  if p_bucket = 'sub' then
    update companion.credit_wallets set sub_expires_at = p_expires_at where user_id = p_user_id;
  end if;
  insert into companion.credit_ledger (user_id, delta, bucket, kind, reason, ref_id)
  values (p_user_id, p_amount, p_bucket, 'grant', p_reason, p_ref_id);
  return true;
end;
$$;

-- 20261112 판 + 시험 계정만(부르는 곳은 플레이그라운드 · ops_tester_set_tier뿐 — 구독 등급은 plan_entitlements).
create or replace function public.companion_set_entitlement(p_user_id uuid, p_tier text, p_expires_at timestamptz, p_source text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not ops.is_tester(p_user_id) then
    raise exception 'not_a_tester' using errcode = 'P0002';
  end if;
  if p_tier is null then
    delete from companion.entitlements where user_id = p_user_id;
    return;
  end if;
  insert into companion.entitlements (user_id, tier, expires_at, source, updated_at)
  values (p_user_id, p_tier, p_expires_at, p_source, now())
  on conflict (user_id) do update set tier = excluded.tier, expires_at = excluded.expires_at, source = excluded.source, updated_at = now();
end;
$$;

-- ------------------------------------------------------------------ 권한

revoke all on function public.ops_find_users(text, text, integer) from public, anon, authenticated;
revoke all on function public.ops_list_users(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.ops_resolve_users(text, text[]) from public, anon, authenticated;
revoke all on function public.ops_user_detail(text, uuid) from public, anon, authenticated;
revoke all on function public.ops_user_conversation(text, uuid, text, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.ops_user_memory(text, uuid, text) from public, anon, authenticated;
revoke all on function public.ops_user_media(text, uuid, integer) from public, anon, authenticated;
revoke all on function public.ops_user_timeline(text, uuid, integer) from public, anon, authenticated;
revoke all on function public.ops_add_note(text, uuid, text) from public, anon, authenticated;
revoke all on function public.ops_delete_note(text, uuid) from public, anon, authenticated;
revoke all on function public.ops_grant_credits(text, uuid[], integer, text, text, uuid) from public, anon, authenticated;
revoke all on function public.ops_tester_set_balance(text, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.ops_tester_set_tier(text, uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.ops_tester_reset(text, uuid, text) from public, anon, authenticated;
revoke all on function public.ops_set_suspension(text, uuid, timestamptz, boolean, text) from public, anon, authenticated;
revoke all on function public.ops_settings(text) from public, anon, authenticated;
revoke all on function public.ops_set_testers_only(text, boolean) from public, anon, authenticated;
revoke all on function public.ops_push_audience(text, text, uuid[], integer) from public, anon, authenticated;
revoke all on function public.ops_push_begin(text, jsonb, integer, text, text, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.ops_push_finish(text, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.ops_log(text, text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.ops_audit(text, text, uuid, bigint, integer) from public, anon, authenticated;
grant execute on function public.ops_find_users(text, text, integer) to service_role;
grant execute on function public.ops_list_users(text, text, integer, integer) to service_role;
grant execute on function public.ops_resolve_users(text, text[]) to service_role;
grant execute on function public.ops_user_detail(text, uuid) to service_role;
grant execute on function public.ops_user_conversation(text, uuid, text, timestamptz, integer) to service_role;
grant execute on function public.ops_user_memory(text, uuid, text) to service_role;
grant execute on function public.ops_user_media(text, uuid, integer) to service_role;
grant execute on function public.ops_user_timeline(text, uuid, integer) to service_role;
grant execute on function public.ops_add_note(text, uuid, text) to service_role;
grant execute on function public.ops_delete_note(text, uuid) to service_role;
grant execute on function public.ops_grant_credits(text, uuid[], integer, text, text, uuid) to service_role;
grant execute on function public.ops_tester_set_balance(text, uuid, text, integer) to service_role;
grant execute on function public.ops_tester_set_tier(text, uuid, text, timestamptz) to service_role;
grant execute on function public.ops_tester_reset(text, uuid, text) to service_role;
grant execute on function public.ops_set_suspension(text, uuid, timestamptz, boolean, text) to service_role;
grant execute on function public.ops_settings(text) to service_role;
grant execute on function public.ops_set_testers_only(text, boolean) to service_role;
grant execute on function public.ops_push_audience(text, text, uuid[], integer) to service_role;
grant execute on function public.ops_push_begin(text, jsonb, integer, text, text, jsonb, boolean) to service_role;
grant execute on function public.ops_push_finish(text, uuid, text, jsonb) to service_role;
grant execute on function public.ops_log(text, text, text, uuid, jsonb) to service_role;
grant execute on function public.ops_audit(text, text, uuid, bigint, integer) to service_role;
