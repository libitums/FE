-- 턴 판정 · 시작 · 끝 함수를 M2 ~ M4까지 합쳐 다시 쓴다.
--   판정(gate): 시험 계정 · 티어 접근 · 연령 · 일시 차단(M3) · 이용 시간(미국 12 ~ 17세 SB 1119, 미성년자 상한) · 멱등 · 고지.
--            피드백 방식(M2)과 장기 메모리 허용(M3, 미국 12 ~ 15세 · 나이 모름은 끔)을 돌려준다.
--   시작(begin): 체험 · 크레딧 예약(M4)과 유저 메시지 저장을 한 트랜잭션에서. 기억 · 화제 상태(M3)를 돌려준다.
--   끝(finish): 피드백(M2) · 친밀도 → 말투 단계(M3, 올라가기만) · 화제 상태 · 반복 위반 제재(M3) · 예약 확정/해제(M4)까지 한 트랜잭션에서.

drop function public.companion_turn_gate(uuid, text, uuid, timestamptz, integer);
drop function public.companion_begin_turn(uuid, text, uuid, text, text, integer);
drop function public.companion_finish_turn(uuid, text, jsonb, jsonb, text[], timestamptz);

create function companion.speech_rank(p_level text)
returns integer language sql immutable as $$
  select case p_level when 'polite' then 0 when 'casual' then 1 when 'slang' then 2 else 0 end
$$;
revoke all on function companion.speech_rank(text) from public;

-- ------------------------------------------------------------------ 판정

create function public.companion_turn_gate(
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

-- ------------------------------------------------------------------ 시작 (예약 + 저장)

create function public.companion_begin_turn(
  p_user_id uuid,
  p_character_id text,
  p_client_message_id uuid,
  p_text text,
  p_input_mode text,
  p_history_limit integer,
  p_region text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  v_tier text;
  v_hold companion.credit_holds;
  v_wallet companion.credit_wallets;
  v_trial boolean := false;
  v_cost integer;
  v_left integer;
  v_take integer;
  v_bucket text;
  v_buckets jsonb := '{}'::jsonb;
  v_used integer;
  v_conversation companion.conversations;
  v_message_id uuid;
  v_speech text;
begin
  if p_text is null or char_length(p_text) not between 1 and 1000 or p_input_mode not in ('text', 'voice')
    or p_history_limit not between 0 and 100 then
    raise exception 'invalid turn' using errcode = '22023';
  end if;
  select * into s from companion.settings;
  v_tier := companion.tier_of(p_user_id, p_now);

  -- 예약(API §6.2). 같은 메시지의 열린 · 확정된 예약이 있으면 그대로 쓴다(멱등). 지갑을 잠가 동시 차감을 막는다.
  v_wallet := companion.lock_wallet(p_user_id);
  select * into v_hold from companion.credit_holds
  where user_id = p_user_id and client_message_id = p_client_message_id and status <> 'released';
  if not found then
    v_cost := s.message_cost;
    if v_tier = 'free' and p_character_id = s.trial_character then
      insert into companion.trial_usage (user_id, character_id) values (p_user_id, p_character_id) on conflict do nothing;
      select used into v_used from companion.trial_usage where user_id = p_user_id and character_id = p_character_id for update;
      if v_used < s.trial_limit then
        update companion.trial_usage set used = used + 1 where user_id = p_user_id and character_id = p_character_id;
        v_trial := true;
        v_cost := 0;
      elsif v_wallet.sub_balance + v_wallet.grant_balance + v_wallet.paid_balance < v_cost then
        return jsonb_build_object('result', 'trial_exhausted', 'detail', jsonb_build_object('characterId', p_character_id));
      end if;
    end if;
    if v_cost > 0 then
      if v_wallet.sub_balance + v_wallet.grant_balance + v_wallet.paid_balance < v_cost then
        return jsonb_build_object('result', 'insufficient_credits', 'detail', jsonb_build_object(
          'required', v_cost, 'balance', v_wallet.sub_balance + v_wallet.grant_balance + v_wallet.paid_balance));
      end if;
      v_left := v_cost;
      foreach v_bucket in array s.bucket_order loop
        exit when v_left = 0;
        execute format('select %I from companion.credit_wallets where user_id = $1', v_bucket || '_balance') into v_take using p_user_id;
        v_take := least(v_take, v_left);
        if v_take > 0 then
          execute format('update companion.credit_wallets set %I = %I - $1, updated_at = now() where user_id = $2',
            v_bucket || '_balance', v_bucket || '_balance') using v_take, p_user_id;
          v_buckets := v_buckets || jsonb_build_object(v_bucket, v_take);
          v_left := v_left - v_take;
        end if;
      end loop;
    end if;
    insert into companion.credit_holds (user_id, client_message_id, character_id, amount, buckets, trial)
    values (p_user_id, p_client_message_id, p_character_id, v_cost, v_buckets, v_trial)
    returning * into v_hold;
    insert into companion.credit_ledger (user_id, delta, bucket, kind, hold_id)
    select p_user_id, -value::integer, key, 'reserve', v_hold.id from jsonb_each_text(v_buckets);
  end if;

  insert into companion.conversations (user_id, character_id)
  values (p_user_id, p_character_id)
  on conflict (user_id, character_id) where kind = 'companion' do nothing;
  select * into v_conversation from companion.conversations
  where user_id = p_user_id and character_id = p_character_id and kind = 'companion';

  insert into companion.relationships (user_id, character_id) values (p_user_id, p_character_id) on conflict do nothing;
  select speech_level into v_speech from companion.relationships where user_id = p_user_id and character_id = p_character_id;

  if nullif(p_region, '') is not null then
    insert into companion.profiles (user_id, last_region) values (p_user_id, p_region)
    on conflict (user_id) do update set last_region = excluded.last_region;
  end if;

  insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, input_mode)
  values (v_conversation.id, p_user_id, 'user', 'pending', p_client_message_id, p_text, p_input_mode)
  on conflict (user_id, client_message_id) where client_message_id is not null do update set
    status = 'pending', text = excluded.text, input_mode = excluded.input_mode, created_at = clock_timestamp()
  returning id into v_message_id;
  delete from companion.messages where reply_to = v_message_id;
  delete from companion.corrections where message_id = v_message_id;

  return jsonb_build_object(
    'result', 'ok',
    'conversationId', v_conversation.id,
    'userMessageId', v_message_id,
    'holdId', v_hold.id,
    'creditsReserved', v_hold.amount,
    'trial', v_hold.trial,
    'speechLevel', v_speech,
    'persona', (select persona from companion.characters where id = p_character_id),
    'summary', v_conversation.rolling_summary,
    'topicState', v_conversation.topic_state,
    'memories', coalesce((
      select jsonb_agg(jsonb_build_object('kind', kind, 'content', content, 'shared', character_id is null) order by created_at desc)
      from (
        select * from companion.memories
        where user_id = p_user_id and deleted_at is null and (character_id = p_character_id or character_id is null)
        order by created_at desc limit s.memory_prompt_limit
      ) mm
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('role', h.role, 'text', h.text, 'segments', h.segments) order by h.created_at)
      from (
        select m.role, m.text, m.segments, m.created_at
        from companion.messages m
        where m.conversation_id = v_conversation.id and m.id <> v_message_id
          and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
        order by m.created_at desc
        limit p_history_limit
      ) h
    ), '[]'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------------ 끝

-- p_feedback: SSE correction 데이터에서 userMessageId를 뺀 것 또는 null. p_intimacy_delta: 메인 호출이 낸 증감(설정 범위로 자른다).
-- 반환: { speechLevel, speechLevelChanged, creditsSpent, balance }.
create function public.companion_finish_turn(
  p_user_message_id uuid,
  p_status text,
  p_assistant jsonb,
  p_moderation jsonb,
  p_notices text[],
  p_now timestamptz,
  p_feedback jsonb,
  p_intimacy_delta integer,
  p_topic_state jsonb,
  p_hold_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  v_user companion.messages;
  v_character text;
  v_day date := (p_now at time zone 'utc')::date;
  v_usage companion.usage_daily;
  v_gap_seconds integer;
  v_rel companion.relationships;
  v_max text;
  v_next text;
  v_changed boolean := false;
  v_spent integer := 0;
  v_state companion.moderation_state;
begin
  if p_status not in ('complete', 'blocked', 'crisis', 'failed') then
    raise exception 'invalid turn status' using errcode = '22023';
  end if;
  select * into s from companion.settings;
  update companion.messages set status = p_status
  where id = p_user_message_id and role = 'user'
  returning * into v_user;
  if not found then
    raise exception 'turn not found' using errcode = 'P0002';
  end if;
  select character_id into v_character from companion.conversations where id = v_user.conversation_id;

  insert into companion.messages (conversation_id, user_id, role, origin, status, notice_kind, reply_to, created_at)
  select v_user.conversation_id, v_user.user_id, 'notice', 'turn', 'complete', kind, v_user.id, clock_timestamp()
  from unnest(coalesce(p_notices, array[]::text[])) as kind;

  if p_assistant is not null then
    insert into companion.messages (id, conversation_id, user_id, role, origin, status, segments, meta, reply_to, credits_spent, created_at)
    values (
      (p_assistant->>'id')::uuid, v_user.conversation_id, v_user.user_id, 'assistant',
      coalesce(p_assistant->>'origin', 'turn'), case when p_status = 'crisis' then 'crisis' else 'complete' end,
      coalesce(p_assistant->'segments', '[]'::jsonb), coalesce(p_assistant->'meta', '{}'::jsonb),
      v_user.id, 0, clock_timestamp()
    );
  end if;

  if p_status = 'complete' and p_feedback is not null then
    insert into companion.corrections (message_id, status, kind, items, better, l1_to_ko)
    values (v_user.id, p_feedback->>'status', p_feedback->>'kind', p_feedback->'items', p_feedback->'better', p_feedback->'l1ToKo')
    on conflict (message_id) do nothing;
  end if;

  insert into companion.moderation_events (user_id, message_id, layer, category, action)
  select v_user.user_id, v_user.id, r.layer, r.category, r.action
  from jsonb_to_recordset(coalesce(p_moderation, '[]'::jsonb)) as r(layer text, category text, action text);

  -- 반복 위반: 입력 검사 차단만 센다(캐릭터 답이 걸린 것은 유저 탓이 아니다). 창 안에서 상한에 닿으면 일시 차단.
  if p_status = 'blocked' and exists (
    select 1 from jsonb_to_recordset(coalesce(p_moderation, '[]'::jsonb)) as r(layer text, action text)
    where r.layer = 'input' and r.action = 'block'
  ) then
    insert into companion.moderation_state (user_id) values (v_user.user_id) on conflict do nothing;
    select * into v_state from companion.moderation_state where user_id = v_user.user_id for update;
    if v_state.window_started_at is null or v_state.window_started_at < p_now - s.strike_window then
      v_state.strikes := 0;
      v_state.window_started_at := p_now;
    end if;
    v_state.strikes := v_state.strikes + 1;
    if v_state.strikes >= s.strike_limit then
      update companion.moderation_state set strikes = 0, window_started_at = null, blocked_until = p_now + s.block_duration
      where user_id = v_user.user_id;
    else
      update companion.moderation_state set strikes = v_state.strikes, window_started_at = v_state.window_started_at
      where user_id = v_user.user_id;
    end if;
  end if;

  if p_notices is not null and cardinality(p_notices) > 0 then
    insert into companion.notice_state (user_id) values (v_user.user_id) on conflict do nothing;
    update companion.notice_state set
      last_ai_disclosure_at = case when 'ai_disclosure' = any (p_notices) then p_now else last_ai_disclosure_at end,
      last_break_reminder_at = case when 'break_reminder' = any (p_notices) then p_now else last_break_reminder_at end,
      minor_notice_at = case when 'minor_notice' = any (p_notices) then p_now else minor_notice_at end
    where user_id = v_user.user_id;
  end if;

  -- 친밀도 → 말투 단계. 정상 턴에서만, 올라가기만(O13 제안), 페르소나의 maxSpeechLevel까지.
  select * into v_rel from companion.relationships where user_id = v_user.user_id and character_id = v_character for update;
  if p_status = 'complete' and v_rel.user_id is not null then
    v_rel.intimacy := greatest(0, v_rel.intimacy + least(greatest(coalesce(p_intimacy_delta, 0), s.intimacy_delta_min), s.intimacy_delta_max));
    v_next := case when v_rel.intimacy >= s.speech_slang_at then 'slang' when v_rel.intimacy >= s.speech_casual_at then 'casual' else 'polite' end;
    select coalesce(persona->>'maxSpeechLevel', 'slang') into v_max from companion.characters where id = v_character;
    if companion.speech_rank(v_next) > companion.speech_rank(v_max) then
      v_next := v_max;
    end if;
    if companion.speech_rank(v_next) > companion.speech_rank(v_rel.speech_level) then
      v_changed := true;
      v_rel.speech_level := v_next;
    end if;
    update companion.relationships set intimacy = v_rel.intimacy, speech_level = v_rel.speech_level, updated_at = now()
    where user_id = v_user.user_id and character_id = v_character;
  end if;

  if p_status = 'complete' and p_topic_state is not null and jsonb_typeof(p_topic_state) = 'object' then
    update companion.conversations set topic_state = p_topic_state where id = v_user.conversation_id;
  end if;

  -- 예약: 답이 간 턴만 확정, 나머지(차단 · 위기 · 실패)는 해제(PRD §3.10 제안).
  if p_hold_id is not null then
    if p_status = 'complete' then
      perform companion.settle_hold(p_hold_id);
      select amount into v_spent from companion.credit_holds where id = p_hold_id;
      if p_assistant is not null then
        update companion.messages set credits_spent = coalesce(v_spent, 0) where id = (p_assistant->>'id')::uuid;
      end if;
    else
      perform companion.release_hold(p_hold_id);
    end if;
  end if;

  if p_status <> 'failed' then
    update companion.conversations set last_message_at = p_now where id = v_user.conversation_id;
    insert into companion.usage_daily (user_id, day) values (v_user.user_id, v_day) on conflict do nothing;
    select * into v_usage from companion.usage_daily where user_id = v_user.user_id and day = v_day for update;
    v_gap_seconds := extract(epoch from p_now - v_usage.last_activity_at)::integer;
    update companion.usage_daily set
      turns = turns + 1,
      active_seconds = active_seconds + case
        when v_gap_seconds is not null and v_gap_seconds <= extract(epoch from companion.usage_gap()) then v_gap_seconds else 0 end,
      continuous_started_at = case
        when v_gap_seconds is null or v_gap_seconds > extract(epoch from companion.usage_gap()) then p_now
        else continuous_started_at end,
      last_activity_at = p_now
    where user_id = v_user.user_id and day = v_day;
  end if;

  return jsonb_build_object(
    'speechLevel', coalesce(v_rel.speech_level, 'polite'),
    'speechLevelChanged', v_changed,
    'creditsSpent', coalesce(v_spent, 0),
    'balance', (select sub_balance + grant_balance + paid_balance from companion.credit_wallets where user_id = v_user.user_id)
  );
end;
$$;

-- 캐릭터 목록: 티어 · 체험 남은 수로 열림 여부를 계산한다(M4).
create or replace function public.companion_list_characters()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  v_tester boolean;
  v_tier text;
  v_wallet jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select * into s from companion.settings;
  select coalesce(raw_app_meta_data->>'duru_tester' = 'true', false) into v_tester from auth.users where id = auth.uid();
  v_tier := companion.tier_of(auth.uid(), now());
  v_wallet := companion.wallet_json(auth.uid(), now());
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'available', x.reason is null,
      'unavailableReason', x.reason,
      'speechLevel', coalesce(r.speech_level, 'polite'),
      'lastMessageAt', to_char(conv.last_message_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ) order by c.sort_order, c.id)
    from companion.characters c
    cross join lateral (select case
      when not c.active or (s.testers_only and not coalesce(v_tester, false)) then 'not_available'
      when v_tier = 'free' and c.id <> s.trial_character then 'not_available'
      when v_tier = 'free' and (v_wallet->>'trialRemaining')::integer = 0 and (v_wallet->>'balance')::integer < s.message_cost then 'trial_exhausted'
      else null end as reason) x
    left join companion.relationships r on r.user_id = auth.uid() and r.character_id = c.id
    left join companion.conversations conv on conv.user_id = auth.uid() and conv.character_id = c.id and conv.kind = 'companion'
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.companion_turn_gate(uuid, text, uuid, timestamptz, text) from public, anon, authenticated;
revoke all on function public.companion_begin_turn(uuid, text, uuid, text, text, integer, text, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_finish_turn(uuid, text, jsonb, jsonb, text[], timestamptz, jsonb, integer, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.companion_turn_gate(uuid, text, uuid, timestamptz, text) to service_role;
grant execute on function public.companion_begin_turn(uuid, text, uuid, text, text, integer, text, timestamptz) to service_role;
grant execute on function public.companion_finish_turn(uuid, text, jsonb, jsonb, text[], timestamptz, jsonb, integer, jsonb, uuid) to service_role;
