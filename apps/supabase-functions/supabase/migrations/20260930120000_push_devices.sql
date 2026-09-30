-- 서버 푸시의 기기 토큰(ADR-0034). 한 기기(토큰) = 한 행이고, 그 기기에 마지막으로 로그인한 사용자에게
-- 묶인다. 계정을 지우면 행도 지워진다(CASCADE — 삭제 함수가 이 표를 몰라도 된다, ADR-0032 D2).
--
-- **앱은 표를 직접 읽거나 쓰지 않는다.** RLS를 켜고 정책을 두지 않는다 — 앱은 아래 함수 둘만 부르고,
-- 발송 함수(`send-push`)는 service role로 읽는다.

create table public.push_devices (
  token text primary key check (token ~ '^[0-9a-f]{64,200}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  environment text not null check (environment in ('sandbox', 'production')),
  -- 앱이 로그인한 채 켜질 때마다 갱신한다. 다시 돌아오기 알림이 이 값으로 대상을 고른다.
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index push_devices_user_id_idx on public.push_devices (user_id);
create index push_devices_last_active_at_idx on public.push_devices (last_active_at);

alter table public.push_devices enable row level security;

-- 로그인한 사용자가 이 기기의 토큰을 자기 것으로 등록한다. 같은 토큰이 다른 사용자에게 묶여 있으면
-- (한 기기에서 계정을 바꿨으면) 새 사용자로 옮긴다 — 알림은 지금 로그인한 사람에게만 간다.
create function public.register_push_device(p_token text, p_environment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into public.push_devices (token, user_id, environment, last_active_at)
  values (p_token, auth.uid(), p_environment, now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        environment = excluded.environment,
        last_active_at = now();
end;
$$;

-- 로그아웃할 때 이 기기의 토큰을 뗀다. 자기 행만 지운다.
create function public.unregister_push_device(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_devices
  where token = p_token and user_id = auth.uid();
$$;

-- 다시 돌아오기 대상이다 — 사용자의 **가장 최근** 활동(기기 여럿이면 그 최댓값)이 정확히 p_days일 전
-- 하루 안에 든 사용자의 기기 전부. 하루 한 번 부르면 한 사용자가 같은 p_days에 두 번 걸리지 않는다.
create function public.reengagement_devices(p_days integer)
returns table (token text, environment text)
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select user_id, max(last_active_at) as last_active_at
    from public.push_devices
    group by user_id
  )
  select d.token, d.environment
  from public.push_devices d
  join latest l on l.user_id = d.user_id
  where l.last_active_at <= now() - make_interval(days => p_days)
    and l.last_active_at > now() - make_interval(days => p_days + 1);
$$;

revoke all on function public.register_push_device(text, text) from public, anon;
revoke all on function public.unregister_push_device(text) from public, anon;
revoke all on function public.reengagement_devices(integer) from public, anon, authenticated;
grant execute on function public.register_push_device(text, text) to authenticated;
grant execute on function public.unregister_push_device(text) to authenticated;
grant execute on function public.reengagement_devices(integer) to service_role;
