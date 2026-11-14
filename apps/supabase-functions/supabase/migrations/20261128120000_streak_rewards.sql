-- 연속 학습 엽전 보상(2026-11-14 사용자 결정 「좋다 진행」, ADR-0143 — A안).
--
-- 보상표: 연속 3일 +15 · 7일 +40 · 14일 +70 · 30일과 그 뒤 30일마다(60, 90, …) +150. 연속 한 번(run)에 이정표마다 한 번 —
-- 끊겼다가 새로 시작한 연속은 다시 받는다. 보호권(streak shield)은 미정이라 없다.
--
-- 연속 일수 · 시작일은 **서버의 학습한 날 표(learning_days)**로 센다(앱이 보낸 일수를 믿지 않는다). 앱은 기기의 오늘 날짜만
-- 보낸다 — 학습한 날이 기기 날짜로 적히므로 서버가 UTC로 「오늘」을 정하면 시간대에 따라 하루 어긋난다. 그 날짜는
-- record_learning_days와 같은 창(UTC 오늘 ±1일)만 받는다.
--
-- 앱 표(apps/mobile/src/screens/journey-map/streak-rewards.ts)가 아래 기본값과 같음을 앱 unit 테스트(SR-U4)가 본다.

alter table companion.settings
  add column streak_rewards jsonb not null default '{"3": 15, "7": 40, "14": 70}' check (jsonb_typeof(streak_rewards) = 'object'),
  add column streak_repeat_days integer not null default 30 check (streak_repeat_days between 1 and 3650),
  add column streak_repeat_reward integer not null default 150 check (streak_repeat_reward between 0 and 100000);

-- 그날 연속에 붙는 보상(내부). 고정 표에 있으면 그 값, 아니면 반복 주기의 배수일 때 반복 보상, 그 밖은 0.
create function companion.streak_reward(p_settings companion.settings, p_days integer)
returns integer language sql immutable as $$
  select case
    when p_days is null or p_days <= 0 then 0
    when p_settings.streak_rewards ? p_days::text then greatest((p_settings.streak_rewards ->> p_days::text)::integer, 0)
    when p_days % p_settings.streak_repeat_days = 0 then p_settings.streak_repeat_reward
    else 0
  end;
$$;
revoke all on function companion.streak_reward(companion.settings, integer) from public;

create function public.companion_claim_streak_reward(p_today date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  s companion.settings;
  utc_today date := (now() at time zone 'utc')::date;
  v_days integer;
  v_anchor date;
  v_start date;
  v_amount integer;
  v_granted boolean := false;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_today is null or not isfinite(p_today) or p_today not between utc_today - 1 and utc_today + 1 then
    raise exception 'invalid today' using errcode = '22023';
  end if;
  select * into s from companion.settings;
  v_days := public.learning_streak(p_today);
  v_amount := companion.streak_reward(s, v_days);
  if v_amount > 0 then
    -- learning_streak과 같은 기준일 — 오늘 학습했으면 오늘, 아니면 어제(오늘 하면 이어지는 연속).
    v_anchor := case
      when exists (select 1 from public.learning_days where user_id = v_user and day = p_today) then p_today
      else p_today - 1
    end;
    v_start := v_anchor - (v_days - 1);
    v_granted := companion.grant_once(v_user, v_amount, 'streak', v_user::text || ':' || v_start::text || ':' || v_days::text);
  end if;
  return jsonb_build_object(
    'days', v_days,
    'amount', v_amount,
    'granted', v_granted,
    'wallet', companion.wallet_json(v_user, now())
  );
end;
$$;
revoke all on function public.companion_claim_streak_reward(date) from public, anon;
grant execute on function public.companion_claim_streak_reward(date) to authenticated;
