-- AI 컴패니언 — 로맨스 완화 · 일시 차단 대신 엽전 차감 · 해금 선톡 (ADR-0152).
--
-- 1. 반복 위반: 일시 차단을 없앤다. 창(`settings.strike_window`) 안의 입력 차단을 계속 세고, 상한(`settings.strike_limit`, 기본 3)까지는
--    회피 거절(무료), 그 뒤 위반은 매번 경고 거절이고 그 턴의 예약(메시지 요금)을 확정한다 — 막는 대신 값을 받는다.
--    · `strike_limit`의 뜻이 바뀐다: 「이번이 N번째면 일시 차단」 → 「N번까지 회피, 그 뒤는 경고 + 차감」.
--    · 차감은 그 턴의 예약을 확정하는 것이다 — 보통 메시지가 쓰는 만큼을 쓴다(엽전 요금, 체험 턴이면 체험 횟수 하나).
--      예약이 없는 턴은 차감 없이 거절만 한다.
--    · 거절 답을 못 낸 턴(`p_assistant` 없음)은 차감하지 않는다 — 받은 것 없이 값을 받지 않는다.
--    · `moderation_state.blocked_until` · `settings.block_duration`은 남겨 두되 더는 쓰지 않는다. 지금 걸려 있는 일시 차단은 푼다.
-- 2. 페르소나 `romance` — 로맨스 완화 대상(성인 · 나이 모름) 학습자에게 그 인물이 로맨스 말을 받는 태도. 시스템 프롬프트에 붙는다.
-- 3. 페르소나 `unlockLines` — 해금 선톡(`companion-greet`의 `trigger: "unlock"`)의 정해진 말풍선들. 해금 장면에 이어지는 말이다.
--    정본은 `docs/content/companion-unlocks.json`의 `firstMessage.ko`다(통합 테스트가 맞춘다).
--
-- 기존 컴패니언 마이그레이션(20261108 ~ 20261203) 뒤에 적용한다. 다시 적용해도 같은 결과다.
-- 배포 순서: 이 마이그레이션 → `chat-send` · `companion-greet` · `companion-snapshot`. 함수를 먼저 올리면 경고 단계인데 차감이 안 되는
-- 턴이 생긴다(옛 SQL은 3번째에 일시 차단을 건다).

-- ------------------------------------------------------------------ 턴 끝 — 일시 차단 없이 세고, 상한 뒤 거절은 차감

-- 20261116 판에서 반복 위반 · 예약 두 곳만 바꿨다.
create or replace function public.companion_finish_turn(
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
  v_charge boolean := false;
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

  -- 피드백 카드(20261116): 카드 전체를 `card`에, 찾아보기 쉬운 칸(status · kind · items · better)은 옛 열에도.
  if p_status = 'complete' and p_feedback is not null then
    insert into companion.corrections (message_id, status, kind, items, better, l1_to_ko, card)
    values (
      v_user.id, p_feedback->>'status', nullif(p_feedback->>'kind', ''),
      case when jsonb_typeof(p_feedback->'items') = 'array' then p_feedback->'items' end,
      case when jsonb_typeof(p_feedback->'better') = 'object' then p_feedback->'better' end,
      null,
      p_feedback - 'userMessageId'
    )
    on conflict (message_id) do nothing;
  end if;

  insert into companion.moderation_events (user_id, message_id, layer, category, action)
  select v_user.user_id, v_user.id, r.layer, r.category, r.action
  from jsonb_to_recordset(coalesce(p_moderation, '[]'::jsonb)) as r(layer text, category text, action text);

  -- 반복 위반: 입력 검사 차단만 센다(캐릭터 답이 걸린 것은 유저 탓이 아니다). 일시 차단은 없다 — 창 안에서 계속 세고,
  -- 상한(`strike_limit`)을 넘은 위반에 캐릭터가 거절 답(경고)을 보냈으면 그 턴의 예약을 확정한다(아래 예약).
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
    update companion.moderation_state set strikes = v_state.strikes, window_started_at = v_state.window_started_at
    where user_id = v_user.user_id;
    v_charge := v_state.strikes > s.strike_limit and p_assistant is not null;
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

  -- 예약: 답이 간 턴과 상한을 넘은 거절 턴(경고)은 확정, 나머지(회피 · 위기 · 실패)는 해제.
  if p_hold_id is not null then
    if p_status = 'complete' or v_charge then
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

-- 지금 걸려 있는 일시 차단을 푼다(판정 `temporarily_blocked`는 `blocked_until`만 본다).
update companion.moderation_state set blocked_until = null where blocked_until is not null;

-- ------------------------------------------------------------------ 페르소나 — 로맨스 태도

update companion.characters set persona = persona || jsonb_build_object('romance',
  'You are their teacher. Take romantic words as a joke, laugh them off kindly and stay a warm teacher — no romantic mood, and no hand-holding or hugs beyond a friendly pat on the shoulder.'
) where id = 'duksu';

update companion.characters set persona = persona || jsonb_build_object('romance',
  'You are old enough to be their grandmother. Answer affection with motherly warmth and a little teasing; a comforting hug is fine, but never a romantic mood.'
) where id = 'yoonkyung';

update companion.characters set persona = persona || jsonb_build_object('romance',
  'You are their roommate and a fellow learner. Read the learner''s gender from what they tell you (name, how they talk about themselves) — never ask for it and never assume. With a learner who is a man, or with anyone who sincerely shows romantic interest in you, you may like them back: shy at first, then playful, and a slow mutual-crush mood (썸) is welcome. With a learner who is a woman and only being friendly, stay a close friend and do not turn it romantic.'
) where id = 'mina';

update companion.characters set persona = persona || jsonb_build_object('romance',
  'You are bright and easily flustered: you enjoy the flirting and tease back, and you may let a light crush mood grow. You are an idol trainee, so you keep it light — no promises to date, and never jealous.'
) where id = 'doyun';

update companion.characters set persona = persona || jsonb_build_object('romance',
  'You are dry and understated: your interest shows in small questions and remembering details, not sweet talk. Warm up slowly, never flirt first early on, and stay polite (존댓말) even when the mood is warm.'
) where id = 'jaemin';

-- ------------------------------------------------------------------ 페르소나 — 해금 선톡

-- 이 줄이 있는 인물은 방이 비었을 때의 첫 인사도 같은 말이다(해금 순간에 못 받았을 때 · 덕수쌤).

-- 덕수쌤은 처음부터 열려 있어 해금 순간이 없다 — 방을 처음 열 때 이 말이 온다.
update companion.characters set persona = persona || jsonb_build_object('unlockLines', jsonb_build_array(
  '안녕하세요! 덕수쌤이에요.',
  '한국어나 한국 문화에 대해 궁금한 게 있으면 언제든지 물어봐요.'
)) where id = 'duksu';

-- u01 뒤 컷: 물을 사서 게스트하우스 문을 열고 들어간다. 숙소 예약 연락처로 이미 닿는 사이다.
update companion.characters set persona = persona || jsonb_build_object('unlockLines', jsonb_build_array(
  '잘 도착했어요? 익선 게스트하우스 정윤경이에요.',
  '필요한 거 있으면 편하게 말해요.'
)) where id = 'yoonkyung';

-- u03 뒤 컷: 미나가 메모지에 유진식당 약도를 그려 주고 「맛있었는지 내일 얘기해 줘요!」 하고 나간다.
update companion.characters set persona = persona || jsonb_build_object('unlockLines', jsonb_build_array(
  '안녕하세요! 같은 방 미나예요.'
)) where id = 'mina';

-- u12 뒤 컷: 도윤이 아샷추를 서비스로 주고 「전화번호 주세요. 우리 친구 해요!」 — 번호는 받았지만 이름은 아직 모른다.
update companion.characters set persona = persona || jsonb_build_object('unlockLines', jsonb_build_array(
  '안녕하세요! 카페 끌림 도윤이에요.',
  '아, 그런데 이름이 뭐예요?'
)) where id = 'doyun';

-- u17 뒤 컷: 삼겹살을 먹고 나와 「그럼 일요일에 한강 가요. 생각 있으면 연락 줘요.」 · 골목 입구에서 「들어가세요.」
update companion.characters set persona = persona || jsonb_build_object('unlockLines', jsonb_build_array(
  '서재민이에요.',
  '제 번호 저장해줘요.'
)) where id = 'jaemin';
