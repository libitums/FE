-- AI 컴패니언 — 대화가 비었을 때 캐릭터가 먼저 거는 첫 인사(Edge Function `companion-greet`, Zeta의 첫 메시지처럼).
--
--   앱이 캐릭터 화면을 열 때 메시지가 하나도 없으면(새 대화 · 대화 초기화 뒤) `companion-greet`를 부르고, 함수가 답 모델로 인사를 만들어
--   출력 검사(연령과 상관없이 — 유저 말 없이 나가는 글이라 선톡과 같다) · L1 번역 · 칩(스위치 켬)을 붙여 저장한다. 무료다(차감 · 체험 없음).
--     · `messages.origin`에 'greeting'을 더한다.
--     · 페르소나 `greetingLines` — 생성 실패 · 출력 검사 차단 때 쓰는 정해진 인사(말투 단계마다). 없는 칸은 코드의 기본 줄.
--     · `companion_greet_context(p_user_id, p_character_id, p_now)` — `companion_turn_gate`와 같은 판정(시험 계정 · 티어 · 연령 · 일시 차단 ·
--       이용 시간 · 진행 중인 턴)을 먼저 돌리고, 통과하면 페르소나 · 말투 단계 · 학습자 언어 · 연령대 · 칩 설정 · 기억 · 메시지가 이미 있는지.
--     · `companion_save_greeting(…)` — 대화가 없으면 만들고 그 행을 잠근 뒤, 메시지가 하나도 없을 때만 인사를 저장한다(`{saved, messageId?}`).
--       두 번 불려도(앱 재시도 · 두 화면) 인사는 하나다.
--
-- 기존 컴패니언 마이그레이션(20261108 ~ 20261121110000) 뒤에 적용한다. 다시 적용해도 같은 결과다.

alter table companion.messages drop constraint if exists messages_origin_check;
alter table companion.messages
  add constraint messages_origin_check check (origin in ('turn', 'proactive', 'crisis', 'greeting'));

-- ------------------------------------------------------------------ 페르소나 — 정해진 첫 인사

-- 말투 단계(말투 상한까지)마다 한 줄. 첫 만남은 보통 존댓말이다(관계가 새로 생기면 polite). 대사만 — `*행동*`은 모델이 만들 때만.
update companion.characters set persona = persona || jsonb_build_object('greetingLines', jsonb_build_object(
  'polite', '어서 와요! 나는 덕수쌤이에요. 오늘부터 한국어 같이 재미있게 해 봐요. 이름이 뭐예요?'
)) where id = 'duksu';

update companion.characters set persona = persona || jsonb_build_object('greetingLines', jsonb_build_object(
  'polite', '어서 와요. 먼 길 오느라 고생했어요. 밥은 먹었어요?'
)) where id = 'yoonkyung';

update companion.characters set persona = persona || jsonb_build_object('greetingLines', jsonb_build_object(
  'polite', '안녕하세요! 저는 미나예요. 저도 한국어 배우러 왔어요. 어디에서 왔어요?',
  'casual', '안녕! 나는 미나야. 나도 한국어 배우러 왔어. 어디에서 왔어?',
  'slang', '안녕! 나 미나야. 나도 한국어 배우러 왔거든. 어디서 왔어?'
)) where id = 'mina';

update companion.characters set persona = persona || jsonb_build_object('greetingLines', jsonb_build_object(
  'polite', '어, 안녕하세요! 이 골목 처음이죠? 저는 도윤이에요. 커피 좋아해요?',
  'casual', '어, 안녕! 이 골목 처음이지? 나는 도윤이야. 커피 좋아해?'
)) where id = 'doyun';

update companion.characters set persona = persona || jsonb_build_object('greetingLines', jsonb_build_object(
  'polite', '안녕하세요. 서재민이라고 해요. 여기 자주 오세요?'
)) where id = 'jaemin';

-- ------------------------------------------------------------------ 첫 인사 (service_role)

create or replace function public.companion_greet_context(p_user_id uuid, p_character_id text, p_now timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  v_gate jsonb;
  v_conversation uuid;
begin
  -- chat-send와 같은 판정. 지역은 이번 요청에 없으니 마지막으로 받은 지역으로 본다(멱등 검사는 새 id라 걸리지 않는다).
  v_gate := public.companion_turn_gate(p_user_id, p_character_id, gen_random_uuid(), p_now, null);
  if v_gate->>'result' <> 'ok' then
    return jsonb_build_object('result', v_gate->>'result');
  end if;
  select * into s from companion.settings;
  select id into v_conversation from companion.conversations
  where user_id = p_user_id and character_id = p_character_id and kind = 'companion';

  return jsonb_build_object(
    'result', 'ok',
    'ageBand', v_gate->'ageBand',
    'l1', v_gate->'l1',
    'feedbackMode', v_gate->'feedbackMode',
    'replySuggestions', coalesce((select p.reply_suggestions from companion.profiles p where p.user_id = p_user_id), true),
    'persona', (select ch.persona from companion.characters ch where ch.id = p_character_id),
    'speechLevel', coalesce((
      select r.speech_level from companion.relationships r where r.user_id = p_user_id and r.character_id = p_character_id
    ), 'polite'),
    'hasMessages', v_conversation is not null and exists (
      select 1 from companion.messages m where m.conversation_id = v_conversation
    ),
    -- 대화 초기화는 이 캐릭터 기억을 지우지만 공유 기억은 남을 수 있다 — 인사에 그대로 쓴다.
    'memories', coalesce((
      select jsonb_agg(content order by created_at desc) from (
        select content, created_at from companion.memories
        where user_id = p_user_id and deleted_at is null and (character_id = p_character_id or character_id is null)
        order by created_at desc limit s.memory_prompt_limit
      ) mm
    ), '[]'::jsonb)
  );
end;
$$;

-- p_segments: 말풍선 배열(번역 포함). p_meta: 저장 meta. p_suggestions: 칩(`{items, model, createdAt, playground?}`) 또는 null.
-- 대화에 메시지가 이미 있으면 저장하지 않는다 — `{saved: false}`.
create or replace function public.companion_save_greeting(
  p_user_id uuid,
  p_character_id text,
  p_message_id uuid,
  p_segments jsonb,
  p_meta jsonb,
  p_suggestions jsonb,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation uuid;
begin
  if p_segments is null or jsonb_typeof(p_segments) <> 'array' or jsonb_array_length(p_segments) = 0
    or (p_suggestions is not null and (
      jsonb_typeof(p_suggestions) <> 'object' or jsonb_typeof(p_suggestions->'items') is distinct from 'array'
    )) then
    raise exception 'invalid greeting' using errcode = '22023';
  end if;
  if not exists (select 1 from companion.characters where id = p_character_id) then
    raise exception 'character not found' using errcode = 'P0002';
  end if;

  insert into companion.conversations (user_id, character_id)
  values (p_user_id, p_character_id)
  on conflict (user_id, character_id) where kind = 'companion' do nothing;
  -- 같은 대화의 인사 저장끼리 줄을 세운다 — 먼저 저장한 쪽만 남는다.
  select id into v_conversation from companion.conversations
  where user_id = p_user_id and character_id = p_character_id and kind = 'companion'
  for update;
  if exists (select 1 from companion.messages m where m.conversation_id = v_conversation) then
    return jsonb_build_object('saved', false);
  end if;

  insert into companion.relationships (user_id, character_id) values (p_user_id, p_character_id) on conflict do nothing;
  insert into companion.messages (id, conversation_id, user_id, role, origin, status, segments, meta, suggestions, created_at)
  values (
    p_message_id, v_conversation, p_user_id, 'assistant', 'greeting', 'complete',
    p_segments, coalesce(p_meta, '{}'::jsonb), p_suggestions, clock_timestamp()
  );
  update companion.conversations set last_message_at = p_now where id = v_conversation;
  return jsonb_build_object('saved', true, 'messageId', p_message_id);
end;
$$;

revoke all on function public.companion_greet_context(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_save_greeting(uuid, text, uuid, jsonb, jsonb, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.companion_greet_context(uuid, text, timestamptz) to service_role;
grant execute on function public.companion_save_greeting(uuid, text, uuid, jsonb, jsonb, jsonb, timestamptz) to service_role;
