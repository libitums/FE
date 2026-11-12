-- AI 컴패니언 M4 과금: 지갑 · 원장 · 예약(hold) · 덕수쌤 체험 사용량 · 티어(PRD §3.10, API §6).
-- 예약 → 확정 / 해제는 턴 시작 · 끝 함수(20261113120000) 안에서 같은 트랜잭션으로 돈다. 여기는 표와 지급 · 소멸 · 정리 · 조회 함수다.
-- 결제(영수증 검증 · 웹 결제)는 만들지 않는다 — 결제 작업이 `companion_grant_credits`와 `companion.entitlements`를 쓴다(API §2.4).
--
-- 불변식: 지갑 버킷 잔액의 합 = 원장 delta의 합(사용자마다). 원장은 추가만 한다.

create table companion.credit_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sub_balance integer not null default 0 check (sub_balance >= 0),
  sub_expires_at timestamptz,
  grant_balance integer not null default 0 check (grant_balance >= 0),
  paid_balance integer not null default 0 check (paid_balance >= 0),
  updated_at timestamptz not null default now()
);

create table companion.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  bucket text not null check (bucket in ('sub', 'grant', 'paid')),
  kind text not null check (kind in ('grant', 'reserve', 'settle', 'release', 'expire')),
  reason text,
  ref_id text,
  hold_id uuid,
  created_at timestamptz not null default clock_timestamp()
);
create index credit_ledger_user_idx on companion.credit_ledger (user_id, created_at desc);
-- 같은 영수증 · 거래를 두 번 지급하지 않는다.
create unique index credit_ledger_grant_uniq on companion.credit_ledger (reason, ref_id) where kind = 'grant' and ref_id is not null;

create table companion.credit_holds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_message_id uuid not null,
  character_id text not null,
  amount integer not null check (amount >= 0),
  -- 버킷별로 뺀 양: { sub: n, grant: n, paid: n }. 해제 때 그대로 되돌린다.
  buckets jsonb not null default '{}'::jsonb,
  trial boolean not null default false,
  status text not null default 'open' check (status in ('open', 'settled', 'released')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create unique index credit_holds_message_uniq on companion.credit_holds (user_id, client_message_id) where status <> 'released';

create table companion.trial_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id text not null,
  used integer not null default 0 check (used >= 0),
  primary key (user_id, character_id)
);

-- 티어. 결제 작업이 채우고 컴패니언은 읽기만 한다. 행이 없거나 만료되면 free.
create table companion.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text not null check (tier in ('free', 'premium')),
  expires_at timestamptz,
  source text not null check (char_length(source) between 1 and 64),
  updated_at timestamptz not null default now()
);

alter table companion.credit_wallets enable row level security;
alter table companion.credit_ledger enable row level security;
alter table companion.credit_holds enable row level security;
alter table companion.trial_usage enable row level security;
alter table companion.entitlements enable row level security;
revoke all on table companion.credit_wallets, companion.credit_ledger, companion.credit_holds, companion.trial_usage, companion.entitlements
  from public, anon, authenticated;
grant select, insert, update, delete on table companion.credit_wallets, companion.credit_ledger, companion.credit_holds,
  companion.trial_usage, companion.entitlements to service_role;

create function companion.tier_of(p_user_id uuid, p_now timestamptz)
returns text language sql stable as $$
  select coalesce((
    select tier from companion.entitlements
    where user_id = p_user_id and (expires_at is null or expires_at > p_now)
  ), 'free')
$$;
revoke all on function companion.tier_of(uuid, timestamptz) from public;

-- 지갑 행을 잠가 돌려준다(없으면 만든다).
create function companion.lock_wallet(p_user_id uuid)
returns companion.credit_wallets language plpgsql as $$
declare
  v companion.credit_wallets;
begin
  insert into companion.credit_wallets (user_id) values (p_user_id) on conflict do nothing;
  select * into v from companion.credit_wallets where user_id = p_user_id for update;
  return v;
end;
$$;
revoke all on function companion.lock_wallet(uuid) from public;

create function companion.wallet_json(p_user_id uuid, p_now timestamptz)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'tier', companion.tier_of(p_user_id, p_now),
    'sub', coalesce(w.sub_balance, 0),
    'subExpiresAt', w.sub_expires_at,
    'grant', coalesce(w.grant_balance, 0),
    'paid', coalesce(w.paid_balance, 0),
    'balance', coalesce(w.sub_balance + w.grant_balance + w.paid_balance, 0),
    'trialRemaining', greatest(0, s.trial_limit - coalesce((
      select used from companion.trial_usage t where t.user_id = p_user_id and t.character_id = s.trial_character
    ), 0))
  )
  from companion.settings s
  left join companion.credit_wallets w on w.user_id = p_user_id
$$;
revoke all on function companion.wallet_json(uuid, timestamptz) from public;

-- 예약을 해제한다(열린 것만 — 닫혔으면 아무것도 하지 않는다). 시작 · 끝 함수와 정리 작업이 부른다.
create function companion.release_hold(p_hold_id uuid)
returns void language plpgsql as $$
declare
  v_hold companion.credit_holds;
  v_bucket text;
  v_amount integer;
begin
  select * into v_hold from companion.credit_holds where id = p_hold_id and status = 'open' for update;
  if not found then
    return;
  end if;
  perform companion.lock_wallet(v_hold.user_id);
  for v_bucket, v_amount in select key, value::integer from jsonb_each_text(v_hold.buckets) loop
    if v_amount > 0 then
      execute format('update companion.credit_wallets set %I = %I + $1, updated_at = now() where user_id = $2',
        v_bucket || '_balance', v_bucket || '_balance') using v_amount, v_hold.user_id;
      insert into companion.credit_ledger (user_id, delta, bucket, kind, hold_id) values (v_hold.user_id, v_amount, v_bucket, 'release', v_hold.id);
    end if;
  end loop;
  if v_hold.trial then
    update companion.trial_usage set used = greatest(0, used - 1) where user_id = v_hold.user_id and character_id = v_hold.character_id;
  end if;
  update companion.credit_holds set status = 'released', closed_at = now() where id = v_hold.id;
end;
$$;
revoke all on function companion.release_hold(uuid) from public;

create function companion.settle_hold(p_hold_id uuid)
returns void language plpgsql as $$
declare
  v_hold companion.credit_holds;
begin
  select * into v_hold from companion.credit_holds where id = p_hold_id and status = 'open' for update;
  if not found then
    return;
  end if;
  if v_hold.amount > 0 then
    insert into companion.credit_ledger (user_id, delta, bucket, kind, hold_id)
    select v_hold.user_id, 0, key, 'settle', v_hold.id from jsonb_each_text(v_hold.buckets) where value::integer > 0;
  end if;
  update companion.credit_holds set status = 'settled', closed_at = now() where id = v_hold.id;
end;
$$;
revoke all on function companion.settle_hold(uuid) from public;

-- ------------------------------------------------------------------ 서버용 · 결제 연결점 (service_role)

-- 지급. (p_reason, p_ref_id)가 같으면 두 번 지급하지 않고 false. 구독분은 p_expires_at에 소멸한다.
create function public.companion_grant_credits(
  p_user_id uuid, p_bucket text, p_amount integer, p_reason text, p_ref_id text, p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_bucket not in ('sub', 'grant', 'paid') or p_amount is null or p_amount <= 0
    or p_reason not in ('subscription', 'purchase', 'signup', 'operator') then
    raise exception 'invalid grant' using errcode = '22023';
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

-- 구독분 소멸(pg_cron). 소멸한 지갑 수.
create function public.companion_expire_sub_credits(p_now timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in select user_id, sub_balance from companion.credit_wallets
    where sub_balance > 0 and sub_expires_at is not null and sub_expires_at <= p_now for update loop
    update companion.credit_wallets set sub_balance = 0, updated_at = now() where user_id = v_row.user_id;
    insert into companion.credit_ledger (user_id, delta, bucket, kind, reason) values (v_row.user_id, -v_row.sub_balance, 'sub', 'expire', 'subscription');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- 닫히지 않은 예약 정리(서버가 턴 중간에 죽은 경우, pg_cron). 유저 메시지는 failed가 된다(API §6.1).
create function public.companion_release_stale_holds(p_older_than interval)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold record;
  v_count integer := 0;
begin
  for v_hold in select id, user_id, client_message_id from companion.credit_holds
    where status = 'open' and created_at < now() - p_older_than loop
    perform companion.release_hold(v_hold.id);
    update companion.messages set status = 'failed'
    where user_id = v_hold.user_id and client_message_id = v_hold.client_message_id and status = 'pending';
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- 플레이그라운드 · 결제 작업: 티어를 정한다. p_tier가 null이면 행을 지운다(free).
create function public.companion_set_entitlement(p_user_id uuid, p_tier text, p_expires_at timestamptz, p_source text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_tier is null then
    delete from companion.entitlements where user_id = p_user_id;
    return;
  end if;
  insert into companion.entitlements (user_id, tier, expires_at, source, updated_at)
  values (p_user_id, p_tier, p_expires_at, p_source, now())
  on conflict (user_id) do update set tier = excluded.tier, expires_at = excluded.expires_at, source = excluded.source, updated_at = now();
end;
$$;

create function public.companion_inspect_wallet(p_user_id uuid, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select companion.wallet_json(p_user_id, now()) || jsonb_build_object(
    'ledger', coalesce((
      select jsonb_agg(jsonb_build_object('delta', delta, 'bucket', bucket, 'kind', kind, 'reason', reason, 'refId', ref_id, 'createdAt', created_at) order by created_at desc)
      from (select * from companion.credit_ledger where user_id = p_user_id order by created_at desc limit greatest(1, least(coalesce(p_limit, 50), 500))) l
    ), '[]'::jsonb),
    'openHolds', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'amount', amount, 'trial', trial, 'createdAt', created_at))
      from companion.credit_holds where user_id = p_user_id and status = 'open'
    ), '[]'::jsonb)
  )
$$;

-- ------------------------------------------------------------------ 앱용

create function public.companion_get_wallet()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  return companion.wallet_json(auth.uid(), now()) - 'balance';
end;
$$;

-- 플레이그라운드 초기화가 체험 사용량도 되돌린다(M3의 companion_operator_reset을 표가 생긴 뒤 다시 쓴다).
create or replace function public.companion_operator_reset(p_user_id uuid, p_character_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from auth.users where id = p_user_id and raw_app_meta_data->>'duru_tester' = 'true') then
    raise exception 'not a tester' using errcode = 'P0002';
  end if;
  delete from companion.conversations where user_id = p_user_id and character_id = p_character_id;
  delete from companion.relationships where user_id = p_user_id and character_id = p_character_id;
  delete from companion.memories where user_id = p_user_id and (character_id = p_character_id or character_id is null);
  delete from companion.moderation_state where user_id = p_user_id;
  delete from companion.notice_state where user_id = p_user_id;
  delete from companion.trial_usage where user_id = p_user_id and character_id = p_character_id;
end;
$$;

revoke all on function public.companion_grant_credits(uuid, text, integer, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_expire_sub_credits(timestamptz) from public, anon, authenticated;
revoke all on function public.companion_release_stale_holds(interval) from public, anon, authenticated;
revoke all on function public.companion_set_entitlement(uuid, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.companion_inspect_wallet(uuid, integer) from public, anon, authenticated;
grant execute on function public.companion_grant_credits(uuid, text, integer, text, text, timestamptz) to service_role;
grant execute on function public.companion_expire_sub_credits(timestamptz) to service_role;
grant execute on function public.companion_release_stale_holds(interval) to service_role;
grant execute on function public.companion_set_entitlement(uuid, text, timestamptz, text) to service_role;
grant execute on function public.companion_inspect_wallet(uuid, integer) to service_role;
revoke all on function public.companion_get_wallet() from public, anon;
grant execute on function public.companion_get_wallet() to authenticated;
