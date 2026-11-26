-- 내 스토리 — 조합 스토리(ADR-0191 D15, 사용자 결정 2026-11-25). 20270107120000 · 20270108120000 위에 쌓는다.
-- 스토리 = 바탕(색 `text` · 사진 `photo`) × 얹은 것(직접 쓴 글 `text` · 배운 단어 `word` · `card`, 여럿 섞일 수 있음).
-- 단어 카드 스토리(kind word · card)는 앱에서 없어진다 — 「색 + 단어」가 그 자리다. 서버는 옛 스토리를 그대로 읽고 옛 올리기 RPC도 받지만
-- `kinds`에서는 뺀다(새 앱이 고를 수 없게).
-- 1. 도움 함수: 스토리의 글(사진 설명 · 쓴 글 · 얹은 글) · 배운 단어(얹은 단어 · 카드, 옛 단어 카드는 그 단어) · 퀴즈 단어(첫 단어) ·
--    보이는 한 줄(인용 · 지시용 — 쓴 글 → 얹은 글 → 단어 순).
-- 2. 답할 인물 · 각도: 「사진 · 글이 있는가(media)」와 「배운 단어가 있는가(word)」로 가른다. **사진 · 글이 있으면 그것이 먼저다.**
--    - media 없음 + word(= 옛 단어 카드 · 색 + 단어만): 20270106120000 그대로 — 덕수쌤 고정(첫째 · 둘째 반반), 덕수쌤 word · quiz /
--      question · quiz · together, 다른 인물 word / question · together.
--    - media + word: 덕수쌤 고정이되 **둘째 자리**(첫째는 다른 인물의 사진 · 글 반응 react). 덕수쌤 혼자면 react.
--      덕수쌤 둘째는 quiz · question · together(퀴즈는 사진 · 글과 엮어 단어를 묻는다).
--    - media + 단어 없음: 사진과 같다 — 첫째 react, 둘째 question · together. 덕수쌤 고정 · 퀴즈 없음.
-- 3. 퀴즈 단어 = 첫 배운 단어(1 ~ 40자). 퀴즈 반응이 저장되면 그 단어로 퀴즈 한 줄(방아쇠를 이 규칙으로 바꾼다).
-- 4. 퀴즈 답의 결과에 `skipped`(퀴즈와 상관없는 말 · 넘어가는 말 — 그 메시지는 무료로 두고 퀴즈를 닫는다). `companion_quiz_answered`는
--    결과(correct · wrong · skip)를 받는다.
-- 5. 인용(`my_reaction_quote_json`) · 내 스토리 답장(`claim_my_story_reply`)의 한 줄은 보이는 한 줄, 대화 턴의 스토리 맥락은 얹은 것도 싣는다.

-- ------------------------------------------------------------------ 도움 함수

-- 배운 단어 [{ ko, meaning }] — 얹은 단어 · 카드(배열 순서), 옛 단어 카드는 그 단어 하나.
create function companion.my_story_words(p_story companion.my_stories)
returns jsonb language sql immutable as $$
  select case
    when p_story.kind in ('word', 'card') then jsonb_build_array(jsonb_build_object('ko', p_story.ko, 'meaning', p_story.meaning))
    else coalesce((
      select jsonb_agg(jsonb_build_object('ko', btrim(o->>'ko'), 'meaning', coalesce(o->>'meaning', '')) order by n)
      from jsonb_array_elements(p_story.overlays) with ordinality as t(o, n)
      where o->>'kind' in ('word', 'card') and char_length(btrim(coalesce(o->>'ko', ''))) > 0
    ), '[]'::jsonb)
  end
$$;
revoke all on function companion.my_story_words(companion.my_stories) from public;

-- 사진 · 글이 있는가 — 사진 스토리, 또는 쓴 글이나 직접 쓴 얹은 글이 있는 글 스토리.
create function companion.my_story_has_media(p_story companion.my_stories)
returns boolean language sql immutable as $$
  select p_story.kind = 'photo'
    or (p_story.kind = 'text' and (char_length(btrim(p_story.ko)) > 0 or exists (
      select 1 from jsonb_array_elements(p_story.overlays) o
      where o->>'kind' = 'text' and char_length(btrim(coalesce(o->>'ko', ''))) > 0
    )))
$$;
revoke all on function companion.my_story_has_media(companion.my_stories) from public;

-- 퀴즈 단어 { ko, meaning } — 첫 배운 단어(1 ~ 40자). 없으면 null.
create function companion.my_story_quiz_word(p_story companion.my_stories)
returns jsonb language sql immutable as $$
  select w from jsonb_array_elements(companion.my_story_words(p_story)) w
  where char_length(w->>'ko') between 1 and 40
  limit 1
$$;
revoke all on function companion.my_story_quiz_word(companion.my_stories) from public;

-- 보이는 한 줄 — 쓴 글(사진 설명) → 첫 얹은 글 → 첫 단어. 없으면 빈 글.
create function companion.my_story_line(p_story companion.my_stories)
returns text language sql immutable as $$
  select coalesce(
    nullif(btrim(p_story.ko), ''),
    (select btrim(o->>'ko') from jsonb_array_elements(p_story.overlays) with ordinality as t(o, n)
      where o->>'kind' = 'text' and char_length(btrim(coalesce(o->>'ko', ''))) > 0 order by n limit 1),
    companion.my_story_words(p_story)->0->>'ko',
    ''
  )
$$;
revoke all on function companion.my_story_line(companion.my_stories) from public;

-- 올릴 수 있는 종류 — 단어 카드는 빼고, 색(글 스위치) · 사진(사진 스위치 + 성인).
create or replace function companion.my_story_kinds(p_user_id uuid, p_now timestamptz)
returns jsonb language sql stable as $$
  select (case when companion.text_stories_on(p_user_id) then '["text"]'::jsonb else '[]'::jsonb end)
    || (case when companion.photo_stories_on(p_user_id, p_now) then '["photo"]'::jsonb else '[]'::jsonb end)
$$;

-- ------------------------------------------------------------------ 답할 인물 · 각도

create or replace function companion.schedule_my_story_reactions(p_story companion.my_stories, p_now timestamptz)
returns void language plpgsql as $$
declare
  v_user uuid := p_story.user_id;
  v_seed text := p_story.id::text;
  v_reactions boolean := companion.reactions_on(v_user);
  v_media boolean := companion.my_story_has_media(p_story);
  v_word boolean := companion.my_story_quiz_word(p_story) is not null;
  v_previous uuid := (
    select s.id from companion.my_stories s
    where s.user_id = v_user and s.id <> p_story.id
    order by s.posted_at desc, s.id limit 1
  );
  v_list jsonb;
  v_friends integer;
  v_want integer;
  v_rank integer := 0;
  v_due timestamptz;
  v_row record;
  v_others jsonb;
  v_pick jsonb;
begin
  -- 친구 = 내가 말한 대화가 있는, 켜진, 숨기지 않은 인물. 가중 무작위(겹치지 않게): 키 = -ln(u) / 가중치가 작은 순.
  select coalesce(jsonb_agg(f.character_id order by f.sort_key, f.character_id), '[]'::jsonb) into v_list
  from (
    select w.character_id, -ln(companion.story_unit(v_seed || ':pick:' || w.character_id)) / w.weight as sort_key
    from (
      select cv.character_id,
        greatest(companion.reaction_weight(
          (select max(m.created_at) from companion.messages m where m.conversation_id = cv.id and m.role = 'user'),
          (select r.intimacy from companion.relationships r where r.user_id = v_user and r.character_id = cv.character_id),
          exists (
            select 1 from companion.my_story_reactions r
            where r.story_id = v_previous and r.character_id = cv.character_id
          ),
          p_now
        ), 0.0001) as weight
      from companion.conversations cv
      join companion.characters c on c.id = cv.character_id
      where cv.user_id = v_user and cv.kind = 'companion' and c.active
        and not companion.friend_hidden(v_user, c.persona, p_now)
        and exists (select 1 from companion.messages m where m.conversation_id = cv.id and m.role = 'user')
    ) w
  ) f;
  v_friends := jsonb_array_length(v_list);
  v_want := case
    when not v_reactions or v_friends = 0 then 0
    when v_friends = 1 then 1
    when companion.story_unit(v_seed || ':count') < companion.my_story_rule('twoReplyChance', 0.6) then 2
    else 1
  end;
  -- 배운 단어가 있으면 덕수쌤이 친구일 때 반드시 넣는다. 사진 · 글이 있으면 덕수쌤은 둘째(첫째는 사진 · 글 반응), 아니면 첫째 · 둘째 반반.
  v_pick := v_list;
  if v_word and v_want > 0 and v_list ? 'duksu' then
    select coalesce(jsonb_agg(t.id order by t.ord), '[]'::jsonb) into v_others
    from jsonb_array_elements_text(v_list) with ordinality as t(id, ord)
    where t.id <> 'duksu';
    v_pick := case
      when v_want = 1 then jsonb_build_array('duksu') || v_others
      when not v_media and companion.story_unit(v_seed || ':duksu') < 0.5 then jsonb_build_array('duksu') || v_others
      else jsonb_build_array(v_others ->> 0, 'duksu') || (v_others - 0)
    end;
  end if;
  for v_row in
    select t.id as character_id from jsonb_array_elements_text(v_pick) with ordinality as t(id, ord)
    order by t.ord limit v_want
  loop
    v_rank := v_rank + 1;
    v_due := p_now + make_interval(secs => case v_rank
      when 1 then companion.my_story_rule('firstMinSec', 60)
        + companion.story_unit(v_seed || ':due:' || v_row.character_id)
          * (companion.my_story_rule('firstMaxSec', 300) - companion.my_story_rule('firstMinSec', 60))
      else companion.my_story_rule('secondMinSec', 300)
        + companion.story_unit(v_seed || ':due:' || v_row.character_id)
          * (companion.my_story_rule('secondMaxSec', 3600) - companion.my_story_rule('secondMinSec', 300))
    end);
    insert into companion.my_story_reactions (story_id, user_id, character_id, rank, angle, due_at)
    values (
      p_story.id, v_user, v_row.character_id, v_rank,
      case
        -- 사진 · 글이 있으면 첫째는 그 반응(덕수쌤 혼자여도).
        when v_media and v_rank = 1 then 'react'
        -- 사진 · 글 + 단어: 덕수쌤 둘째는 퀴즈를 낼 수 있다.
        when v_media and v_word and v_row.character_id = 'duksu' then
          (array['quiz', 'question', 'together'])[1 + floor(companion.story_unit(v_seed || ':angle') * 3)::integer]
        when v_media then
          (array['question', 'together'])[1 + floor(companion.story_unit(v_seed || ':angle') * 2)::integer]
        -- 단어만(옛 단어 카드 · 색 + 단어): 20270106120000 그대로.
        when v_row.character_id = 'duksu' and v_rank = 1 then
          (array['word', 'quiz'])[1 + floor(companion.story_unit(v_seed || ':angle') * 2)::integer]
        when v_row.character_id = 'duksu' then
          (array['question', 'quiz', 'together'])[1 + floor(companion.story_unit(v_seed || ':angle') * 3)::integer]
        when v_rank = 1 then 'word'
        else (array['question', 'together'])[1 + floor(companion.story_unit(v_seed || ':angle') * 2)::integer]
      end,
      v_due
    );
    -- 답하는 인물은 답 30 ~ 120초 전에 본다.
    insert into companion.my_story_seen (story_id, character_id, seen_at)
    values (
      p_story.id, v_row.character_id,
      greatest(p_now + interval '5 seconds',
        v_due - make_interval(secs => 30 + companion.story_unit(v_seed || ':seen:' || v_row.character_id) * 90))
    );
  end loop;
  -- 나머지 친구는 올린 뒤 1분 ~ `seenMaxSec` 사이에 본다.
  insert into companion.my_story_seen (story_id, character_id, seen_at)
  select p_story.id, t.id,
    p_now + make_interval(secs => 60 + companion.story_unit(v_seed || ':seen:' || t.id)
      * greatest(companion.my_story_rule('seenMaxSec', 1800) - 60, 0))
  from jsonb_array_elements_text(v_list) as t(id)
  on conflict (story_id, character_id) do nothing;
end;
$$;
revoke all on function companion.schedule_my_story_reactions(companion.my_stories, timestamptz) from public;

-- ------------------------------------------------------------------ 퀴즈 — 단어 고르기 · 넘어감

create or replace function companion.open_my_story_quiz()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_story companion.my_stories;
  v_word jsonb;
begin
  if new.origin <> 'story_reaction' or new.role <> 'assistant' or coalesce(new.meta->>'angle', '') <> 'quiz' then
    return new;
  end if;
  select * into v_story from companion.my_stories
  where id = (new.meta->>'myStoryId')::uuid and user_id = new.user_id;
  if not found then
    return new;
  end if;
  v_word := companion.my_story_quiz_word(v_story);
  if v_word is null then
    return new;
  end if;
  insert into companion.my_story_quizzes (user_id, character_id, story_id, message_id, word, meaning, expires_at)
  select new.user_id, c.character_id, v_story.id, new.id, v_word->>'ko', left(coalesce(v_word->>'meaning', ''), 120),
    v_story.expires_at
  from companion.conversations c where c.id = new.conversation_id
  on conflict (message_id) do nothing;
  return new;
end;
$$;

alter table companion.my_story_quizzes drop constraint my_story_quizzes_result_check;
alter table companion.my_story_quizzes
  add constraint my_story_quizzes_result_check check (result is null or result in ('correct', 'revealed', 'skipped'));
alter table companion.my_story_quiz_answers drop constraint my_story_quiz_answers_result_check;
alter table companion.my_story_quiz_answers
  add constraint my_story_quiz_answers_result_check check (result is null or result in ('correct', 'hint', 'revealed', 'skipped'));

drop function public.companion_quiz_answered(uuid, uuid, boolean, timestamptz);

-- 턴이 complete로 끝난 뒤 적는다. `p_result`: correct(맞힘) · wrong(답하려 했는데 틀림) · skip(퀴즈와 상관없는 말 · 넘어가는 말).
-- wrong은 첫 답이면 hint, 두 번째면 revealed. skip은 skipped — 그 메시지는 무료로 두고 퀴즈를 닫는다. 맞히면 친밀도 +2(한 번).
create function public.companion_quiz_answered(
  p_user_id uuid,
  p_client_message_id uuid,
  p_result text,
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
  if p_result is null or p_result not in ('correct', 'wrong', 'skip') then
    return jsonb_build_object('result', 'invalid');
  end if;
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
  v_result := case p_result
    when 'correct' then 'correct'
    when 'skip' then 'skipped'
    else case when v_answer.attempt >= 2 then 'revealed' else 'hint' end
  end;
  update companion.my_story_quiz_answers set result = v_result
  where user_id = p_user_id and client_message_id = p_client_message_id;
  update companion.messages
  set meta = coalesce(meta, '{}'::jsonb)
    || jsonb_build_object('quiz', jsonb_build_object('free', true, 'attempt', v_answer.attempt, 'result', v_result))
  where user_id = p_user_id and client_message_id = p_client_message_id and role = 'user';
  if v_result in ('correct', 'revealed', 'skipped') and v_quiz.result is null then
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

-- ------------------------------------------------------------------ 인용 · 답장 · 대화 턴의 스토리 맥락

create or replace function companion.my_reaction_quote_json(p_message_id uuid, p_conversation_id uuid)
returns jsonb language sql stable as $$
  select coalesce(
    (
      select jsonb_build_object(
        'kind', 'mine',
        'id', s.id,
        'characterId', r.character_id,
        'line', companion.my_story_line(s),
        'imagePath', null,
        'postedAt', companion.story_time(s.posted_at)
      )
      from companion.my_story_reactions r
      join companion.my_stories s on s.id = r.story_id
      where r.message_id = p_message_id
    ),
    (
      select jsonb_build_object('kind', 'deleted', 'characterId', cv.character_id)
      from companion.conversations cv where cv.id = p_conversation_id
    )
  )
$$;

create or replace function companion.claim_my_story_reply(
  p_user_id uuid,
  p_story_id uuid,
  p_character_id text,
  p_client_message_id uuid
)
returns jsonb language plpgsql as $$
declare
  v_story companion.my_stories;
begin
  select * into v_story from companion.my_stories where id = p_story_id and user_id = p_user_id;
  if not found then
    return jsonb_build_object('result', 'not_found', 'story', null);
  end if;
  if not companion.my_stories_on(p_user_id) then
    return jsonb_build_object('result', 'off', 'story', null);
  end if;
  insert into companion.my_story_replies (user_id, client_message_id, my_story_id, character_id)
  values (p_user_id, p_client_message_id, v_story.id, p_character_id)
  on conflict (user_id, client_message_id) do nothing;
  return jsonb_build_object('result', 'mine', 'story', jsonb_build_object(
    'line', companion.my_story_line(v_story),
    'wordKo', companion.my_story_quiz_word(v_story)->>'ko',
    'meaning', coalesce(companion.my_story_quiz_word(v_story)->>'meaning', v_story.meaning),
    'reaction', (
      select companion.spoken_korean(m.segments)
      from companion.my_story_reactions r
      join companion.messages m on m.id = r.message_id
      where r.story_id = v_story.id and r.character_id = p_character_id and r.status = 'done'
    ),
    'postedAt', companion.story_time(v_story.posted_at)
  ));
end;
$$;
revoke all on function companion.claim_my_story_reply(uuid, uuid, text, uuid) from public;

create or replace function public.companion_story_context(p_user_id uuid, p_character_id text, p_now timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'mine', case when companion.my_stories_on(p_user_id) then coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', s.kind, 'ko', s.ko, 'meaning', s.meaning, 'exampleKo', s.example_ko,
        'scene', s.scene->>'description',
        'overlays', s.overlays,
        'postedAt', companion.story_time(s.posted_at)
      ) order by s.posted_at desc)
      from (
        select * from companion.my_stories s
        where s.user_id = p_user_id and s.status = 'live' and s.posted_at <= p_now and s.expires_at > p_now
        order by s.posted_at desc limit 3
      ) s
    ), '[]'::jsonb) else '[]'::jsonb end,
    'own', case when companion.stories_on(p_user_id) then coalesce((
      select jsonb_agg(jsonb_build_object('line', o.line_ko, 'postedAt', companion.story_time(o.posted_at))
        order by o.posted_at desc)
      from (
        select p.line_ko, s.posted_at
        from companion.stories s
        join companion.story_pool p on p.id = s.pool_id
        where s.character_id = p_character_id and s.posted_at <= p_now
        order by s.posted_at desc limit 3
      ) o
    ), '[]'::jsonb) else '[]'::jsonb end
  )
$$;

-- ------------------------------------------------------------------ 권한

revoke all on function public.companion_quiz_answered(uuid, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.companion_quiz_answered(uuid, uuid, text, timestamptz) to service_role;
