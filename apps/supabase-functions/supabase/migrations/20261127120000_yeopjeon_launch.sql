-- 엽전 출시(2026-11-13, ADR-0140 — 사용자 결정): 앱의 엽전을 서버 지갑(credit_wallets)으로 일원화하는 첫 단계.
--
-- 1. 단가: 메시지 한 턴 = 3 엽전(앱 표기와 1:1, 2026-11-14 사용자 결정). 음성 15 · 사진 35는 서버에 아직 없어 앱 표기만.
-- 2. 무료 티어도 엽전이 있으면 체험 캐릭터 밖의 캐릭터와 대화한다(잔액 < 한 턴 값이면 insufficient_credits). 덕수쌤 체험 수는 그대로.
-- 3. 학습 보상 · 출시 보너스 지급 `companion_claim_coins()`(앱이 부름, 로그인 필수, 사용자별 멱등):
--    · 진행 스냅숏(catalogProgress ∪ coinUnits)의 끝낸 유닛마다 learning_reward(5) — 에피소드 표지(intro) · 막간(INT) 제외,
--      (사용자, 에피소드, 유닛)마다 한 번. 엽전 제도 전에 깬 유닛도 소급된다. 새 레슨을 깨고 다시 부르면 그 유닛만 더해진다.
--    · 출시 보너스 launch_bonus(100) — 사용자마다 한 번.
--    돌려주는 값: 이번 호출에서 더한 학습 보상 · 보너스와 지갑(잔액 포함).

alter table companion.settings
  add column learning_reward integer not null default 5 check (learning_reward between 0 and 1000),
  add column launch_bonus integer not null default 100 check (launch_bonus between 0 and 100000);
update companion.settings set message_cost = 3;

create or replace function public.companion_turn_gate(
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
  s companion.settings;
  v_tester boolean;
  v_profile companion.profiles;
  v_band text;
  v_age integer;
  v_region text;
  v_us_minor boolean;
  v_tier text;
  v_existing record;
  v_conversation uuid;
  v_usage record;
  v_notice record;
  v_blocked timestamptz;
  v_balance integer;
begin
  select * into s from companion.settings;
  select coalesce(raw_app_meta_data->>'duru_tester' = 'true', false) into v_tester from auth.users where id = p_user_id;
  if v_tester is null then
    return jsonb_build_object('result', 'invalid_session');
  end if;
  if s.testers_only and not v_tester then
    return jsonb_build_object('result', 'not_available');
  end if;
  if not exists (select 1 from companion.characters where id = p_character_id) then
    return jsonb_build_object('result', 'character_not_found');
  end if;
  if not exists (select 1 from companion.characters where id = p_character_id and active) then
    return jsonb_build_object('result', 'not_available');
  end if;
  -- 무료 티어: 체험 캐릭터(덕수쌤)는 체험 수 안에서 무료, 그 밖의 캐릭터는 엽전(크레딧)이 한 턴 값 이상이면 대화한다
  -- (2026-11-13 엽전 출시 — 전에는 not_available). 실제 차감은 companion_begin_turn이 한다.
  v_tier := companion.tier_of(p_user_id, p_now);
  if v_tier = 'free' and p_character_id <> s.trial_character then
    select coalesce(sum(sub_balance + grant_balance + paid_balance), 0) into v_balance
    from companion.credit_wallets where user_id = p_user_id;
    if v_balance < s.message_cost then
      return jsonb_build_object('result', 'insufficient_credits', 'detail', jsonb_build_object(
        'required', s.message_cost, 'balance', v_balance));
    end if;
  end if;

  select * into v_profile from companion.profiles where user_id = p_user_id;
  v_band := companion.age_band(v_profile.birth_year, p_now);
  v_age := extract(year from p_now)::integer - v_profile.birth_year;
  -- [제안] 보호자 동의 경로가 없으니 13세 미만은 쓰지 못한다(PRD §3.12 · O12).
  if v_band = 'minor' and v_age < 13 then
    return jsonb_build_object('result', 'age_restricted', 'detail', jsonb_build_object('reason', 'guardian_consent_required'));
  end if;

  select blocked_until into v_blocked from companion.moderation_state where user_id = p_user_id;
  if v_blocked is not null and v_blocked > p_now then
    return jsonb_build_object('result', 'temporarily_blocked', 'detail', jsonb_build_object(
      'until', to_char(v_blocked at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')));
  end if;

  -- 미국 판정: 이번 요청의 기기 지역 또는 마지막으로 받은 지역(O12 — 스토어 · 결제 국가 신호는 아직 없다).
  v_region := coalesce(nullif(p_region, ''), v_profile.last_region);
  v_us_minor := v_band <> 'adult' and coalesce(v_region, '') = 'US';
  select * into v_usage from companion.usage_daily
  where user_id = p_user_id and day = (p_now at time zone 'utc')::date;
  if v_us_minor and found then
    if v_usage.active_seconds >= s.us_minor_daily_seconds then
      return jsonb_build_object('result', 'usage_time_limit', 'detail', jsonb_build_object('limit', 'daily',
        'resetsAt', to_char(((p_now at time zone 'utc')::date + 1)::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')));
    end if;
    if v_usage.last_activity_at >= p_now - companion.usage_gap()
      and v_usage.continuous_started_at <= p_now - make_interval(secs => s.us_minor_continuous_seconds) then
      return jsonb_build_object('result', 'usage_time_limit', 'detail', jsonb_build_object('limit', 'continuous',
        'resetsAt', to_char((v_usage.last_activity_at + companion.usage_gap()) at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')));
    end if;
  end if;
  if v_band <> 'adult' and s.minor_daily_limit_seconds is not null and v_usage.active_seconds >= s.minor_daily_limit_seconds then
    return jsonb_build_object('result', 'usage_time_limit', 'detail', jsonb_build_object('limit', 'daily',
      'resetsAt', to_char(((p_now at time zone 'utc')::date + 1)::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')));
  end if;

  select id, status, created_at into v_existing from companion.messages
  where user_id = p_user_id and client_message_id = p_client_message_id;
  if found then
    if v_existing.status = 'pending' and v_existing.created_at >= p_now - companion.pending_timeout() then
      return jsonb_build_object('result', 'turn_in_progress');
    end if;
    if v_existing.status in ('complete', 'blocked', 'crisis') then
      return jsonb_build_object('result', 'duplicate_message', 'detail', jsonb_build_object(
        'messageId', v_existing.id, 'messageStatus', v_existing.status));
    end if;
  end if;

  select id into v_conversation from companion.conversations
  where user_id = p_user_id and character_id = p_character_id and kind = 'companion';
  if v_conversation is not null and exists (
    select 1 from companion.messages
    where conversation_id = v_conversation and role = 'user' and status = 'pending'
      and created_at >= p_now - companion.pending_timeout()
      and client_message_id is distinct from p_client_message_id
  ) then
    return jsonb_build_object('result', 'turn_in_progress');
  end if;

  select * into v_notice from companion.notice_state where user_id = p_user_id;
  select continuous_started_at, last_activity_at into v_usage from companion.usage_daily
  where user_id = p_user_id order by day desc limit 1;

  return jsonb_build_object(
    'result', 'ok',
    'ageBand', v_band,
    'l1', v_profile.l1,
    'region', v_region,
    'tier', v_tier,
    -- 기본값은 O5 — 정해지기 전까지 분리형(답변은 교정하지 않고 피드백만 따로).
    'feedbackMode', coalesce(v_profile.feedback_mode, 'separate'),
    -- 미국 12 ~ 15세와 미국 나이 모름은 장기 메모리를 끈다(SB 1119 기본값 · 나이 모름은 미성년자 기본값).
    'memoryEnabled', not (coalesce(v_region, '') = 'US' and (v_band = 'unknown' or (v_band = 'minor' and v_age <= 15))),
    -- 추천 답변 칩 스위치(20261118). 켜져 있으면 chat-send가 답마다 칩을 만든다. 프로필이 없으면 기본값(참).
    'replySuggestions', coalesce(v_profile.reply_suggestions, true),
    'notices', to_jsonb(array_remove(array[
      case when v_notice.last_ai_disclosure_at is null
        or v_notice.last_ai_disclosure_at < p_now - interval '3 hours' then 'ai_disclosure' end,
      case when v_band <> 'adult' and v_notice.minor_notice_at is null then 'minor_notice' end,
      case when v_usage.last_activity_at >= p_now - companion.usage_gap()
        and v_usage.continuous_started_at <= p_now - interval '3 hours'
        and (v_notice.last_break_reminder_at is null or v_notice.last_break_reminder_at < p_now - interval '3 hours')
        then 'break_reminder' end
    ], null))
  );
end;
$$;

-- 한 번만 지급(내부). (reason, ref_id)가 이미 있으면 false. 원장의 유니크 색인이 사용자 사이 경합도 막는다.
create function companion.grant_once(p_user_id uuid, p_amount integer, p_reason text, p_ref_id text)
returns boolean language plpgsql as $$
begin
  if p_amount <= 0 or exists (
    select 1 from companion.credit_ledger where kind = 'grant' and reason = p_reason and ref_id = p_ref_id
  ) then
    return false;
  end if;
  perform companion.lock_wallet(p_user_id);
  update companion.credit_wallets set grant_balance = grant_balance + p_amount, updated_at = now() where user_id = p_user_id;
  insert into companion.credit_ledger (user_id, delta, bucket, kind, reason, ref_id)
  values (p_user_id, p_amount, 'grant', 'grant', p_reason, p_ref_id);
  return true;
end;
$$;
revoke all on function companion.grant_once(uuid, integer, text, text) from public;

create function public.companion_claim_coins()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  s companion.settings;
  v_progress jsonb;
  v_unit record;
  v_learning integer := 0;
  v_bonus integer := 0;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select * into s from companion.settings;
  select progress into v_progress from public.learning_progress where user_id = v_user;
  for v_unit in
    select distinct src.episode, src.unit from (
      select e.key as episode, u.value as unit
      from jsonb_each(coalesce(v_progress -> 'catalogProgress', '{}'::jsonb)) e
      cross join lateral jsonb_array_elements_text(case when jsonb_typeof(e.value) = 'array' then e.value else '[]'::jsonb end) u
      union all
      select e.key, u.value
      from jsonb_each(coalesce(v_progress -> 'coinUnits', '{}'::jsonb)) e
      cross join lateral jsonb_array_elements_text(case when jsonb_typeof(e.value) = 'array' then e.value else '[]'::jsonb end) u
    ) src
    where src.unit not in ('intro', 'INT') and char_length(src.episode) between 1 and 64 and char_length(src.unit) between 1 and 16
  loop
    if companion.grant_once(v_user, s.learning_reward, 'learning', v_user::text || ':' || v_unit.episode || ':' || v_unit.unit) then
      v_learning := v_learning + s.learning_reward;
    end if;
  end loop;
  if companion.grant_once(v_user, s.launch_bonus, 'launch_bonus', v_user::text || ':2026-11') then
    v_bonus := s.launch_bonus;
  end if;
  return jsonb_build_object('learning', v_learning, 'bonus', v_bonus, 'wallet', companion.wallet_json(v_user, now()));
end;
$$;
revoke all on function public.companion_claim_coins() from public, anon;
grant execute on function public.companion_claim_coins() to authenticated;
