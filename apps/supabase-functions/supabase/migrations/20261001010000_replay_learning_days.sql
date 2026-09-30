-- 오프라인에서 끝낸 원래 날짜를 저장합니다. 기존 앱의 단일 날짜 RPC는 그대로 둡니다.
create function public.record_learning_days(p_days date[], p_today date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  utc_today date := (now() at time zone 'utc')::date;
  first_day date;
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select (created_at at time zone 'utc')::date - 1 into first_day
    from auth.users where id = current_user_id;
  if first_day is null then
    raise exception 'account creation date unavailable' using errcode = '22023';
  end if;
  if p_today is null or not isfinite(p_today)
    or p_today not between utc_today - 1 and utc_today + 1
    or p_days is null or cardinality(p_days) not between 1 and 64
    or exists (
      select 1 from unnest(p_days) as requested(day)
      where day is null or not isfinite(day) or day < first_day or day > utc_today + 1
    ) then
    raise exception 'invalid learning days' using errcode = '22023';
  end if;
  insert into public.learning_days (user_id, day)
    select current_user_id, day from (select distinct unnest(p_days) as day) as requested
    on conflict do nothing;
  -- 오래된 날짜를 재전송해도 오늘 기준으로 계산합니다.
  return public.learning_streak(p_today);
end;
$$;
revoke all on function public.record_learning_days(date[], date) from public, anon;
grant execute on function public.record_learning_days(date[], date) to authenticated;
