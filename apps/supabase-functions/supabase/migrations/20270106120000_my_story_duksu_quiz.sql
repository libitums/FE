-- 내 스토리 반응 — 퀴즈는 덕수쌤만, 단어 · 카드 스토리엔 덕수쌤이 늘 답한다(ADR-0191 D5 개정, 사용자 결정 2026-11-25).
-- 다른 인물이 퀴즈를 내면 페르소나가 깨진다(선생님이 아닌 친구가 시험을 냄). 그래서:
-- 1. 단어 · 카드 스토리에서 덕수쌤이 친구(내가 말한 대화가 있는 · 켜진 · 숨기지 않은 인물)면 답하는 인물에 반드시 넣는다.
--    답이 둘이면 첫째 · 둘째 자리를 반반(해시)으로, 하나면 덕수쌤 혼자. 답하는 수(1 · 2명 규칙)는 그대로다.
-- 2. 각도: 퀴즈는 덕수쌤만 받을 수 있다(덕수쌤이 늘 퀴즈인 것은 아니다).
--    덕수쌤 — 첫째면 `word` · `quiz` 중 하나, 둘째면 `question` · `quiz` · `together` 중 하나.
--    다른 인물 — 첫째면 `word`, 둘째면 `question` · `together` 중 하나.
-- 3. 사진 스토리는 그대로(첫째 `react`, 둘째 `question` · `together`, 덕수쌤 고정 없음).
-- 덕수쌤과 말한 적 없는 학습자는 덕수쌤이 친구가 아니므로 넣지 않는다 — 반응은 그 인물의 대화방에 들어가기 때문이다.
-- 함수 하나만 바꾼다(표 · 각도 check는 그대로 — `quiz`는 이미 허용).

create or replace function companion.schedule_my_story_reactions(p_story companion.my_stories, p_now timestamptz)
returns void language plpgsql as $$
declare
  v_user uuid := p_story.user_id;
  v_seed text := p_story.id::text;
  v_reactions boolean := companion.reactions_on(v_user);
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
  -- 단어 · 카드 스토리: 덕수쌤이 친구면 답하는 인물에 반드시 넣는다 — 하나면 혼자, 둘이면 첫째 · 둘째를 반반으로.
  v_pick := v_list;
  if p_story.kind <> 'photo' and v_want > 0 and v_list ? 'duksu' then
    select coalesce(jsonb_agg(t.id order by t.ord), '[]'::jsonb) into v_others
    from jsonb_array_elements_text(v_list) with ordinality as t(id, ord)
    where t.id <> 'duksu';
    v_pick := case
      when v_want = 1 or companion.story_unit(v_seed || ':duksu') < 0.5 then jsonb_build_array('duksu') || v_others
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
        when p_story.kind = 'photo' and v_rank = 1 then 'react'
        when p_story.kind = 'photo' then
          (array['question', 'together'])[1 + floor(companion.story_unit(v_seed || ':angle') * 2)::integer]
        -- 퀴즈는 덕수쌤만(선생님 페르소나). 덕수쌤은 자리의 보기에 `quiz`가 하나 더 붙는다.
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
