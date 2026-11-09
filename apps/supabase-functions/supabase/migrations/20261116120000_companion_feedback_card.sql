-- AI 컴패니언 — 피드백을 고정 카드 한 모양으로(앱 이름표: 고친 문장 / 이유 / 더 나은 표현 / 뜻).
--
--   카드: { status, kind, original, corrected, items, better: {text, explanation} | null, meaning } — 칸은 늘 모두 있다(없는 값은 null · 빈 배열).
--   `companion.corrections`에 `card` 열을 더해 카드 전체를 저장하고, `correction_json`(메시지 목록 · 운영 조회의 `feedback`)이 카드를 돌려준다.
--   옛 행(카드 없음 — kind마다 다른 모양)은 읽을 때 카드로 바꾼다: `original`은 그 유저 메시지 글, `corrected`는 옛 `l1_to_ko.text`
--   (교정 · 더 나은 표현의 옛 행은 고친 문장 전체가 없어 null), `items`는 옛 조각(없으면 빈 배열), `better`는 옛 better의 text · explanation,
--   `meaning`은 옛 l1_to_ko · better의 뜻. 표 · 행은 바꾸지 않는다.
--   `companion_finish_turn`은 같은 인수로 다시 만든다 — 바뀐 곳은 피드백 저장뿐이다.
--
-- 기존 컴패니언 마이그레이션(20261108 ~ 20261115) 뒤에 적용한다.

alter table companion.corrections
  add column if not exists card jsonb check (card is null or jsonb_typeof(card) = 'object');

-- SSE `correction` 데이터와 같은 카드. 카드가 없는 옛 행은 옛 열에서 만든다.
create or replace function companion.correction_json(c companion.corrections)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'userMessageId', c.message_id,
    'status', c.status,
    'kind', c.kind,
    'original', coalesce(
      c.card->>'original',
      (select m.text from companion.messages m where m.id = c.message_id),
      ''
    ),
    'corrected', case when c.card is not null then c.card->'corrected' else to_jsonb(c.l1_to_ko->>'text') end,
    'items', coalesce(
      case when jsonb_typeof(c.card->'items') = 'array' then c.card->'items' end,
      c.items,
      '[]'::jsonb
    ),
    'better', case
      when c.card is not null then case when jsonb_typeof(c.card->'better') = 'object' then c.card->'better' else 'null'::jsonb end
      when c.better is not null then jsonb_build_object('text', c.better->>'text', 'explanation', coalesce(c.better->>'explanation', ''))
      else 'null'::jsonb
    end,
    'meaning', case
      when c.card is not null then c.card->'meaning'
      else to_jsonb(coalesce(c.l1_to_ko->>'meaning', c.better->>'meaning'))
    end
  )
$$;
revoke all on function companion.correction_json(companion.corrections) from public;

-- p_feedback: SSE correction 데이터(카드)에서 userMessageId를 뺀 것 또는 null.
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
