-- 선톡 푸시는 그 사람 기기에 방이 있는 인물만(사용자 결정 2026-11-22). 방이 열렸는지는 기기 저장이라 새로 깔면 사라지는데, 서버는
-- 대화가 있는 한 선톡을 만들어, 방이 없는 기기에서는 알림을 눌러도 「열 수 없음」 안내만 떴다(시험 계정으로 받아 보며 확인).
-- 서버가 기기 속을 볼 수는 없으므로 이렇게 가늠한다: **가장 새 기기를 등록한 뒤 그 인물에게 말한 적이 있으면** 방이 있다.
-- 지난 7일 선톡을 받은 대화 중 기기가 있는 482개 가운데 481개가 이 조건에 든다(2026-11-22) — 대상은 거의 줄지 않는다.
-- 문은 `hasRoom`을 더 돌려주고, 인물을 넘기지 않는 옛 호출에는 false를 준다(옛 함수는 이 칸을 읽지 않는다).

drop function public.companion_proactive_push_gate(uuid);

create function public.companion_proactive_push_gate(p_user_id uuid, p_character_id text default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'mode', (select proactive_push from companion.settings),
    'tester', companion.is_tester(p_user_id),
    'hasDevice', exists (select 1 from public.push_devices d where d.user_id = p_user_id),
    'hasRoom', coalesce((
      select max(m.created_at) from companion.conversations c
      join companion.messages m on m.conversation_id = c.id and m.role = 'user'
      where c.user_id = p_user_id and c.character_id = p_character_id
    ) >= (select max(d.created_at) from public.push_devices d where d.user_id = p_user_id), false)
  )
$$;
revoke all on function public.companion_proactive_push_gate(uuid, text) from public, anon, authenticated;
grant execute on function public.companion_proactive_push_gate(uuid, text) to service_role;

-- ------------------------------------------------------------------ 선톡은 현지 저녁에 (사용자 결정 2026-11-22)
-- 조용한 시간(현지 22~08시) · 선호 시각은 `profiles.timezone` · `last_region`으로 현지 시각을 찾는데, 운영의 3,729명 모두 둘 다 비어
-- 있어 한 번도 걸리지 않았다 — 지난 7일 선톡 1,031통의 29%가 현지 22~08시에 나갔다. 푸시를 켜면 새벽에 울린다.
-- 1. 현지 시각을 학습 프로필의 나라(`learner_profiles.country_code`)로도 찾는다 — 자동 캠페인과 같은 나라 → 대표 시간대 표.
-- 2. 저녁 창 `settings.proactive_evening_from` · `_to`(현지 시, 둘 다 null = 끔 · 기본): 켜면 시각을 직접 정하지 않은 사람에게는
--    그 시각대에만 보내고(`hour`), 현지 시각을 모르는 사람에게는 보내지 않는다(`no_timezone`). 운영은 19 ~ 21로 켠다 — 최근 21일
--    채팅이 가장 많은 시간대(인도네시아 18~22시 · 필리핀 20시 · 인도 21시 · 멕시코 19~22시).

alter table companion.settings
  add column proactive_evening_from smallint check (proactive_evening_from between 0 and 23),
  add column proactive_evening_to smallint check (proactive_evening_to between 0 and 23),
  add constraint settings_proactive_evening_check check (
    (proactive_evening_from is null and proactive_evening_to is null)
    or proactive_evening_from <= proactive_evening_to
  );

-- 나라 → 대표 시간대(`_shared/push-campaign-locale.ts`의 COUNTRY_TIME_ZONES와 같은 표). 모르는 나라는 null.
create function companion.country_timezone(p_country text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case upper(p_country)
    when 'AE' then 'Asia/Dubai'
    when 'AF' then 'Asia/Kabul'
    when 'AL' then 'Europe/Tirane'
    when 'AR' then 'America/Argentina/Buenos_Aires'
    when 'AT' then 'Europe/Vienna'
    when 'AU' then 'Australia/Sydney'
    when 'BD' then 'Asia/Dhaka'
    when 'BR' then 'America/Sao_Paulo'
    when 'CA' then 'America/Toronto'
    when 'CL' then 'America/Santiago'
    when 'CN' then 'Asia/Shanghai'
    when 'CO' then 'America/Bogota'
    when 'DE' then 'Europe/Berlin'
    when 'DZ' then 'Africa/Algiers'
    when 'EG' then 'Africa/Cairo'
    when 'ES' then 'Europe/Madrid'
    when 'FR' then 'Europe/Paris'
    when 'GB' then 'Europe/London'
    when 'HK' then 'Asia/Hong_Kong'
    when 'ID' then 'Asia/Jakarta'
    when 'IN' then 'Asia/Kolkata'
    when 'IT' then 'Europe/Rome'
    when 'JP' then 'Asia/Tokyo'
    when 'KE' then 'Africa/Nairobi'
    when 'KH' then 'Asia/Phnom_Penh'
    when 'KR' then 'Asia/Seoul'
    when 'LK' then 'Asia/Colombo'
    when 'MM' then 'Asia/Yangon'
    when 'MX' then 'America/Mexico_City'
    when 'MY' then 'Asia/Kuala_Lumpur'
    when 'NG' then 'Africa/Lagos'
    when 'NP' then 'Asia/Kathmandu'
    when 'PE' then 'America/Lima'
    when 'PH' then 'Asia/Manila'
    when 'PK' then 'Asia/Karachi'
    when 'RU' then 'Europe/Moscow'
    when 'SA' then 'Asia/Riyadh'
    when 'SG' then 'Asia/Singapore'
    when 'TH' then 'Asia/Bangkok'
    when 'TR' then 'Europe/Istanbul'
    when 'TW' then 'Asia/Taipei'
    when 'US' then 'America/New_York'
    when 'UZ' then 'Asia/Tashkent'
    when 'VN' then 'Asia/Ho_Chi_Minh'
  end
$$;
revoke all on function companion.country_timezone(text) from public;

create or replace function companion.proactive_skip_reason(p_user_id uuid, p_last_message_at timestamptz, p_now timestamptz)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  v_pref text;
  v_hour smallint;
  v_tz text;
  v_region text;
  v_local_hour integer;
  v_day_start timestamptz;
  v_sent integer;
  v_gap interval;
begin
  select * into s from companion.settings;
  select p.proactive_pref, p.proactive_hour, p.timezone, p.last_region
  into v_pref, v_hour, v_tz, v_region
  from companion.profiles p where p.user_id = p_user_id;
  v_pref := coalesce(v_pref, 'daily1');
  if v_pref = 'off' then
    return 'off';
  end if;

  v_tz := coalesce(
    v_tz,
    companion.default_timezone(v_region),
    companion.country_timezone((select lp.country_code from public.learner_profiles lp where lp.user_id = p_user_id))
  );
  -- 저녁 창이 켜져 있으면 현지 시각을 모르는 사람에게는 보내지 않는다(새벽에 울릴 수 있다).
  if v_tz is null and s.proactive_evening_from is not null then
    return 'no_timezone';
  end if;
  if v_tz is not null then
    v_local_hour := extract(hour from p_now at time zone v_tz)::integer;
    if v_local_hour >= 22 or v_local_hour < 8 then
      return 'quiet_hours';
    end if;
    if v_hour is not null and v_local_hour <> v_hour
      and not (v_pref = 'daily2' and v_local_hour = (v_hour + 10) % 24) then
      return 'hour';
    end if;
    -- 시각을 정하지 않은 사람은 저녁 창(켜져 있으면)에만.
    if v_hour is null and s.proactive_evening_from is not null
      and (v_local_hour < s.proactive_evening_from or v_local_hour > s.proactive_evening_to) then
      return 'hour';
    end if;
    v_day_start := date_trunc('day', p_now at time zone v_tz) at time zone v_tz;
  else
    v_day_start := date_trunc('day', p_now at time zone 'UTC') at time zone 'UTC';
  end if;

  select count(*) into v_sent from companion.messages m
  where m.user_id = p_user_id and m.origin = 'proactive' and m.created_at >= v_day_start;
  if v_sent >= least(case v_pref when 'daily2' then 2 else 1 end, s.proactive_daily_cap) then
    return 'daily_cap';
  end if;

  v_gap := case v_pref when 'daily2' then s.proactive_gap_daily2 else s.proactive_gap end;
  if p_last_message_at is null or p_last_message_at > p_now - v_gap then
    return 'gap';
  end if;
  if exists (
    select 1 from companion.messages m
    where m.user_id = p_user_id and m.origin = 'proactive' and m.created_at > p_now - s.proactive_spacing
  ) then
    return 'spacing';
  end if;
  return null;
end;
$$;
