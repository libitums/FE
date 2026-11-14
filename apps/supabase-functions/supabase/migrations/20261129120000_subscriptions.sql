-- 구독 · 엽전 팩 1단계(2026-11-14 사용자 결정, ADR-0144) — 스토어 결제 · 영수증 검증은 RevenueCat, 등급 · 엽전의 정본은 이 DB.
--
-- 1. 혜택 표 `companion.plans` — 요금제마다 하루 무료 메시지 · 공정 사용 상한 · 매달 엽전 · 티켓 무제한. **운영에서 이 행을 고치면
--    앱 업데이트 없이 바뀐다**(관문 · 차감 · 앱 화면이 모두 이 표를 읽는다). 상품 → 요금제 매핑은 `companion.store_products`.
-- 2. 권한 `companion.plan_entitlements` — RevenueCat 웹훅(`revenuecat-webhook` → `companion_apply_store_event`)만 쓴다.
--    대화 등급 = 활성 권한 중 chat_rank가 가장 높은 것(premium > chat_plus > 옛 entitlements > free). 학습 권한(티켓 무제한)은 따로.
-- 3. 관문 · 시작은 옛 함수를 `companion.turn_gate_base` · `companion.begin_turn_base`로 옮기고 같은 이름의 얇은 겉을 씌운다 —
--    무료 사용자 · 옛 entitlements 등급은 base 그대로(지금과 같음), 구독으로 산 등급만 혜택 표대로(무료 턴 · 공정 사용 상한).
--    무료 등급의 하루 3통은 지금 앱(기기) 쪽 셈이라 서버는 값만 내준다(`companion_plans().free`) — 서버로 옮기는 것은 후속.
-- 4. 엽전: 구독의 매달 엽전은 grant 버킷(`grant_once`, 열쇠 `<uid>:<권한>:<기간 시작>:<달>`), 엽전 팩은 paid 버킷
--    (`companion_grant_credits`, 열쇠 `rc:<거래 id>`). 팩 환불은 잔액이 되면 회수(원장 `revoke`), 모자라면 기록만.

-- ------------------------------------------------------------------ 표

create table companion.plans (
  id text primary key check (id in ('free', 'unlimited_tickets', 'chat_plus', 'premium')),
  sort_order integer not null default 0,
  chat_rank integer check (chat_rank is null or chat_rank between 0 and 10),
  daily_free_messages integer check (daily_free_messages is null or daily_free_messages >= 0),
  daily_message_cap integer check (daily_message_cap is null or daily_message_cap > 0),
  monthly_coins integer not null default 0 check (monthly_coins between 0 and 100000),
  unlimited_tickets boolean not null default false,
  all_characters boolean not null default false,
  highlight boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into companion.plans
  (id, sort_order, chat_rank, daily_free_messages, daily_message_cap, monthly_coins, unlimited_tickets, all_characters, highlight)
values
  ('free', 0, 0, 3, null, 0, false, false, false),
  ('unlimited_tickets', 1, null, null, null, 0, true, false, false),
  ('chat_plus', 2, 1, 30, null, 300, false, true, false),
  ('premium', 3, 2, null, 200, 800, true, true, true);

create table companion.store_products (
  product_id text primary key check (char_length(product_id) between 1 and 200),
  kind text not null check (kind in ('subscription', 'coins')),
  plan_id text references companion.plans (id),
  period text check (period in ('monthly', 'yearly')),
  coins integer not null default 0 check (coins >= 0),
  bonus_coins integer not null default 0 check (bonus_coins >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  check ((kind = 'subscription' and plan_id is not null and plan_id <> 'free' and period is not null)
    or (kind = 'coins' and plan_id is null and coins + bonus_coins > 0))
);

insert into companion.store_products (product_id, kind, plan_id, period, coins, bonus_coins, sort_order) values
  ('duru.tickets.monthly.v1', 'subscription', 'unlimited_tickets', 'monthly', 0, 0, 1),
  ('duru.tickets.yearly.v1', 'subscription', 'unlimited_tickets', 'yearly', 0, 0, 2),
  ('duru.chatplus.monthly.v1', 'subscription', 'chat_plus', 'monthly', 0, 0, 3),
  ('duru.chatplus.yearly.v1', 'subscription', 'chat_plus', 'yearly', 0, 0, 4),
  ('duru.premium.monthly.v1', 'subscription', 'premium', 'monthly', 0, 0, 5),
  ('duru.premium.yearly.v1', 'subscription', 'premium', 'yearly', 0, 0, 6),
  ('duru.coins.500.v1', 'coins', null, null, 500, 0, 7),
  ('duru.coins.1200.v1', 'coins', null, null, 1000, 200, 8),
  ('duru.coins.3000.v1', 'coins', null, null, 2000, 1000, 9);

create table companion.plan_entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  entitlement text not null references companion.plans (id) check (entitlement <> 'free'),
  product_id text not null,
  store text,
  environment text not null default 'production' check (environment in ('production', 'sandbox')),
  status text not null check (status in ('active', 'cancelled', 'billing_issue', 'expired', 'revoked')),
  will_renew boolean not null default true,
  period_started_at timestamptz,
  expires_at timestamptz,
  pending_product_id text,
  source_event_id text not null,
  last_event_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement)
);

create table companion.store_events (
  id text primary key check (char_length(id) between 1 and 200),
  type text not null,
  action text not null,
  app_user_id text,
  user_id uuid references auth.users (id) on delete set null,
  environment text not null,
  product_id text,
  event_at timestamptz,
  outcome text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

alter table companion.plans enable row level security;
alter table companion.store_products enable row level security;
alter table companion.plan_entitlements enable row level security;
alter table companion.store_events enable row level security;
revoke all on table companion.plans, companion.store_products, companion.plan_entitlements, companion.store_events
  from public, anon, authenticated;
grant select, insert, update, delete on table companion.plans, companion.store_products, companion.plan_entitlements,
  companion.store_events to service_role;

-- 옛 표에 더하는 것: 옛 등급 표의 chat_plus · 원장의 회수(revoke) · 요금제 무료 턴 표시.
alter table companion.entitlements drop constraint entitlements_tier_check;
alter table companion.entitlements add constraint entitlements_tier_check check (tier in ('free', 'chat_plus', 'premium'));
alter table companion.credit_ledger drop constraint credit_ledger_kind_check;
alter table companion.credit_ledger add constraint credit_ledger_kind_check
  check (kind in ('grant', 'reserve', 'settle', 'release', 'expire', 'revoke'));
alter table companion.credit_holds add column plan_free boolean not null default false;

-- ------------------------------------------------------------------ 등급 · 권한

-- 활성 권한: 끊기지(expired · revoked) 않았고 만료 전. 취소(cancelled) · 결제 문제(billing_issue)는 만료까지 산다.
create function companion.plan_active(p_status text, p_expires_at timestamptz, p_now timestamptz)
returns boolean language sql immutable as $$
  select p_status not in ('expired', 'revoked') and (p_expires_at is null or p_expires_at > p_now)
$$;
revoke all on function companion.plan_active(text, timestamptz, timestamptz) from public;

-- 구독으로 산 대화 등급(활성 권한 중 chat_rank가 가장 높은 것), 없으면 null. 혜택 표는 이 등급에만 붙는다 —
-- 옛 `companion.entitlements`(플레이그라운드 · 운영자가 넣은 premium)는 지금처럼 등급 이름만 주고 차감 규칙은 그대로다.
create function companion.plan_tier_of(p_user_id uuid, p_now timestamptz)
returns text language sql stable as $$
  select p.id from companion.plan_entitlements e
  join companion.plans p on p.id = e.entitlement
  where e.user_id = p_user_id and p.chat_rank > 0 and companion.plan_active(e.status, e.expires_at, p_now)
  order by p.chat_rank desc limit 1
$$;
revoke all on function companion.plan_tier_of(uuid, timestamptz) from public;

create or replace function companion.tier_of(p_user_id uuid, p_now timestamptz)
returns text language sql stable as $$
  select coalesce(
    companion.plan_tier_of(p_user_id, p_now),
    (
      select tier from companion.entitlements
      where user_id = p_user_id and (expires_at is null or expires_at > p_now)
    ),
    'free'
  )
$$;

create function companion.has_unlimited_tickets(p_user_id uuid, p_now timestamptz)
returns boolean language sql stable as $$
  select exists (
    select 1 from companion.plan_entitlements e
    join companion.plans p on p.id = e.entitlement
    where e.user_id = p_user_id and p.unlimited_tickets and companion.plan_active(e.status, e.expires_at, p_now)
  )
$$;
revoke all on function companion.has_unlimited_tickets(uuid, timestamptz) from public;

-- 그날(UTC) 턴 수 — 요금제 무료로 연 것 · 전부(해제된 예약은 빼고).
create function companion.plan_turns_today(p_user_id uuid, p_now timestamptz, out free_used integer, out total integer)
language sql stable as $$
  select (count(*) filter (where plan_free))::integer, count(*)::integer
  from companion.credit_holds
  where user_id = p_user_id and status <> 'released'
    and created_at >= ((p_now at time zone 'utc')::date)::timestamp at time zone 'utc'
    and created_at < (((p_now at time zone 'utc')::date + 1)::timestamp at time zone 'utc')
$$;
revoke all on function companion.plan_turns_today(uuid, timestamptz) from public;

-- ------------------------------------------------------------------ 관문 · 시작: 옛 함수 위에 얇은 겉

alter function public.companion_turn_gate(uuid, text, uuid, timestamptz, text) rename to turn_gate_base;
alter function public.turn_gate_base(uuid, text, uuid, timestamptz, text) set schema companion;
revoke all on function companion.turn_gate_base(uuid, text, uuid, timestamptz, text) from public, anon, authenticated, service_role;

create function public.companion_turn_gate(
  p_user_id uuid,
  p_character_id text,
  p_client_message_id uuid,
  p_now timestamptz,
  p_region text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_gate jsonb := companion.turn_gate_base(p_user_id, p_character_id, p_client_message_id, p_now, p_region);
  v_tier text := companion.plan_tier_of(p_user_id, p_now);
  v_plan companion.plans;
  v_turns record;
  v_balance integer;
  v_cost integer;
begin
  if v_gate->>'result' <> 'ok' or v_tier is null then
    return v_gate;
  end if;
  select * into v_plan from companion.plans where id = v_tier;
  if not found then
    return v_gate;
  end if;
  select * into v_turns from companion.plan_turns_today(p_user_id, p_now);
  if v_plan.daily_message_cap is not null and v_turns.total >= v_plan.daily_message_cap then
    return jsonb_build_object('result', 'usage_time_limit', 'detail', jsonb_build_object('limit', 'fair_use',
      'resetsAt', to_char(((p_now at time zone 'utc')::date + 1)::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')));
  end if;
  if v_plan.daily_free_messages is not null and v_turns.free_used >= v_plan.daily_free_messages then
    select message_cost into v_cost from companion.settings;
    select coalesce(sum(sub_balance + grant_balance + paid_balance), 0) into v_balance
    from companion.credit_wallets where user_id = p_user_id;
    if v_balance < v_cost then
      return jsonb_build_object('result', 'insufficient_credits', 'detail', jsonb_build_object(
        'required', v_cost, 'balance', v_balance));
    end if;
  end if;
  return v_gate;
end;
$$;

alter function public.companion_begin_turn(uuid, text, uuid, text, text, integer, text, timestamptz) rename to begin_turn_base;
alter function public.begin_turn_base(uuid, text, uuid, text, text, integer, text, timestamptz) set schema companion;
revoke all on function companion.begin_turn_base(uuid, text, uuid, text, text, integer, text, timestamptz)
  from public, anon, authenticated, service_role;

-- 구독 등급이고 오늘 요금제 무료가 남았으면 금액 0 예약을 먼저 둔다 — base는 같은 메시지의 예약이 있으면 그대로 쓴다(멱등 규칙).
-- base가 예외로 끝나면 이 예약도 함께 되돌아간다(한 트랜잭션).
create function public.companion_begin_turn(
  p_user_id uuid,
  p_character_id text,
  p_client_message_id uuid,
  p_text text,
  p_input_mode text,
  p_history_limit integer,
  p_region text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tier text := companion.plan_tier_of(p_user_id, p_now);
  v_plan companion.plans;
  v_turns record;
begin
  if v_tier is not null then
    select * into v_plan from companion.plans where id = v_tier;
    if found then
      perform companion.lock_wallet(p_user_id);
      select * into v_turns from companion.plan_turns_today(p_user_id, p_now);
      if (v_plan.daily_free_messages is null or v_turns.free_used < v_plan.daily_free_messages)
        and not exists (
          select 1 from companion.credit_holds
          where user_id = p_user_id and client_message_id = p_client_message_id and status <> 'released'
        ) then
        insert into companion.credit_holds (user_id, client_message_id, character_id, amount, buckets, trial, plan_free)
        values (p_user_id, p_client_message_id, p_character_id, 0, '{}'::jsonb, false, true);
      end if;
    end if;
  end if;
  return companion.begin_turn_base(
    p_user_id, p_character_id, p_client_message_id, p_text, p_input_mode, p_history_limit, p_region, p_now);
end;
$$;

revoke all on function public.companion_turn_gate(uuid, text, uuid, timestamptz, text) from public, anon, authenticated;
revoke all on function public.companion_begin_turn(uuid, text, uuid, text, text, integer, text, timestamptz) from public, anon, authenticated;
grant execute on function public.companion_turn_gate(uuid, text, uuid, timestamptz, text) to service_role;
grant execute on function public.companion_begin_turn(uuid, text, uuid, text, text, integer, text, timestamptz) to service_role;

-- ------------------------------------------------------------------ 엽전

-- 활성 권한마다 기간 시작부터 지금까지 지난 달(0 ~ k)의 매달 엽전을 한 번씩. 이번에 더한 합.
create function companion.grant_plan_coins(p_user_id uuid, p_now timestamptz)
returns integer language plpgsql as $$
declare
  v_row record;
  v_months integer;
  v_month integer;
  v_total integer := 0;
begin
  for v_row in
    select e.entitlement, e.period_started_at, p.monthly_coins
    from companion.plan_entitlements e join companion.plans p on p.id = e.entitlement
    where e.user_id = p_user_id and p.monthly_coins > 0 and e.period_started_at is not null
      and e.period_started_at <= p_now and companion.plan_active(e.status, e.expires_at, p_now)
  loop
    v_months := (extract(year from age(p_now, v_row.period_started_at)) * 12
      + extract(month from age(p_now, v_row.period_started_at)))::integer;
    for v_month in 0 .. least(v_months, 120) loop
      if companion.grant_once(p_user_id, v_row.monthly_coins, 'plan_coins', p_user_id::text || ':' || v_row.entitlement
        || ':' || floor(extract(epoch from v_row.period_started_at))::bigint::text || ':' || v_month::text) then
        v_total := v_total + v_row.monthly_coins;
      end if;
    end loop;
  end loop;
  return v_total;
end;
$$;
revoke all on function companion.grant_plan_coins(uuid, timestamptz) from public;

-- 회수(팩 환불). 잔액 합이 모자라면 아무것도 하지 않고 거짓. paid → grant → sub 순서로 뺀다.
create function companion.revoke_coins(p_user_id uuid, p_amount integer, p_ref_id text)
returns boolean language plpgsql as $$
declare
  v_wallet companion.credit_wallets := companion.lock_wallet(p_user_id);
  v_left integer := p_amount;
  v_bucket text;
  v_have integer;
  v_take integer;
begin
  if p_amount <= 0 or v_wallet.paid_balance + v_wallet.grant_balance + v_wallet.sub_balance < p_amount then
    return false;
  end if;
  foreach v_bucket in array array['paid', 'grant', 'sub'] loop
    exit when v_left = 0;
    execute format('select %I from companion.credit_wallets where user_id = $1', v_bucket || '_balance') into v_have using p_user_id;
    v_take := least(v_have, v_left);
    if v_take > 0 then
      execute format('update companion.credit_wallets set %I = %I - $1, updated_at = now() where user_id = $2',
        v_bucket || '_balance', v_bucket || '_balance') using v_take, p_user_id;
      insert into companion.credit_ledger (user_id, delta, bucket, kind, reason, ref_id)
      values (p_user_id, -v_take, v_bucket, 'revoke', 'refund', p_ref_id);
      v_left := v_left - v_take;
    end if;
  end loop;
  return true;
end;
$$;
revoke all on function companion.revoke_coins(uuid, integer, text) from public;

-- ------------------------------------------------------------------ RevenueCat 이벤트 적용 (service_role, 웹훅만)

create function public.companion_apply_store_event(p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := p_event->>'id';
  v_action text := p_event->>'action';
  v_event_at timestamptz := coalesce((p_event->>'eventAt')::timestamptz, now());
  v_expires timestamptz := (p_event->>'expiresAt')::timestamptz;
  v_user uuid;
  v_candidate text;
  v_product companion.store_products;
  v_row companion.plan_entitlements;
  v_outcome text;
  v_to uuid;
  v_ref text;
begin
  if v_id is null or v_action is null then
    raise exception 'invalid store event' using errcode = '22023';
  end if;
  insert into companion.store_events (id, type, action, app_user_id, environment, product_id, event_at, payload)
  values (v_id, coalesce(p_event->>'type', ''), v_action, p_event->'userIds'->>0,
    coalesce(p_event->>'environment', 'production'), p_event->>'productId', v_event_at, p_event)
  on conflict (id) do nothing;
  if not found then
    return jsonb_build_object('outcome', 'duplicate', 'userId', null);
  end if;

  for v_candidate in select jsonb_array_elements_text(coalesce(p_event->'userIds', '[]'::jsonb)) loop
    if v_candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select id into v_user from auth.users where id = v_candidate::uuid;
      exit when v_user is not null;
    end if;
  end loop;

  if v_action = 'record' then
    v_outcome := 'recorded';
  elsif v_action = 'transfer' then
    for v_candidate in select jsonb_array_elements_text(coalesce(p_event->'transferredTo', '[]'::jsonb)) loop
      if v_candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        select id into v_to from auth.users where id = v_candidate::uuid;
        exit when v_to is not null;
      end if;
    end loop;
    if v_to is null then
      v_outcome := 'unknown_user';
    else
      for v_row in
        select * from companion.plan_entitlements
        where user_id::text in (select jsonb_array_elements_text(coalesce(p_event->'transferredFrom', '[]'::jsonb)))
          and user_id <> v_to
      loop
        insert into companion.plan_entitlements as t (user_id, entitlement, product_id, store, environment, status, will_renew,
          period_started_at, expires_at, pending_product_id, source_event_id, last_event_at)
        values (v_to, v_row.entitlement, v_row.product_id, v_row.store, v_row.environment, v_row.status, v_row.will_renew,
          v_row.period_started_at, v_row.expires_at, v_row.pending_product_id, v_id, greatest(v_row.last_event_at, v_event_at))
        on conflict (user_id, entitlement) do update set
          product_id = excluded.product_id, store = excluded.store, status = excluded.status, will_renew = excluded.will_renew,
          period_started_at = excluded.period_started_at, expires_at = excluded.expires_at, source_event_id = v_id,
          last_event_at = excluded.last_event_at, updated_at = now()
        where t.expires_at is not null and (excluded.expires_at is null or excluded.expires_at > t.expires_at);
        delete from companion.plan_entitlements where user_id = v_row.user_id and entitlement = v_row.entitlement;
      end loop;
      v_user := v_to;
      v_outcome := 'transferred';
    end if;
  elsif v_user is null then
    v_outcome := 'unknown_user';
  else
    select * into v_product from companion.store_products
    where product_id = p_event->>'productId' or product_id = split_part(p_event->>'productId', ':', 1)
    order by (product_id = p_event->>'productId') desc limit 1;
    v_ref := 'rc:' || coalesce(p_event->>'transactionId', v_id);
    if v_product.product_id is null then
      v_outcome := 'unknown_product';
    elsif v_product.kind = 'coins' then
      if v_action = 'coins' then
        v_outcome := case when public.companion_grant_credits(v_user, 'paid', v_product.coins + v_product.bonus_coins,
          'purchase', v_ref, null) then 'coins_granted' else 'coins_duplicate' end;
      elsif v_action = 'refund' then
        v_outcome := case when exists (
            select 1 from companion.credit_ledger where kind = 'revoke' and reason = 'refund' and ref_id = v_ref
          ) then 'coins_duplicate'
          when companion.revoke_coins(v_user, v_product.coins + v_product.bonus_coins, v_ref) then 'coins_revoked'
          else 'refund_unrecovered' end;
      else
        v_outcome := 'unknown_product';
      end if;
    elsif v_action not in ('activate', 'uncancel', 'cancel', 'refund', 'billing_issue', 'expire', 'product_change') then
      v_outcome := 'unknown_product';
    else
      select * into v_row from companion.plan_entitlements where user_id = v_user and entitlement = v_product.plan_id for update;
      if found and v_row.last_event_at > v_event_at then
        v_outcome := 'stale';
      elsif v_action = 'activate' then
        insert into companion.plan_entitlements as t (user_id, entitlement, product_id, store, environment, status, will_renew,
          period_started_at, expires_at, source_event_id, last_event_at)
        values (v_user, v_product.plan_id, v_product.product_id, p_event->>'store', coalesce(p_event->>'environment', 'production'),
          'active', true, coalesce((p_event->>'purchasedAt')::timestamptz, v_event_at), v_expires, v_id, v_event_at)
        on conflict (user_id, entitlement) do update set
          product_id = excluded.product_id, store = excluded.store, environment = excluded.environment, status = 'active',
          will_renew = true, period_started_at = excluded.period_started_at, expires_at = excluded.expires_at,
          pending_product_id = null, source_event_id = v_id, last_event_at = v_event_at, updated_at = now();
        perform companion.grant_plan_coins(v_user, now());
        v_outcome := 'activated';
      elsif not found then
        v_outcome := 'unknown_entitlement';
      else
        update companion.plan_entitlements set
          status = case v_action
            when 'uncancel' then 'active' when 'cancel' then 'cancelled' when 'refund' then 'revoked'
            when 'billing_issue' then 'billing_issue' when 'expire' then 'expired' else status end,
          will_renew = case v_action when 'uncancel' then true when 'cancel' then false when 'refund' then false
            when 'expire' then false else will_renew end,
          expires_at = case v_action
            when 'refund' then least(coalesce(expires_at, v_event_at), v_event_at)
            when 'billing_issue' then coalesce((p_event->>'graceExpiresAt')::timestamptz, expires_at)
            when 'expire' then least(coalesce(expires_at, v_expires, v_event_at), coalesce(v_expires, v_event_at))
            else expires_at end,
          pending_product_id = case when v_action = 'product_change' then p_event->>'newProductId' else pending_product_id end,
          source_event_id = v_id, last_event_at = v_event_at, updated_at = now()
        where user_id = v_user and entitlement = v_product.plan_id;
        v_outcome := case v_action
          when 'uncancel' then 'uncancelled' when 'cancel' then 'cancelled' when 'refund' then 'revoked'
          when 'billing_issue' then 'billing_issue' when 'expire' then 'expired' else 'product_change_recorded' end;
      end if;
    end if;
  end if;

  update companion.store_events set outcome = v_outcome, user_id = v_user where id = v_id;
  return jsonb_build_object('outcome', v_outcome, 'userId', v_user);
end;
$$;

-- 매달 엽전 몰아 주기(pg_cron 하루 한 번 — 연간 구독자의 다음 달 몫). 이번에 더한 사용자 수.
create function public.companion_grant_due_plan_coins(p_now timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_count integer := 0;
begin
  for v_user in
    select distinct e.user_id from companion.plan_entitlements e join companion.plans p on p.id = e.entitlement
    where p.monthly_coins > 0 and companion.plan_active(e.status, e.expires_at, p_now)
  loop
    if companion.grant_plan_coins(v_user, p_now) > 0 then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- ------------------------------------------------------------------ 앱용

-- 요금제 혜택 · 상품 id(가격 없음 — 가격은 스토어). 비회원도 읽는다(값은 공개 정보).
create function public.companion_plans()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 1,
    'free', (select jsonb_build_object('dailyFreeMessages', daily_free_messages) from companion.plans where id = 'free'),
    'plans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'sortOrder', p.sort_order,
        'chatRank', p.chat_rank,
        'dailyFreeMessages', p.daily_free_messages,
        'dailyMessageCap', p.daily_message_cap,
        'monthlyCoins', p.monthly_coins,
        'unlimitedTickets', p.unlimited_tickets,
        'allCharacters', p.all_characters,
        'highlight', p.highlight,
        'products', jsonb_build_object(
          'monthly', (select product_id from companion.store_products s
            where s.plan_id = p.id and s.period = 'monthly' and s.active order by s.sort_order limit 1),
          'yearly', (select product_id from companion.store_products s
            where s.plan_id = p.id and s.period = 'yearly' and s.active order by s.sort_order limit 1))
      ) order by p.sort_order, p.id)
      from companion.plans p where p.id <> 'free'
    ), '[]'::jsonb),
    'coinPacks', coalesce((
      select jsonb_agg(jsonb_build_object('productId', product_id, 'coins', coins, 'bonusCoins', bonus_coins) order by sort_order)
      from companion.store_products where kind = 'coins' and active
    ), '[]'::jsonb)
  )
$$;

create function public.companion_entitlements()
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
    'tier', companion.tier_of(v_user, now()),
    'unlimitedTickets', companion.has_unlimited_tickets(v_user, now()),
    'entitlements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', entitlement, 'productId', product_id, 'store', store, 'status', status, 'willRenew', will_renew,
        'expiresAt', expires_at) order by entitlement)
      from companion.plan_entitlements
      where user_id = v_user and companion.plan_active(status, expires_at, now())
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.companion_apply_store_event(jsonb) from public, anon, authenticated;
revoke all on function public.companion_grant_due_plan_coins(timestamptz) from public, anon, authenticated;
grant execute on function public.companion_apply_store_event(jsonb) to service_role;
grant execute on function public.companion_grant_due_plan_coins(timestamptz) to service_role;
revoke all on function public.companion_plans() from public;
grant execute on function public.companion_plans() to anon, authenticated;
revoke all on function public.companion_entitlements() from public, anon;
grant execute on function public.companion_entitlements() to authenticated;
