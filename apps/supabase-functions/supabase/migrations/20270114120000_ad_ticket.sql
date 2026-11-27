-- 광고 보고 티켓 1장(ADR-0208, 사용자 결정 2026-11-27 「1단계 티켓 추가만」).
--
--   「Out of tickets」 대화상자의 「Watch a short ad」 → 앱이 `ad_ticket_start`로 요청 id를 받아 AdMob 보상형 광고의 SSV custom_data에 싣는다 →
--   광고를 끝까지 보면 Google이 Edge Function `admob-ssv`를 부르고, 서명을 확인한 뒤 `ad_ticket_grant`(service_role)가 판정한다 →
--   앱은 `ad_ticket_status`를 다시 읽어 지급(granted)을 보면 기기 원장에 1장을 더한다(엽전 구매와 같은 `addBoughtTicket`, ADR-0075).
--   티켓 원장은 여전히 앱(진행 스냅숏)에 있다 — 서버는 「이 요청은 1장 받을 자격이 확인됐다」만 기록한다.
--
--   스위치: `companion.settings.ad_ticket_enabled`(기본 off). 앱의 PostHog 플래그 `ad-ticket`과 둘 다 켜져야 버튼이 보인다.
--   대상: 로그인(익명 아님) · 계정 생성 뒤 24시간 지남(첫날 무제한, ADR-0186) · 활성 구독 없음(요금제 종류 무관).
--   상한: 하루 `ad_ticket_daily_cap`(기본 2)회. 하루는 앱이 보낸 UTC 오프셋(분)의 자정부터 — 기기 원장의 「하루」(기기 지역 날짜)와 같다.
--   오프셋은 지난 48시간 안 요청의 값으로 고정된다(요청마다 바꿔 여러 날치를 앞당기지 못하게).
--   멱등: 거래 id(`transaction_id`)마다 한 번 — 같은 콜백이 다시 와도 `duplicate`. 요청 하나에 지급도 한 번.
--   요청 id는 24시간 산다(그 뒤 콜백은 `expired`). 사용자마다 하루 시작 수도 20번으로 막는다(표가 부풀지 않게).

alter table companion.settings
  add column if not exists ad_ticket_enabled boolean not null default false,
  add column if not exists ad_ticket_daily_cap integer not null default 2
    check (ad_ticket_daily_cap between 0 and 10);

create table companion.ad_ticket_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  utc_offset_min integer not null default 0 check (utc_offset_min between -840 and 840),
  status text not null default 'pending' check (status in ('pending', 'granted', 'rejected')),
  reason text check (reason is null or char_length(reason) <= 32),
  transaction_id text unique,
  granted_at timestamptz,
  grant_day date,
  check ((status = 'granted') = (granted_at is not null and grant_day is not null))
);
create index ad_ticket_requests_user_day on companion.ad_ticket_requests (user_id, grant_day)
  where status = 'granted';
create index ad_ticket_requests_user_created on companion.ad_ticket_requests (user_id, created_at);

-- 받은 콜백 거래(거절 포함). 같은 거래 id가 다시 오면 여기서 걸러 `duplicate`.
create table companion.ad_ticket_transactions (
  transaction_id text primary key check (char_length(transaction_id) between 1 and 200),
  user_id uuid references auth.users (id) on delete cascade,
  request_id uuid,
  ad_unit text check (ad_unit is null or char_length(ad_unit) <= 200),
  outcome text not null,
  received_at timestamptz not null default now()
);

alter table companion.ad_ticket_requests enable row level security;
alter table companion.ad_ticket_transactions enable row level security;
revoke all on table companion.ad_ticket_requests, companion.ad_ticket_transactions from public, anon, authenticated;
grant select, insert, update, delete on table companion.ad_ticket_requests, companion.ad_ticket_transactions to service_role;

-- ------------------------------------------------------------------ 내부 도우미

-- 앱이 보낸 오프셋(분)으로 본 오늘. 범위 밖 · null은 0(UTC).
create function companion.ad_ticket_day(p_utc_offset_min integer, p_now timestamptz)
returns date language sql immutable set search_path = '' as $$
  select ((p_now at time zone 'utc')
    + make_interval(mins => case when p_utc_offset_min between -840 and 840 then p_utc_offset_min else 0 end))::date
$$;

-- 광고 티켓을 받을 수 없는 까닭, 받을 수 있으면 null: off · anonymous · new_account · subscribed.
create function companion.ad_ticket_block(p_user_id uuid, p_now timestamptz)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_user auth.users;
begin
  if not coalesce((select ad_ticket_enabled from companion.settings), false) then
    return 'off';
  end if;
  select * into v_user from auth.users where id = p_user_id;
  if not found or v_user.is_anonymous then
    return 'anonymous';
  end if;
  if v_user.created_at > p_now - interval '24 hours' then
    return 'new_account';
  end if;
  if exists (
    select 1 from companion.plan_entitlements
    where user_id = p_user_id and companion.plan_active(status, expires_at, p_now)
  ) then
    return 'subscribed';
  end if;
  return null;
end;
$$;

-- 이 사용자의 「하루」 오프셋. 지난 48시간 안에 시작한 요청이 있으면 그 오프셋을 그대로 쓴다 — 요청마다 오프셋을 바꿔
-- 날짜 셋(−14h ~ +14h)에 걸쳐 상한을 한꺼번에 앞당겨 받지 못하게(리뷰). 48시간 쉬면 새 오프셋(여행 · 시간대 변경)을 받는다.
create function companion.ad_ticket_offset(p_user_id uuid, p_requested integer, p_now timestamptz)
returns integer language sql stable set search_path = '' as $$
  select coalesce(
    (select utc_offset_min from companion.ad_ticket_requests
     where user_id = p_user_id and created_at > p_now - interval '48 hours'
     order by created_at desc limit 1),
    case when p_requested between -840 and 840 then p_requested else 0 end
  )
$$;

create function companion.ad_ticket_used(p_user_id uuid, p_day date)
returns integer language sql stable set search_path = '' as $$
  select count(*)::integer from companion.ad_ticket_requests
  where user_id = p_user_id and status = 'granted' and grant_day = p_day
$$;

revoke all on function companion.ad_ticket_day(integer, timestamptz), companion.ad_ticket_block(uuid, timestamptz),
  companion.ad_ticket_offset(uuid, integer, timestamptz),
  companion.ad_ticket_used(uuid, date) from public;

-- ------------------------------------------------------------------ 앱: 상태 · 시작

create function public.ad_ticket_status(p_utc_offset_min integer, p_request_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_block text;
  v_cap integer;
  v_used integer;
  v_request jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  v_block := companion.ad_ticket_block(v_user, now());
  select ad_ticket_daily_cap into v_cap from companion.settings;
  v_used := companion.ad_ticket_used(v_user,
    companion.ad_ticket_day(companion.ad_ticket_offset(v_user, p_utc_offset_min, now()), now()));
  select jsonb_build_object('id', id, 'status', status, 'reason', reason) into v_request
  from companion.ad_ticket_requests where id = p_request_id and user_id = v_user;
  return jsonb_build_object(
    'enabled', v_block is distinct from 'off',
    'eligible', v_block is null,
    'reason', v_block,
    'cap', v_cap,
    'used', v_used,
    'left', greatest(v_cap - v_used, 0),
    'request', v_request
  );
end;
$$;

create function public.ad_ticket_start(p_utc_offset_min integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_offset integer;
  v_block text;
  v_cap integer;
  v_left integer;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  v_offset := companion.ad_ticket_offset(v_user, p_utc_offset_min, now());
  select ad_ticket_daily_cap into v_cap from companion.settings;
  v_left := greatest(v_cap - companion.ad_ticket_used(v_user, companion.ad_ticket_day(v_offset, now())), 0);
  v_block := companion.ad_ticket_block(v_user, now());
  if v_block is not null then
    return jsonb_build_object('result', 'blocked', 'reason', v_block, 'left', v_left, 'cap', v_cap);
  end if;
  if v_left = 0 or (
    select count(*) from companion.ad_ticket_requests
    where user_id = v_user and created_at > now() - interval '24 hours'
  ) >= 20 then
    return jsonb_build_object('result', 'limit', 'left', v_left, 'cap', v_cap);
  end if;
  insert into companion.ad_ticket_requests (user_id, utc_offset_min) values (v_user, v_offset)
  returning id into v_id;
  return jsonb_build_object('result', 'ok', 'requestId', v_id, 'left', v_left, 'cap', v_cap);
end;
$$;

-- ------------------------------------------------------------------ SSV: 지급 판정(service_role — Edge Function `admob-ssv`만)

create function public.ad_ticket_grant(p_user_id uuid, p_request_id uuid, p_transaction_id text, p_ad_unit text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_request companion.ad_ticket_requests;
  v_outcome text;
  v_day date;
  v_cap integer;
begin
  if p_transaction_id is null or char_length(p_transaction_id) not between 1 and 200 then
    raise exception 'transaction id required' using errcode = '22004';
  end if;
  -- 사용자마다 한 줄로 — 같은 사용자의 콜백 둘이 겹쳐도 상한을 함께 넘지 않는다.
  perform pg_advisory_xact_lock(hashtextextended('ad_ticket:' || p_user_id::text, 0));
  if exists (select 1 from companion.ad_ticket_transactions where transaction_id = p_transaction_id) then
    return jsonb_build_object('outcome', 'duplicate');
  end if;

  select * into v_request from companion.ad_ticket_requests
  where id = p_request_id and user_id = p_user_id for update;
  if not found then
    v_outcome := 'unknown_request';
  elsif v_request.status = 'granted' then
    v_outcome := 'already_granted';
  elsif v_request.created_at <= now() - interval '24 hours' then
    v_outcome := 'expired';
  else
    v_outcome := companion.ad_ticket_block(p_user_id, now());
    if v_outcome is null then
      v_day := companion.ad_ticket_day(v_request.utc_offset_min, now());
      select ad_ticket_daily_cap into v_cap from companion.settings;
      if companion.ad_ticket_used(p_user_id, v_day) >= v_cap then
        v_outcome := 'limit';
      else
        v_outcome := 'granted';
      end if;
    end if;
    if v_outcome = 'granted' then
      update companion.ad_ticket_requests
      set status = 'granted', reason = null, transaction_id = p_transaction_id, granted_at = now(), grant_day = v_day
      where id = p_request_id;
    else
      update companion.ad_ticket_requests set status = 'rejected', reason = v_outcome where id = p_request_id;
    end if;
  end if;

  insert into companion.ad_ticket_transactions (transaction_id, user_id, request_id, ad_unit, outcome)
  values (
    p_transaction_id,
    (select id from auth.users where id = p_user_id),
    p_request_id,
    left(p_ad_unit, 200),
    v_outcome
  );
  return jsonb_build_object('outcome', v_outcome);
end;
$$;

revoke all on function public.ad_ticket_status(integer, uuid), public.ad_ticket_start(integer) from public, anon;
grant execute on function public.ad_ticket_status(integer, uuid), public.ad_ticket_start(integer) to authenticated;
revoke all on function public.ad_ticket_grant(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.ad_ticket_grant(uuid, uuid, text, text) to service_role;
