-- 내 스토리 — 글 스토리 `text` · 올릴 수 있는 종류 목록 `kinds`(ADR-0191 D13, 사용자 결정 2026-11-25 · 앱 담당 요청).
-- 1. 스위치 `my_story_text`(off 기본 · testers · on) — `my_stories`가 켜진 사람에게만 뜻이 있다. 나이 제한은 없다(글 검수가 연령대 기준으로 본다).
-- 2. `my_stories`: kind `text` · `background`(orange · green · blue · purple — 글 스토리만). 글 스토리는 단어 참조 · 사진이 없고,
--    `ko`(사용자가 쓴 글 그대로, 0 ~ 200자)나 `overlays` 중 하나는 있어야 한다. 뜻(meaning)은 비워 둔다 — 반응의 번역이 대신한다.
--    교정(draft)은 없다. 올리기 요청 안에서 글 검수만 — 막히면 `text_blocked`, 위기 신호면 저장하지 않고 `crisis`(앱의 위기 안내).
-- 3. 서버 역할 RPC: 문(`companion_my_text_gate` — 스위치 · 창 · 24시간 상한 · 하루 검수 시도, 같은 client id면 그 스토리) ·
--    저장(`companion_save_my_text_story` — 창 · 상한을 다시 본다). 창 · 24시간 상한은 다른 스토리와 합쳐서 센다(같은 표).
-- 4. 반응 각도는 사진과 같다 — 첫째 `react`, 둘째 `question` · `together`. 덕수쌤 고정 · 퀴즈는 단어 · 카드만(20270106120000).
--    반응 claim은 글 스토리의 얹은 글(`overlays`)도 돌려준다.
-- 5. `companion_my_stories` 응답에 `kinds` — 지금 이 사람이 올릴 수 있는 종류: word · card는 늘, photo는 사진 스위치 + 성인, text는 글 스위치.
-- 6. `my_story_json`에 `background`.

alter table companion.settings
  add column if not exists my_story_text text not null default 'off' check (my_story_text in ('off', 'testers', 'on'));

-- ------------------------------------------------------------------ 표

alter table companion.my_stories
  drop constraint my_stories_kind_check,
  drop constraint my_stories_word_check,
  drop constraint my_stories_ko_check,
  drop constraint my_stories_roman_check,
  drop constraint my_stories_meaning_check;
alter table companion.my_stories
  add column background text check (background is null or background in ('orange', 'green', 'blue', 'purple')),
  add constraint my_stories_kind_check check (kind in ('word', 'card', 'photo', 'text')),
  add constraint my_stories_word_check check (
    (kind in ('photo', 'text') and word is null) or (kind not in ('photo', 'text') and word is not null
      and coalesce(jsonb_typeof(word->'episodeId') = 'string' and jsonb_typeof(word->'ref') = 'string', false)
      and char_length(word->>'episodeId') between 1 and 80 and char_length(word->>'ref') between 1 and 120)
  ),
  add constraint my_stories_ko_check check (
    char_length(ko) between case when kind = 'text' then 0 else 1 end
      and case kind when 'photo' then 120 when 'text' then 200 else 40 end
  ),
  add constraint my_stories_roman_check check (char_length(roman) <= case when kind in ('photo', 'text') then 400 else 80 end),
  add constraint my_stories_meaning_check check (
    char_length(meaning) between case when kind in ('photo', 'text') then 0 else 1 end
      and case when kind in ('photo', 'text') then 300 else 120 end
  ),
  add constraint my_stories_text_check check (
    (kind = 'text') = (background is not null)
    and (kind <> 'text' or char_length(btrim(ko)) > 0 or jsonb_array_length(overlays) > 0)
  );

-- ------------------------------------------------------------------ 도움 함수

create function companion.text_stories_on(p_user_id uuid)
returns boolean language sql stable as $$
  select companion.my_stories_on(p_user_id)
    and companion.switch_on((select my_story_text from companion.settings), p_user_id)
$$;
revoke all on function companion.text_stories_on(uuid) from public;

-- 지금 이 사람이 올릴 수 있는 종류(앱의 「+」 메뉴).
create function companion.my_story_kinds(p_user_id uuid, p_now timestamptz)
returns jsonb language sql stable as $$
  select jsonb_build_array('word', 'card')
    || case when companion.photo_stories_on(p_user_id, p_now) then '["photo"]'::jsonb else '[]'::jsonb end
    || case when companion.text_stories_on(p_user_id) then '["text"]'::jsonb else '[]'::jsonb end
$$;
revoke all on function companion.my_story_kinds(uuid, timestamptz) from public;

-- 앱이 받는 스토리 한 건(20270104130000) + `background`(글 스토리).
create or replace function companion.my_story_json(p_story companion.my_stories)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', p_story.id,
    'kind', p_story.kind,
    'status', p_story.status,
    'word', p_story.word,
    'ko', p_story.ko,
    'roman', p_story.roman,
    'meaning', p_story.meaning,
    'example', case when p_story.example_ko is null then null
      else jsonb_build_object('ko', p_story.example_ko, 'meaning', p_story.example_meaning) end,
    'imagePath', p_story.image_path,
    'background', p_story.background,
    'overlays', p_story.overlays,
    'lineOriginal', p_story.line_original,
    'edits', p_story.edits,
    'postedAt', companion.story_time(p_story.posted_at),
    'expiresAt', companion.story_time(p_story.expires_at),
    'reactions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'characterId', r.character_id,
        'messageId', m.id,
        'text', companion.spoken_korean(m.segments),
        'meaning', companion.reaction_meaning(m.segments),
        'at', companion.story_time(m.created_at)
      ) order by m.created_at, r.character_id)
      from companion.my_story_reactions r
      join companion.messages m on m.id = r.message_id
      where r.story_id = p_story.id and r.status = 'done' and not m.hidden
    ), '[]'::jsonb),
    'seenBy', case when (select my_story_seen from companion.settings) then coalesce((
      select jsonb_agg(jsonb_build_object('characterId', v.character_id, 'at', companion.story_time(v.seen_at))
        order by v.seen_at, v.character_id)
      from companion.my_story_seen v
      where v.story_id = p_story.id and v.seen_at <= now()
    ), '[]'::jsonb) else '[]'::jsonb end
  )
$$;

-- ------------------------------------------------------------------ 앱 — 목록(+ kinds)

create or replace function public.companion_my_stories(p_tz_offset_min integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_keep boolean;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  v_keep := coalesce((select p.keep_my_stories from companion.profiles p where p.user_id = v_user), true);
  if not companion.my_stories_on(v_user) then
    return jsonb_build_object('enabled', false, 'keep', v_keep, 'stories', '[]'::jsonb, 'window', null, 'kinds', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'enabled', true,
    'keep', v_keep,
    'kinds', companion.my_story_kinds(v_user, now()),
    'stories', coalesce((
      select jsonb_agg(companion.my_story_json(s) order by s.posted_at desc, s.id)
      from (
        select * from companion.my_stories s
        where s.user_id = v_user and (v_keep or s.expires_at > now())
        order by s.posted_at desc, s.id
        limit 100
      ) s
    ), '[]'::jsonb),
    -- 지금 창 · 이미 썼는가 · 다음 창이 열리는 때 — 앱의 「+」 상태.
    'window', companion.my_story_window(v_user, p_tz_offset_min, now())
  );
end;
$$;

-- ------------------------------------------------------------------ 서버 — 글 스토리 문 · 저장

-- 글 검수(모델) 전에 본다: 스위치 · 창 · 24시간 상한 · 하루 검수 시도 상한(사진과 같은 장부). ok면 시도를 하나 센다.
-- 같은 client id의 스토리가 이미 있으면 `exists`(그 스토리). ok에는 검수 기준 연령대(`ageBand`)를 싣는다.
create function public.companion_my_text_gate(
  p_user_id uuid,
  p_client_id uuid,
  p_tz_offset_min integer,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (p_now at time zone 'utc')::date;
  v_story companion.my_stories;
  v_window jsonb;
begin
  if not companion.text_stories_on(p_user_id) then
    return jsonb_build_object('result', 'off');
  end if;
  perform companion.lock_wallet(p_user_id);
  select * into v_story from companion.my_stories where user_id = p_user_id and client_id = p_client_id;
  if found then
    return jsonb_build_object('result', 'exists', 'story', companion.my_story_json(v_story));
  end if;
  v_window := companion.my_story_window(p_user_id, p_tz_offset_min, p_now);
  if (v_window->>'used')::boolean then
    return jsonb_build_object('result', 'window_used', 'window', v_window);
  end if;
  if companion.my_story_day_full(p_user_id, p_now) then
    return jsonb_build_object('result', 'daily_limit', 'window', v_window);
  end if;
  if coalesce((select u.checks from companion.my_story_usage u where u.day = v_day and u.user_id = p_user_id), 0)
     >= (select my_story_check_daily from companion.settings) then
    return jsonb_build_object('result', 'check_limit', 'window', v_window);
  end if;
  insert into companion.my_story_usage as u (day, user_id, checks) values (v_day, p_user_id, 1)
  on conflict (day, user_id) do update set checks = u.checks + 1;
  return jsonb_build_object(
    'result', 'ok',
    'window', v_window,
    'ageBand', companion.age_band((select p.birth_year from companion.profiles p where p.user_id = p_user_id), p_now)
  );
end;
$$;

-- 글 스토리를 저장한다(검수를 통과한 것만 온다). 늘 live — Seen · 알람을 적는다. 창 · 상한은 여기서 다시 본다.
create function public.companion_save_my_text_story(
  p_user_id uuid,
  p_client_id uuid,
  p_background text,
  p_ko text,
  p_overlays jsonb,
  p_lang text,
  p_tz_offset_min integer,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_story companion.my_stories;
  v_window jsonb;
  v_ko text := btrim(coalesce(p_ko, ''));
  v_overlays jsonb := coalesce(p_overlays, '[]'::jsonb);
begin
  if not companion.text_stories_on(p_user_id) then
    return jsonb_build_object('result', 'off', 'story', null);
  end if;
  perform companion.lock_wallet(p_user_id);
  select * into v_story from companion.my_stories where user_id = p_user_id and client_id = p_client_id;
  if found then
    return jsonb_build_object('result', 'ok', 'story', companion.my_story_json(v_story));
  end if;
  if p_client_id is null
    or coalesce(p_background, '') not in ('orange', 'green', 'blue', 'purple')
    or char_length(v_ko) > 200
    or coalesce(p_lang, '') !~ '^[a-z]{2}(-[A-Za-z]{2,4})?$'
    or jsonb_typeof(v_overlays) <> 'array' or jsonb_array_length(v_overlays) > 8 or pg_column_size(v_overlays) > 8000
    or (v_ko = '' and jsonb_array_length(v_overlays) = 0) then
    return jsonb_build_object('result', 'invalid', 'story', null);
  end if;
  v_window := companion.my_story_window(p_user_id, p_tz_offset_min, p_now);
  if (v_window->>'used')::boolean then
    return jsonb_build_object('result', 'window_used', 'story', null, 'window', v_window);
  end if;
  if companion.my_story_day_full(p_user_id, p_now) then
    return jsonb_build_object('result', 'daily_limit', 'story', null, 'window', v_window);
  end if;
  insert into companion.my_stories (
    user_id, client_id, kind, word, ko, roman, meaning, lang, posted_at, expires_at, status, background, overlays
  ) values (
    p_user_id, p_client_id, 'text', null, v_ko, '', '', p_lang, p_now, p_now + interval '24 hours', 'live', p_background, v_overlays
  ) returning * into v_story;
  insert into companion.my_story_slots (user_id, local_day, slot, created_at)
  values (p_user_id, (v_window->>'day')::date, v_window->>'slot', p_now);
  insert into companion.my_story_usage as u (day, user_id, posts)
  values ((p_now at time zone 'utc')::date, p_user_id, 1)
  on conflict (day, user_id) do update set posts = u.posts + 1;
  perform companion.schedule_my_story_reactions(v_story, p_now);
  return jsonb_build_object(
    'result', 'ok',
    'story', companion.my_story_json(v_story),
    'window', companion.my_story_window(p_user_id, p_tz_offset_min, p_now)
  );
end;
$$;

-- ------------------------------------------------------------------ 반응 — 각도(글은 사진과 같게) · claim에 얹은 글

-- 20270106120000의 정의에서 사진 분기를 사진 · 글로 넓혔다(덕수쌤 고정 · 퀴즈는 단어 · 카드만).
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
  if p_story.kind not in ('photo', 'text') and v_want > 0 and v_list ? 'duksu' then
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
        when p_story.kind in ('photo', 'text') and v_rank = 1 then 'react'
        when p_story.kind in ('photo', 'text') then
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

-- claim이 돌려주는 줄에 얹은 글(`overlays`)을 더한다 — 정의를 통째로 다시 쓰지 않고 두 곳만 바꾼다(20270104130000과 같은 방식).
do $$
declare
  v_def text := pg_get_functiondef('public.companion_claim_story_reactions(timestamptz,integer)'::regprocedure);
  v_select text := 's.example_ko, s.lang, s.posted_at, s.scene';
  v_field text := '''lang'', v_row.lang';
begin
  if position('v_row.overlays' in v_def) > 0 then
    return;
  end if;
  if position(v_select in v_def) = 0 or position(v_field in v_def) = 0 then
    raise exception 'companion_claim_story_reactions: lines not found';
  end if;
  v_def := replace(v_def, v_select, v_select || ', s.overlays');
  v_def := replace(v_def, v_field, v_field || ', ''overlays'', v_row.overlays');
  execute v_def;
end $$;

-- ------------------------------------------------------------------ 권한

revoke all on function public.companion_my_text_gate(uuid, uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_save_my_text_story(uuid, uuid, text, text, jsonb, text, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.companion_my_text_gate(uuid, uuid, integer, timestamptz) to service_role;
grant execute on function public.companion_save_my_text_story(uuid, uuid, text, text, jsonb, text, integer, timestamptz)
  to service_role;
