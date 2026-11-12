-- AI 컴패니언 — 추천 답변 칩을 매 턴 자동으로(Zeta처럼 켜고 끄는 스위치, 켜져 있으면 캐릭터 답마다 탭 없이 칩이 뜬다).
--
--   `chat-send`가 판정 결과의 `replySuggestions`(= `companion.profiles.reply_suggestions`, 프로필이 없으면 참)를 보고, 켜져 있으면 답 조각이
--   다 모인 뒤 번역과 동시에 칩을 만들어 SSE `suggestions`로 보내고 `companion_save_suggestions`로 그 캐릭터 메시지에 저장한다.
--   `companion-suggest`는 「다시 만들기」(refresh)와 자동 생성이 실패한 턴의 대체 경로로 남는다.
--
--   바뀌는 것은 함수 둘이다. 둘 다 인수 · 반환 타입이 같아 `create or replace`(권한은 그대로)이고, 다시 실행해도 같은 결과다.
--     `companion_turn_gate` — 20261113의 본문 그대로에 반환 칸 `replySuggestions` 하나를 더한다. 이 칸을 모르는 쪽(`companion_suggest_context` 등)은
--       그대로 돈다.
--     `companion.message_json` — 20261110의 본문 그대로에 `suggestions`(캐릭터 메시지에 저장된 칩 `items`, 없거나 숨김이면 null)를 더한다.
--       메시지 목록(`companion_list_messages`)이 지난 답의 칩을 다시 보여 줄 수 있다.
--
-- 20261118120000_companion_reply_suggestions.sql(`profiles.reply_suggestions` 열) 뒤에 적용한다.

-- ------------------------------------------------------------------ 판정

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
  -- 무료 티어는 체험 캐릭터(덕수쌤)만.
  v_tier := companion.tier_of(p_user_id, p_now);
  if v_tier = 'free' and p_character_id <> s.trial_character then
    return jsonb_build_object('result', 'not_available');
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

revoke all on function public.companion_turn_gate(uuid, text, uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.companion_turn_gate(uuid, text, uuid, timestamptz, text) to service_role;

-- ------------------------------------------------------------------ 메시지 목록의 칩

create or replace function companion.message_json(m companion.messages)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', m.id,
    'role', m.role,
    'origin', m.origin,
    'status', companion.visible_status(m.status, m.created_at, now()),
    'hidden', m.hidden,
    'text', case when m.role = 'user' then m.text end,
    'inputMode', m.input_mode,
    'segments', case when m.hidden then '[]'::jsonb else m.segments end,
    'notice', case when m.notice_kind is null then null else jsonb_build_object('kind', m.notice_kind) end,
    'feedback', case when m.role = 'user' then (
      select companion.correction_json(c) from companion.corrections c where c.message_id = m.id
    ) end,
    -- 추천 답변 칩(20261118 · 20261119). 저장 모양은 `{items, model, createdAt, playground?}`이고 목록에는 `items`만 싣는다.
    'suggestions', case when m.role = 'assistant' and not m.hidden then m.suggestions->'items' end,
    'createdAt', to_char(m.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
$$;
