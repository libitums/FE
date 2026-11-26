-- 내 스토리 반응 — 역할 기반 반응(ADR-0191 D16, 사용자 결정 2026-11-25). 20270109120000 위에 쌓는다.
-- 서버가 무작위 각도(같이 하자 · 질문 …)를 정하던 것을 **역할**로 바꾼다. 말하는 방식(공감 · 질문 · 응원 · 제안 · 단어 · 퀴즈 · 예문)은
-- 스토리를 본 모델이 고르고 `@state`의 `mode`로 알린다 — 반응 메시지 meta의 `angle`은 실제로 쓴 방식, `role`은 서버가 정한 역할.
-- 1. 역할(`my_story_reactions.angle` 칸에 둔다):
--    - `react`  첫째 친구 — 공감 · 감탄, 궁금하면 질문 하나까지(「우와 맛있어 보여요! 여긴 어디예요?」).
--    - `follow` 둘째 친구 — 첫째 친구가 실제로 단 말을 보고 겹치지 않게(질문 · 공감 · 응원 · 제안 — 제안은 자연스러울 때만).
--    - `word` · `quiz` 덕수쌤 단어 담당(배운 단어가 있을 때 반드시 한 번) — 단어를 넣어 반응 · 단어와 엮은 질문 · 짧은 예문 · 퀴즈.
--      `quiz`는 이번에 퀴즈를 권한다는 뜻(`quizChance`, 기본 0.5). 분위기가 무거우면 모델이 퀴즈 대신 응원한다.
--    자리: 사진 · 글 + 단어면 덕수쌤은 둘째, 색 + 단어만이면 첫째 · 둘째 반반(20270109120000 그대로).
-- 2. claim은 같은 스토리에 먼저 단 다른 친구의 반응(`friendReply` { characterId, name, text })을 함께 준다 — 둘째가 겹치지 않게.
-- 3. 저장(`companion_finish_story_reaction`): meta.angle = 모델이 알린 방식(아는 값일 때만, 퀴즈는 덕수쌤 단어 담당만), 아니면 역할.
--    meta.role = 역할. 퀴즈 줄(방아쇠)은 meta.angle이 quiz일 때만 생기므로 덕수쌤이 퀴즈를 피하면 무료 답도 없다.

alter table companion.my_story_reactions drop constraint my_story_reactions_angle_check;
alter table companion.my_story_reactions
  add constraint my_story_reactions_angle_check check (angle in ('word', 'question', 'quiz', 'together', 'react', 'follow'));

-- ------------------------------------------------------------------ 역할 배정

-- 20270109120000의 정의에서 각도 배정만 역할로 바꿨다(인물 고르기 · 자리 · 시각 · Seen은 그대로).
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
        -- 배운 단어가 있으면 덕수쌤은 단어 담당 — 이번에 퀴즈를 권하는지(`quizChance`, 기본 0.5)만 서버가 정한다.
        when v_word and v_row.character_id = 'duksu' then
          case when companion.story_unit(v_seed || ':quiz') < companion.my_story_rule('quizChance', 0.5) then 'quiz' else 'word' end
        when v_rank = 1 then 'react'
        else 'follow'
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

-- ------------------------------------------------------------------ claim — 먼저 단 친구의 반응

create function companion.my_story_friend_reply(p_story_id uuid, p_reaction_id uuid)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'characterId', r.character_id,
    'name', coalesce(c.persona->>'name', r.character_id),
    'text', companion.spoken_korean(m.segments)
  )
  from companion.my_story_reactions r
  join companion.messages m on m.id = r.message_id
  join companion.characters c on c.id = r.character_id
  where r.story_id = p_story_id and r.id <> p_reaction_id and r.status = 'done' and not m.hidden
  order by m.created_at
  limit 1
$$;
revoke all on function companion.my_story_friend_reply(uuid, uuid) from public;

-- claim이 돌려주는 줄에 `friendReply`를 더한다 — 정의를 통째로 다시 쓰지 않고 한 곳만 바꾼다(20270104130000과 같은 방식).
do $$
declare
  v_def text := pg_get_functiondef('public.companion_claim_story_reactions(timestamptz,integer)'::regprocedure);
  v_field text := '''lang'', v_row.lang';
begin
  if position('my_story_friend_reply' in v_def) > 0 then
    return;
  end if;
  if position(v_field in v_def) = 0 then
    raise exception 'companion_claim_story_reactions: lang field not found';
  end if;
  execute replace(v_def, v_field,
    v_field || ', ''friendReply'', companion.my_story_friend_reply(v_row.story_id, v_row.id)');
end $$;

-- ------------------------------------------------------------------ 저장 — 실제로 쓴 방식

-- 모델이 알린 방식(`p_meta.mode`)이 아는 값이면 그것, 아니면 역할. 퀴즈는 덕수쌤 단어 담당(word · quiz 역할)만.
create function companion.reaction_mode(p_meta jsonb, p_role text)
returns text language sql immutable as $$
  select case
    when coalesce(p_meta->>'mode', '') not in ('empathy', 'question', 'cheer', 'suggest', 'word', 'quiz', 'example') then p_role
    when p_meta->>'mode' = 'quiz' and p_role not in ('word', 'quiz') then p_role
    else p_meta->>'mode'
  end
$$;
revoke all on function companion.reaction_mode(jsonb, text) from public;

do $$
declare
  v_def text := pg_get_functiondef(
    'public.companion_finish_story_reaction(uuid,boolean,timestamptz,uuid,jsonb,jsonb,jsonb)'::regprocedure
  );
  v_old text := 'jsonb_build_object(''myStoryId'', v_row.story_id, ''angle'', v_row.angle)';
  v_new text := 'jsonb_build_object(''myStoryId'', v_row.story_id, ''angle'', companion.reaction_mode(p_meta, v_row.angle), ''role'', v_row.angle)';
begin
  if position('reaction_mode' in v_def) > 0 then
    return;
  end if;
  if position(v_old in v_def) = 0 then
    raise exception 'companion_finish_story_reaction: meta expression not found';
  end if;
  execute replace(v_def, v_old, v_new);
end $$;
