-- 자동 푸시 캠페인(ADR-0130 D12). 매시 예약 작업이 `push-campaigns` 함수를 부르고, 함수가 아래 RPC로 학습자를 읽어
-- 보낼 사람 · 대조군을 정한 뒤 이 표에 남긴다. 로컬 푸시 콘솔 결과 탭이 이 표를 읽어 대조군과 비교한다.
--
-- **앱은 닿지 않는다.** RLS를 켜고 정책을 두지 않으며 앱 역할의 표 · 함수 권한을 걷는다 — service role만 읽고 쓴다.

create table public.push_campaign_sends (
  id bigint generated always as identity primary key,
  run_at timestamptz not null,
  series text not null check (length(series) between 1 and 80),
  segment text not null check (length(segment) between 1 and 40),
  user_id uuid not null references auth.users (id) on delete cascade,
  "group" text not null check ("group" in ('sent', 'control')),
  -- 받은 사람의 문구 변형(a 캐릭터 톤 · b 단계별 예고). 대조군은 비운다.
  variant text check (variant in ('a', 'b')),
  lang text not null check (length(lang) between 2 and 8),
  -- 단계별 예고면 「에피소드:단계:훅」.
  story_step text check (length(story_step) <= 120),
  title text not null check (length(title) <= 200),
  body text not null check (length(body) <= 1000),
  created_at timestamptz not null default now(),
  check (("group" = 'control') = (variant is null))
);

create index push_campaign_sends_user_run_idx on public.push_campaign_sends (user_id, run_at desc);
create index push_campaign_sends_run_idx on public.push_campaign_sends (run_at);

alter table public.push_campaign_sends enable row level security;
revoke all on table public.push_campaign_sends from anon, authenticated;

-- 자동 캠페인 후보 — 기기가 있는 사용자마다 마지막 활동 · 이름 · 나라 · 카탈로그 진행 · 시험 계정 여부 ·
-- 마지막 자동 캠페인 배정 시각(대조군 포함)이다.
create function public.push_campaign_learners()
returns table (
  user_id uuid,
  last_active_at timestamptz,
  name text,
  country_code text,
  catalog_progress jsonb,
  tester boolean,
  last_campaign_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select d.user_id, max(d.last_active_at) as last_active_at
    from public.push_devices d
    group by d.user_id
  ),
  campaigns as (
    select s.user_id, max(s.run_at) as last_campaign_at
    from public.push_campaign_sends s
    group by s.user_id
  )
  select
    l.user_id,
    l.last_active_at,
    p.name,
    p.country_code,
    lp.progress -> 'catalogProgress',
    coalesce((u.raw_app_meta_data ->> 'duru_tester') = 'true', false),
    c.last_campaign_at
  from latest l
  join auth.users u on u.id = l.user_id
  left join public.learner_profiles p on p.user_id = l.user_id
  left join public.learning_progress lp on lp.user_id = l.user_id
  left join campaigns c on c.user_id = l.user_id;
$$;

revoke all on function public.push_campaign_learners() from public, anon, authenticated;
grant execute on function public.push_campaign_learners() to service_role;
grant select, insert on table public.push_campaign_sends to service_role;
