-- 내 스토리 반응 — 덕수쌤 퀴즈의 무료 답 · 판정(ADR-0191 D14, 사용자 결정 2026-11-25 · 앱 담당 요청). 음성 선물은 하지 않는다.
-- 1. 퀴즈 반응(origin `story_reaction`, meta.angle `quiz`)이 그 인물 방에 저장되면 퀴즈 한 줄(`my_story_quizzes`)이 생긴다(방아쇠).
--    답 단어 = 그 스토리의 단어, 기한 = 그 스토리가 친구에게 보이는 끝(올린 뒤 24시간).
-- 2. 퀴즈 뒤 그 방에서 보내는 메시지가 답이다. 첫 답은 무료, 오답이면 다음 한 통도 무료(최대 둘).
--    `companion_claim_quiz_answer`가 관문 **전에** 그 메시지에 금액 0 예약을 둔다 — 친구 스토리 첫 답장 무료(20261228120000)와 같은 장치.
--    같은 메시지의 재전송은 같은 결과. 턴이 실패해 예약이 풀리면 그 답은 세지 않는다(다음 메시지가 같은 차례를 다시 받는다).
-- 3. 판정(답에 그 단어 · 활용형이 들어 있는가)은 함수가 하고, 턴이 끝나면(complete) `companion_quiz_answered`가 적는다:
--    내 메시지 meta.quiz { free, attempt, result: correct | hint | revealed }. 맞히면 덕수쌤 친밀도 +2(턴의 증감과 별도, 한 퀴즈에 한 번).
--    맞히거나 두 번째 답이면 퀴즈는 끝난다(벌칙 없음).
-- 4. 메시지 목록(`message_json`)에 공개 meta: 반응은 { angle, myStoryId, quiz: { freeAnswer } }(지금 무료로 답할 수 있는가),
--    내 답은 { quiz: { free, attempt, result } }. 그 밖의 meta(모델 · 사용량 등)는 내보내지 않는다.

-- ------------------------------------------------------------------ 표

create table companion.my_story_quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id text not null references companion.characters (id),
  story_id uuid references companion.my_stories (id) on delete set null,
  -- 퀴즈를 낸 반응 메시지.
  message_id uuid not null unique references companion.messages (id) on delete cascade,
  word text not null check (char_length(word) between 1 and 40),
  meaning text not null default '' check (char_length(meaning) <= 120),
  expires_at timestamptz not null,
  -- 끝난 퀴즈: correct(맞힘) · revealed(두 번 틀려 정답을 알려 줌). 열린 퀴즈는 null.
  result text check (result is null or result in ('correct', 'revealed')),
  rewarded boolean not null default false,
  created_at timestamptz not null default now()
);
create index my_story_quizzes_open_idx on companion.my_story_quizzes (user_id, character_id, created_at desc)
  where result is null;

create table companion.my_story_quiz_answers (
  user_id uuid not null references auth.users (id) on delete cascade,
  client_message_id uuid not null,
  quiz_id uuid not null references companion.my_story_quizzes (id) on delete cascade,
  attempt integer not null check (attempt in (1, 2)),
  -- 턴이 끝나야 적힌다. null이면 아직이거나 턴이 실패한 답.
  result text check (result is null or result in ('correct', 'hint', 'revealed')),
  created_at timestamptz not null default now(),
  primary key (user_id, client_message_id)
);
create index my_story_quiz_answers_quiz_idx on companion.my_story_quiz_answers (quiz_id);

alter table companion.my_story_quizzes enable row level security;
alter table companion.my_story_quiz_answers enable row level security;
revoke all on table companion.my_story_quizzes, companion.my_story_quiz_answers from public, anon, authenticated;

-- ------------------------------------------------------------------ 퀴즈가 생기는 곳 — 퀴즈 반응이 저장될 때

create function companion.open_my_story_quiz()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_story companion.my_stories;
begin
  if new.origin <> 'story_reaction' or new.role <> 'assistant' or coalesce(new.meta->>'angle', '') <> 'quiz' then
    return new;
  end if;
  select * into v_story from companion.my_stories
  where id = (new.meta->>'myStoryId')::uuid and user_id = new.user_id and kind in ('word', 'card');
  if not found or char_length(btrim(v_story.ko)) = 0 then
    return new;
  end if;
  insert into companion.my_story_quizzes (user_id, character_id, story_id, message_id, word, meaning, expires_at)
  select new.user_id, c.character_id, v_story.id, new.id, btrim(v_story.ko), left(v_story.meaning, 120), v_story.expires_at
  from companion.conversations c where c.id = new.conversation_id
  on conflict (message_id) do nothing;
  return new;
end;
$$;
create trigger messages_open_my_story_quiz
  after insert on companion.messages
  for each row when (new.origin = 'story_reaction')
  execute function companion.open_my_story_quiz();

-- ------------------------------------------------------------------ 도움 함수

-- 끝난(턴이 complete로 적힌) 답 수.
create function companion.quiz_answers_done(p_quiz_id uuid)
returns integer language sql stable as $$
  select count(*)::integer from companion.my_story_quiz_answers a where a.quiz_id = p_quiz_id and a.result is not null
$$;
revoke all on function companion.quiz_answers_done(uuid) from public;

-- 지금 무료로 답할 수 있는가 — 끝나지 않았고 기한 안이고 끝난 답이 둘 미만.
create function companion.quiz_open(p_quiz companion.my_story_quizzes, p_now timestamptz)
returns boolean language sql stable as $$
  select p_quiz.result is null and p_quiz.expires_at > p_now and companion.quiz_answers_done(p_quiz.id) < 2
$$;
revoke all on function companion.quiz_open(companion.my_story_quizzes, timestamptz) from public;

-- 앱에 보이는 meta — 공개 칸만.
create function companion.message_public_meta(m companion.messages)
returns jsonb language sql stable as $$
  select nullif(jsonb_strip_nulls(jsonb_build_object(
    'angle', case when m.origin = 'story_reaction' then m.meta->'angle' end,
    'myStoryId', case when m.origin = 'story_reaction' then m.meta->'myStoryId' end,
    'quiz', case
      when m.origin = 'story_reaction' then (
        select jsonb_build_object('freeAnswer', companion.quiz_open(q, now()))
        from companion.my_story_quizzes q where q.message_id = m.id
      )
      when m.role = 'user' then m.meta->'quiz'
    end
  )), '{}'::jsonb)
$$;
revoke all on function companion.message_public_meta(companion.messages) from public;

-- 기록의 `meta`(공개 칸) — 정의를 통째로 다시 쓰지 않고 createdAt 앞에 한 줄 넣는다(20261228120000과 같은 방식).
do $$
declare
  v_def text := pg_get_functiondef('companion.message_json(companion.messages)'::regprocedure);
  v_line text := '''createdAt'', to_char(m.created_at';
  v_new text := '''meta'', companion.message_public_meta(m),'
    || E'\n    ''createdAt'', to_char(m.created_at';
begin
  if position('message_public_meta' in v_def) > 0 then
    return;
  end if;
  if position(v_line in v_def) = 0 then
    raise exception 'message_json: createdAt line not found';
  end if;
  execute replace(v_def, v_line, v_new);
end $$;

-- ------------------------------------------------------------------ 서버 — 답 판정 전(무료 예약) · 턴 뒤(적기)

-- 이 메시지가 열린 퀴즈의 답인가 — 그렇다면 금액 0 예약을 두고 { result: 'quiz', quizId, attempt, word, meaning }.
-- 아니면 { result: 'none' }. 같은 메시지의 재전송은 같은 차례(예약이 풀렸으면 다시 둔다). 이미 값이 걸린 예약이 있는 메시지는 무료로 바꾸지 않는다.
create function public.companion_claim_quiz_answer(
  p_user_id uuid,
  p_character_id text,
  p_client_message_id uuid,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quiz companion.my_story_quizzes;
  v_answer companion.my_story_quiz_answers;
  v_attempt integer;
begin
  perform companion.lock_wallet(p_user_id);
  select * into v_answer from companion.my_story_quiz_answers
  where user_id = p_user_id and client_message_id = p_client_message_id;
  if found then
    select * into v_quiz from companion.my_story_quizzes where id = v_answer.quiz_id;
    if v_answer.result is null and not companion.message_hold_exists(p_user_id, p_client_message_id) then
      if not companion.quiz_open(v_quiz, p_now) then
        return jsonb_build_object('result', 'none');
      end if;
      insert into companion.credit_holds (user_id, client_message_id, character_id, amount, buckets, trial)
      values (p_user_id, p_client_message_id, v_quiz.character_id, 0, '{}'::jsonb, false);
    end if;
    return jsonb_build_object(
      'result', 'quiz', 'quizId', v_quiz.id, 'attempt', v_answer.attempt, 'word', v_quiz.word, 'meaning', v_quiz.meaning
    );
  end if;
  if companion.message_hold_exists(p_user_id, p_client_message_id) then
    return jsonb_build_object('result', 'none');
  end if;
  -- 그 방의 가장 최근 열린 퀴즈.
  select q.* into v_quiz from companion.my_story_quizzes q
  where q.user_id = p_user_id and q.character_id = p_character_id and q.result is null and q.expires_at > p_now
  order by q.created_at desc limit 1;
  if not found or not companion.quiz_open(v_quiz, p_now) then
    return jsonb_build_object('result', 'none');
  end if;
  v_attempt := companion.quiz_answers_done(v_quiz.id) + 1;
  -- 같은 차례를 받은, 아직 끝나지 않은 다른 메시지가 있으면(동시 전송) 그 메시지가 차례를 가진다 — 예약이 살아 있을 때만.
  if exists (
    select 1 from companion.my_story_quiz_answers a
    where a.quiz_id = v_quiz.id and a.result is null and a.attempt = v_attempt
      and companion.message_hold_exists(p_user_id, a.client_message_id)
  ) then
    return jsonb_build_object('result', 'none');
  end if;
  insert into companion.my_story_quiz_answers (user_id, client_message_id, quiz_id, attempt)
  values (p_user_id, p_client_message_id, v_quiz.id, v_attempt);
  insert into companion.credit_holds (user_id, client_message_id, character_id, amount, buckets, trial)
  values (p_user_id, p_client_message_id, v_quiz.character_id, 0, '{}'::jsonb, false);
  return jsonb_build_object(
    'result', 'quiz', 'quizId', v_quiz.id, 'attempt', v_attempt, 'word', v_quiz.word, 'meaning', v_quiz.meaning
  );
end;
$$;

-- 턴이 complete로 끝난 뒤 적는다: 답의 결과 · 내 메시지 meta.quiz · 끝(맞힘 · 두 번째 답) · 맞히면 친밀도 +2(한 번).
-- 판정은 함수가 했다 — 두 번째 답이 틀리면 hint가 아니라 revealed다. 이미 적힌 답은 그대로(재전송).
create function public.companion_quiz_answered(
  p_user_id uuid,
  p_client_message_id uuid,
  p_correct boolean,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answer companion.my_story_quiz_answers;
  v_quiz companion.my_story_quizzes;
  v_result text;
begin
  perform companion.lock_wallet(p_user_id);
  select * into v_answer from companion.my_story_quiz_answers
  where user_id = p_user_id and client_message_id = p_client_message_id for update;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;
  if v_answer.result is not null then
    return jsonb_build_object('result', v_answer.result, 'attempt', v_answer.attempt);
  end if;
  select * into v_quiz from companion.my_story_quizzes where id = v_answer.quiz_id for update;
  v_result := case when p_correct then 'correct' when v_answer.attempt >= 2 then 'revealed' else 'hint' end;
  update companion.my_story_quiz_answers set result = v_result
  where user_id = p_user_id and client_message_id = p_client_message_id;
  update companion.messages
  set meta = coalesce(meta, '{}'::jsonb)
    || jsonb_build_object('quiz', jsonb_build_object('free', true, 'attempt', v_answer.attempt, 'result', v_result))
  where user_id = p_user_id and client_message_id = p_client_message_id and role = 'user';
  if v_result in ('correct', 'revealed') and v_quiz.result is null then
    update companion.my_story_quizzes set result = v_result where id = v_quiz.id;
  end if;
  if v_result = 'correct' and not v_quiz.rewarded then
    update companion.my_story_quizzes set rewarded = true where id = v_quiz.id;
    update companion.relationships set intimacy = intimacy + 2, updated_at = p_now
    where user_id = p_user_id and character_id = v_quiz.character_id;
  end if;
  return jsonb_build_object('result', v_result, 'attempt', v_answer.attempt);
end;
$$;

-- ------------------------------------------------------------------ 권한

revoke all on function public.companion_claim_quiz_answer(uuid, text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_quiz_answered(uuid, uuid, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.companion_claim_quiz_answer(uuid, text, uuid, timestamptz) to service_role;
grant execute on function public.companion_quiz_answered(uuid, uuid, boolean, timestamptz) to service_role;
