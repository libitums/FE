-- 학습 진행과 학습한 날(ADR-0035). 진행은 계정에 묶여 기기를 바꿔도 이어지고, 계정을 지우면 함께 지워진다(CASCADE).
--
-- **앱은 표에 직접 닿지 않는다.** RLS를 켜고 정책 없이 두며 앱 역할의 표 권한도 걷는다 — 앱은 아래 RPC 넷만 부른다.

create table public.learning_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- 앱의 진행 스냅숏이다(`apps/mobile/src/app/learning-progress.ts`). 모양은 앱이 읽을 때 검증한다.
  progress jsonb not null check (jsonb_typeof(progress) = 'object' and octet_length(progress::text) <= 16384),
  updated_at timestamptz not null default now()
);

-- 활동 하나라도 끝낸 날. 날짜는 사용자 기기 시간대의 날짜다 — 연속 학습(streak)이 이 표로 센다.
create table public.learning_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

alter table public.learning_progress enable row level security;
alter table public.learning_days enable row level security;
revoke all on table public.learning_progress from anon, authenticated;
revoke all on table public.learning_days from anon, authenticated;

create function public.load_learning_progress()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select progress from public.learning_progress where user_id = auth.uid();
$$;

create function public.save_learning_progress(p_progress jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into public.learning_progress (user_id, progress, updated_at)
  values (auth.uid(), p_progress, now())
  on conflict (user_id) do update set progress = excluded.progress, updated_at = now();
end;
$$;

-- 오늘(기기 날짜)까지 이어진 연속 일수. 오늘 아직 안 했으면 어제까지를 센다 — 오늘 하면 이어진다.
create function public.learning_streak(p_today date)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with anchor as (
    select case
      when exists (select 1 from public.learning_days where user_id = auth.uid() and day = p_today) then p_today
      when exists (select 1 from public.learning_days where user_id = auth.uid() and day = p_today - 1) then p_today - 1
    end as day
  ),
  ranked as (
    select d.day, row_number() over (order by d.day desc) as rn
    from public.learning_days d, anchor a
    where d.user_id = auth.uid() and a.day is not null and d.day <= a.day
  )
  select count(*)::integer from ranked, anchor a where ranked.day = a.day - (ranked.rn - 1)::integer;
$$;

-- 오늘을 학습한 날로 적고 연속 일수를 돌려준다. 기기 날짜가 서버 날짜와 하루 넘게 다르면 적지 않는다
-- (시간대 차이는 받되, 날짜를 조작해 연속을 부풀리지 못하게).
create function public.record_learning_day(p_day date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_day between (now() at time zone 'utc')::date - 1 and (now() at time zone 'utc')::date + 1 then
    insert into public.learning_days (user_id, day) values (auth.uid(), p_day) on conflict do nothing;
  end if;
  return public.learning_streak(p_day);
end;
$$;

revoke all on function public.load_learning_progress() from public, anon;
revoke all on function public.save_learning_progress(jsonb) from public, anon;
revoke all on function public.learning_streak(date) from public, anon;
revoke all on function public.record_learning_day(date) from public, anon;
grant execute on function public.load_learning_progress() to authenticated;
grant execute on function public.save_learning_progress(jsonb) to authenticated;
grant execute on function public.learning_streak(date) to authenticated;
grant execute on function public.record_learning_day(date) to authenticated;
