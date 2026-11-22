-- 푸시 캠페인 보상(2026-11-21, ADR-0175): 운영자가 콘솔 캠페인에 보상(엽전 N · 무제한 티켓 H시간)을 붙이고, 그 알림을 눌러 들어온
-- 수신자가 기한 안에 한 번 받는다.
--
-- 1. 콘솔(service_role)이 발송 **전에** 보상 한 줄(`push_campaign_rewards`)과 **보낸 그룹만**의 수신자(`push_campaign_reward_recipients`)를
--    적는다. 대조군은 적지 않는다 — 대조군이 받으면 A/B 지표가 깨진다. 기록이 실패하면 콘솔은 보내지 않는다.
-- 2. `public.push_campaign_claim_reward(p_campaign_id)`(앱이 부름, 로그인 필수, 멱등): 앱이 보낸 캠페인 id를 믿지 않고 수신자 표로
--    검증한다. 판정: 모름(unknown) → 수신자 아님(not_recipient) → 이미 받음(already_claimed) → 기한 지남(expired) → 지급(granted).
--    id는 필수다 — null · 빈 글 · 틀린 형식은 unknown(지급 0). 「그 알림」을 가리키지 못하는 누름에 다른 보상을 골라 주지 않는다.
-- 3. 엽전은 grant 버킷(`grant_once`, reason `push_campaign`, ref `<uid>:<campaign>`). 무제한 티켓은 시간 한정 권한
--    `companion.ticket_passes`(지금부터 H시간, 살아 있는 보상 이용권이 있으면 그 끝에서 이어 붙임). `companion.has_unlimited_tickets`(구독
--    의미 — 앱의 요금제 칩 · Go unlimited가 읽음)는 바꾸지 않는다. 앱의 레슨 티켓은 기기 원장(ADR-0075)이라 앱이 응답의 끝 시각을 쓴다.
-- 4. 네 표 모두 RLS 켬 · 앱 역할 권한 없음. 콘솔 지표는 `push_campaign_reward_claim_counts`(service_role만).

create table public.push_campaign_rewards (
  campaign_id text primary key check (campaign_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  kind text not null check (kind in ('coins', 'unlimited_tickets')),
  amount integer check (amount between 1 and 1000),
  hours integer check (hours between 1 and 168),
  sent_at timestamptz not null default now(),
  claim_until timestamptz not null,
  created_at timestamptz not null default now(),
  check ((kind = 'coins') = (amount is not null)),
  check ((kind = 'unlimited_tickets') = (hours is not null)),
  check (claim_until > sent_at and claim_until <= sent_at + interval '14 days')
);

create table public.push_campaign_reward_recipients (
  campaign_id text not null references public.push_campaign_rewards (campaign_id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (campaign_id, user_id)
);
create index push_campaign_reward_recipients_user_idx on public.push_campaign_reward_recipients (user_id);

create table public.push_campaign_reward_claims (
  campaign_id text not null,
  user_id uuid not null,
  kind text not null check (kind in ('coins', 'unlimited_tickets')),
  amount integer,
  hours integer,
  pass_until timestamptz,
  claimed_at timestamptz not null default now(),
  primary key (campaign_id, user_id),
  foreign key (campaign_id, user_id)
    references public.push_campaign_reward_recipients (campaign_id, user_id) on delete cascade
);

-- 시간 한정 무제한 티켓 권한. 출처마다(지금은 푸시 캠페인) 한 줄.
create table companion.ticket_passes (
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('push_campaign')),
  ref_id text not null check (char_length(ref_id) between 1 and 80),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (user_id, source, ref_id),
  check (expires_at > starts_at)
);
create index ticket_passes_user_expires_idx on companion.ticket_passes (user_id, expires_at desc);

alter table public.push_campaign_rewards enable row level security;
alter table public.push_campaign_reward_recipients enable row level security;
alter table public.push_campaign_reward_claims enable row level security;
alter table companion.ticket_passes enable row level security;
revoke all on table public.push_campaign_rewards, public.push_campaign_reward_recipients,
  public.push_campaign_reward_claims, companion.ticket_passes from public, anon, authenticated;
grant select, insert on table public.push_campaign_rewards, public.push_campaign_reward_recipients to service_role;
-- 콘솔이 수신자를 다 적지 못하면 보상 줄을 지운다(수신자 cascade) — 보내지 않은 캠페인의 보상이 남지 않게.
grant delete on table public.push_campaign_rewards to service_role;
grant select on table public.push_campaign_reward_claims, companion.ticket_passes to service_role;

create function public.push_campaign_claim_reward(p_campaign_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  r public.push_campaign_rewards;
  c public.push_campaign_reward_claims;
  v_status text;
  v_start timestamptz;
  v_until timestamptz;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  -- 같은 사람의 겹친 누름(두 기기 · 빠른 두 번)을 줄 세운다.
  perform pg_advisory_xact_lock(hashtext('push_campaign_reward:' || v_user::text));

  select * into r from public.push_campaign_rewards
  where p_campaign_id ~ '^[A-Za-z0-9_-]{1,80}$' and campaign_id = p_campaign_id;
  if not found then
    v_status := 'unknown';
  elsif not exists (
    select 1 from public.push_campaign_reward_recipients where campaign_id = r.campaign_id and user_id = v_user
  ) then
    v_status := 'not_recipient';
  else
    select * into c from public.push_campaign_reward_claims where campaign_id = r.campaign_id and user_id = v_user;
    v_status := case when found then 'already_claimed' when v_now > r.claim_until then 'expired' else 'granted' end;
  end if;

  if v_status = 'granted' then
    if r.kind = 'coins' then
      perform companion.grant_once(v_user, r.amount, 'push_campaign', v_user::text || ':' || r.campaign_id);
    else
      -- 살아 있는 보상 이용권이 있으면 그 끝에서 시작한다(겹쳐 받은 사람이 시간을 잃지 않게).
      select greatest(v_now, coalesce(max(p.expires_at), v_now)) into v_start
      from companion.ticket_passes p
      where p.user_id = v_user and p.source = 'push_campaign' and p.expires_at > v_now;
      v_until := v_start + make_interval(hours => r.hours);
      insert into companion.ticket_passes (user_id, source, ref_id, starts_at, expires_at)
      values (v_user, 'push_campaign', r.campaign_id, v_start, v_until);
    end if;
    insert into public.push_campaign_reward_claims (campaign_id, user_id, kind, amount, hours, pass_until)
    values (r.campaign_id, v_user, r.kind, r.amount, r.hours, v_until)
    returning * into c;
  end if;

  if v_status not in ('granted', 'already_claimed') then
    return jsonb_build_object('status', v_status, 'campaignId', null, 'kind', null, 'amount', null, 'hours', null,
      'passUntil', null, 'wallet', null);
  end if;
  return jsonb_build_object('status', v_status, 'campaignId', r.campaign_id, 'kind', r.kind, 'amount', r.amount,
    'hours', r.hours, 'passUntil', c.pass_until, 'wallet', companion.wallet_json(v_user, v_now));
end;
$$;
revoke all on function public.push_campaign_claim_reward(text) from public, anon;
grant execute on function public.push_campaign_claim_reward(text) to authenticated;

-- 콘솔 결과 탭의 「보상 받음」 — 캠페인별 받은 수.
create function public.push_campaign_reward_claim_counts(p_campaign_ids text[])
returns table (campaign_id text, claimed integer)
language sql
stable
security definer
set search_path = ''
as $$
  select k.campaign_id, count(*)::integer
  from public.push_campaign_reward_claims k
  where k.campaign_id = any (p_campaign_ids)
  group by k.campaign_id
  order by k.campaign_id;
$$;
revoke all on function public.push_campaign_reward_claim_counts(text[]) from public, anon, authenticated;
grant execute on function public.push_campaign_reward_claim_counts(text[]) to service_role;
