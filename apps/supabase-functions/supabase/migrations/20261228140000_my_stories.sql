-- 내 스토리 — 단어 · 카드(ADR-0179, 사용자 결정 2026-11-23 「PR 2도 진행」). 사진은 없다. 친구 스토리(20261228120000) 위에 쌓는다.
-- 1. 스위치(companion.settings): `my_stories`(올리기 · 읽기 · 지우기) · `story_reactions`(LLM 반응 예약 · 만들기) — off(기본) · testers · on.
--    상한: `my_story_daily`(사람 하루 올리기) · `story_reaction_user_daily`(사람 하루 반응) · `story_reaction_global_daily`(전체 하루 반응). 날은 UTC.
--    반응 상한은 **claim 수**로 센다 — 모델 부르기가 실패해도 비용은 쓴 것으로 본다. 수는 지워지지 않는 장부(`my_story_usage` ·
--    `my_story_usage_global`)에 쌓는다 — 스토리를 지우거나 정리해도 그날 쓴 양은 줄지 않는다. claim은 전체 장부 줄을 잠가 줄 세운다.
-- 2. 프로필 `keep_my_stories`(기본 켬): 친구에게는 24시간, 내 보관함에는 지울 때까지. 끄면 24시간 지난 것은 정리(`companion_purge_my_stories`) 때 지운다.
-- 3. 표 셋(RLS 켬, 앱 직접 접근 없음): `my_stories` · `my_story_reactions`(스토리 cascade) · `my_story_replies`(대화 인용 — 스토리를 지우면 null →
--    기록 읽기의 인용이 「Deleted story」).
-- 4. 앱 RPC: `companion_my_stories()` · `companion_post_my_story(…)` · `companion_delete_my_story(id|null)` · `companion_set_keep_my_stories(bool)`.
-- 5. 서버 역할: `companion_claim_story_reactions(now, limit)` · `companion_finish_story_reaction(…)` · `companion_purge_my_stories(now)`.
-- 6. chat-send의 `story_id`가 내 스토리면 `companion_claim_story_reply`가 `mine`을 돌려주고 인용을 남긴다(무료 아님 — 보통 메시지 요금).

alter table companion.settings
  add column if not exists my_stories text not null default 'off' check (my_stories in ('off', 'testers', 'on')),
  add column if not exists story_reactions text not null default 'off' check (story_reactions in ('off', 'testers', 'on')),
  add column if not exists my_story_daily integer not null default 3 check (my_story_daily between 0 and 20),
  add column if not exists story_reaction_user_daily integer not null default 3
    check (story_reaction_user_daily between 0 and 20),
  add column if not exists story_reaction_global_daily integer not null default 500
    check (story_reaction_global_daily between 0 and 100000);

alter table companion.profiles
  add column if not exists keep_my_stories boolean not null default true;

-- ------------------------------------------------------------------ 표

create table companion.my_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 앱이 만든 id — 두 번 눌러도 하나.
  client_id uuid not null,
  kind text not null check (kind in ('word', 'card')),
  word jsonb not null check (
    coalesce(jsonb_typeof(word->'episodeId') = 'string' and jsonb_typeof(word->'ref') = 'string', false)
    and char_length(word->>'episodeId') between 1 and 80 and char_length(word->>'ref') between 1 and 120
  ),
  ko text not null check (char_length(ko) between 1 and 40),
  roman text not null default '' check (char_length(roman) <= 80),
  -- 올린 사람의 화면 언어 뜻.
  meaning text not null check (char_length(meaning) between 1 and 120),
  example_ko text check (example_ko is null or char_length(example_ko) between 1 and 120),
  example_meaning text check (example_meaning is null or char_length(example_meaning) <= 200),
  lang text not null check (lang ~ '^[a-z]{2}(-[A-Za-z]{2,4})?$'),
  posted_at timestamptz not null,
  expires_at timestamptz not null,
  unique (user_id, client_id)
);
create index my_stories_user_idx on companion.my_stories (user_id, posted_at desc);

create table companion.my_story_reactions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references companion.my_stories (id) on delete cascade,
  user_id uuid not null,
  character_id text not null references companion.characters (id),
  due_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'claimed', 'done', 'failed', 'skipped')),
  text_ko text check (text_ko is null or char_length(text_ko) between 1 and 400),
  meaning text check (meaning is null or char_length(meaning) <= 600),
  claimed_at timestamptz,
  done_at timestamptz,
  -- 끝낼 때의 사용량 요약(단계마다 모델 · 토큰) · 결과 — 비용 근거.
  meta jsonb,
  -- 건너뛰거나 실패한 까닭(감사 A14): cap_user · expired · switch_off · stale · no_word · budget · 그 밖 핸들러 결과(not_allowed · blocked …).
  skip_reason text check (skip_reason is null or skip_reason ~ '^[a-z_]{1,40}$'),
  unique (story_id, character_id)
);
create index my_story_reactions_due_idx on companion.my_story_reactions (status, due_at);
create index my_story_reactions_claimed_idx on companion.my_story_reactions (claimed_at) where claimed_at is not null;

create table companion.my_story_replies (
  user_id uuid not null references auth.users (id) on delete cascade,
  client_message_id uuid not null,
  -- 스토리를 지우면 null — 기록 읽기의 인용이 「Deleted story」가 된다.
  my_story_id uuid references companion.my_stories (id) on delete set null,
  character_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, client_message_id)
);

-- 하루 쓴 양 장부(B1) — 스토리 · 반응을 지워도 줄지 않는다. 하루 상한은 여기서 읽는다. 날은 UTC. 사람 줄은 계정을 지우면 함께 지운다.
create table companion.my_story_usage (
  day date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  posts integer not null default 0,
  claims integer not null default 0,
  primary key (day, user_id)
);
-- 전체 하루 반응 claim 수 — 계정을 지워도 남는다. claim은 이 줄을 잠가 동시 호출을 줄 세운다(M1).
create table companion.my_story_usage_global (
  day date primary key,
  claims integer not null default 0
);

alter table companion.my_story_usage enable row level security;
alter table companion.my_story_usage_global enable row level security;
revoke all on table companion.my_story_usage, companion.my_story_usage_global from public, anon, authenticated;
alter table companion.my_stories enable row level security;
alter table companion.my_story_reactions enable row level security;
alter table companion.my_story_replies enable row level security;
revoke all on table companion.my_stories, companion.my_story_reactions, companion.my_story_replies
  from public, anon, authenticated;

-- ------------------------------------------------------------------ 도움 함수

create function companion.switch_on(p_value text, p_user_id uuid)
returns boolean language sql stable as $$
  select case p_value when 'on' then true when 'testers' then companion.is_tester(p_user_id) else false end
$$;
revoke all on function companion.switch_on(text, uuid) from public;

create function companion.my_stories_on(p_user_id uuid)
returns boolean language sql stable as $$
  select companion.switch_on((select my_stories from companion.settings), p_user_id)
$$;
revoke all on function companion.my_stories_on(uuid) from public;

create function companion.reactions_on(p_user_id uuid)
returns boolean language sql stable as $$
  select companion.my_stories_on(p_user_id)
    and companion.switch_on((select story_reactions from companion.settings), p_user_id)
$$;
revoke all on function companion.reactions_on(uuid) from public;

create function companion.my_story_json(p_story companion.my_stories)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', p_story.id,
    'kind', p_story.kind,
    'word', p_story.word,
    'ko', p_story.ko,
    'roman', p_story.roman,
    'meaning', p_story.meaning,
    'example', case when p_story.example_ko is null then null
      else jsonb_build_object('ko', p_story.example_ko, 'meaning', p_story.example_meaning) end,
    'postedAt', companion.story_time(p_story.posted_at),
    'expiresAt', companion.story_time(p_story.expires_at),
    'reactions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'characterId', r.character_id,
        'text', r.text_ko,
        'meaning', r.meaning,
        'at', companion.story_time(r.done_at)
      ) order by r.due_at, r.character_id)
      from companion.my_story_reactions r
      where r.story_id = p_story.id and r.status = 'done'
    ), '[]'::jsonb)
  )
$$;
revoke all on function companion.my_story_json(companion.my_stories) from public;

-- 반응 간격(분) — 1 · 2 · 3번째 친구마다 [8 ~ 25분] · [45 ~ 150분] · [3 ~ 7시간], 스토리 · 인물 해시로 결정적.
create function companion.reaction_delay_minutes(p_story_id uuid, p_character_id text, p_rank integer)
returns integer language sql immutable as $$
  select ((array[8, 45, 180])[p_rank]
    + (abs(hashtext(p_story_id::text || ':' || p_character_id)::bigint) % ((array[18, 106, 241])[p_rank])))::integer
$$;
revoke all on function companion.reaction_delay_minutes(uuid, text, integer) from public;

-- ------------------------------------------------------------------ 앱 — 읽기

create function public.companion_my_stories()
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
    return jsonb_build_object('enabled', false, 'keep', v_keep, 'stories', '[]'::jsonb);
  end if;
  return jsonb_build_object('enabled', true, 'keep', v_keep, 'stories', coalesce((
    select jsonb_agg(companion.my_story_json(s) order by s.posted_at desc, s.id)
    from (
      select * from companion.my_stories s
      where s.user_id = v_user and (v_keep or s.expires_at > now())
      order by s.posted_at desc, s.id
      limit 100
    ) s
  ), '[]'::jsonb));
end;
$$;

-- ------------------------------------------------------------------ 앱 — 올리기

create function public.companion_post_my_story(
  p_client_id uuid,
  p_kind text,
  p_word jsonb,
  p_ko text,
  p_roman text,
  p_meaning text,
  p_example_ko text,
  p_example_meaning text,
  p_lang text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  v_story companion.my_stories;
  v_rank integer := 0;
  v_character text;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not companion.my_stories_on(v_user) then
    return jsonb_build_object('result', 'off', 'story', null);
  end if;
  -- 같은 사람의 동시 요청을 줄 세운다 — 하루 상한 · 두 번 누름.
  perform companion.lock_wallet(v_user);
  select * into v_story from companion.my_stories where user_id = v_user and client_id = p_client_id;
  if found then
    return jsonb_build_object('result', 'ok', 'story', companion.my_story_json(v_story));
  end if;
  if p_client_id is null or p_kind is null or p_kind not in ('word', 'card')
    or p_word is null
    or not coalesce(jsonb_typeof(p_word->'episodeId') = 'string' and jsonb_typeof(p_word->'ref') = 'string', false)
    or char_length(p_word->>'episodeId') not between 1 and 80
    or char_length(p_word->>'ref') not between 1 and 120
    or coalesce(char_length(btrim(p_ko)), 0) not between 1 and 40
    or char_length(coalesce(p_roman, '')) > 80
    or coalesce(char_length(btrim(p_meaning)), 0) not between 1 and 120
    or (p_example_ko is not null and char_length(btrim(p_example_ko)) not between 1 and 120)
    or char_length(coalesce(p_example_meaning, '')) > 200
    or coalesce(p_lang, '') !~ '^[a-z]{2}(-[A-Za-z]{2,4})?$' then
    return jsonb_build_object('result', 'invalid', 'story', null);
  end if;
  -- 하루 상한은 장부로 센다 — 지운 스토리도 오늘 올린 수에 남는다(B1).
  if coalesce((select u.posts from companion.my_story_usage u
               where u.day = (v_now at time zone 'utc')::date and u.user_id = v_user), 0)
     >= (select my_story_daily from companion.settings) then
    return jsonb_build_object('result', 'daily_limit', 'story', null);
  end if;

  insert into companion.my_stories (
    user_id, client_id, kind, word, ko, roman, meaning, example_ko, example_meaning, lang, posted_at, expires_at
  ) values (
    v_user, p_client_id, p_kind, jsonb_build_object('episodeId', p_word->>'episodeId', 'ref', p_word->>'ref'),
    btrim(p_ko), coalesce(p_roman, ''), btrim(p_meaning),
    nullif(btrim(coalesce(p_example_ko, '')), ''),
    case when nullif(btrim(coalesce(p_example_ko, '')), '') is null then null else p_example_meaning end,
    p_lang, v_now, v_now + interval '24 hours'
  ) returning * into v_story;
  insert into companion.my_story_usage as u (day, user_id, posts)
  values ((v_now at time zone 'utc')::date, v_user, 1)
  on conflict (day, user_id) do update set posts = u.posts + 1;

  -- 반응 예약 — 이 사람이 말한 대화의 인물 최대 셋(마지막으로 말한 순).
  if companion.reactions_on(v_user) then
    for v_character in
      select cv.character_id
      from companion.conversations cv
      join companion.characters c on c.id = cv.character_id
      where cv.user_id = v_user and cv.kind = 'companion' and c.active
        and not companion.friend_hidden(v_user, c.persona, v_now)
        and exists (select 1 from companion.messages m where m.conversation_id = cv.id and m.role = 'user')
      order by (select max(m.created_at) from companion.messages m where m.conversation_id = cv.id and m.role = 'user') desc,
        cv.character_id
      limit 3
    loop
      v_rank := v_rank + 1;
      insert into companion.my_story_reactions (story_id, user_id, character_id, due_at)
      values (
        v_story.id, v_user, v_character,
        v_now + make_interval(mins => companion.reaction_delay_minutes(v_story.id, v_character, v_rank))
      );
    end loop;
  end if;
  return jsonb_build_object('result', 'ok', 'story', companion.my_story_json(v_story));
end;
$$;

-- ------------------------------------------------------------------ 앱 — 지우기 · 보관

create function public.companion_delete_my_story(p_story_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from companion.my_stories s
  where s.user_id = v_user and (p_story_id is null or s.id = p_story_id);
  get diagnostics v_count = row_count;
  return jsonb_build_object('deleted', v_count);
end;
$$;

create function public.companion_set_keep_my_stories(p_keep boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into companion.profiles (user_id, keep_my_stories) values (v_user, coalesce(p_keep, true))
  on conflict (user_id) do update set keep_my_stories = excluded.keep_my_stories;
  return jsonb_build_object('keep', coalesce(p_keep, true));
end;
$$;

-- ------------------------------------------------------------------ 서버 — 반응

-- 때가 된 반응을 고른다(상한 안에서). 고른 줄은 claimed — 상한은 이 수로 센다(모델 부르기가 실패해도).
create function public.companion_claim_story_reactions(p_now timestamptz, p_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (p_now at time zone 'utc')::date;
  v_user_cap integer := (select story_reaction_user_daily from companion.settings);
  v_global_cap integer := (select story_reaction_global_daily from companion.settings);
  v_global integer;
  v_row record;
  v_out jsonb := '[]'::jsonb;
  v_skipped_cap integer := 0;
  v_global_capped boolean := false;
begin
  -- 줄 세움(M1): 그날 전체 장부 줄을 잠근다 — 겹친 호출은 앞 호출이 커밋할 때까지 기다렸다가 새 수를 읽는다.
  insert into companion.my_story_usage_global (day) values (v_day) on conflict (day) do nothing;
  select g.claims into v_global from companion.my_story_usage_global g where g.day = v_day for update;
  -- 끊긴 함수가 남긴 claimed(30분 넘음)는 failed로 끝낸다(M3) — 상한은 이미 셌다.
  update companion.my_story_reactions set status = 'failed', done_at = p_now, skip_reason = 'stale'
  where status = 'claimed' and claimed_at < p_now - interval '30 minutes';
  for v_row in
    select r.id, r.user_id, r.character_id, r.story_id, s.kind, s.ko, s.roman, s.meaning, s.example_ko, s.lang, s.posted_at
    from companion.my_story_reactions r
    join companion.my_stories s on s.id = r.story_id
    where r.status = 'scheduled' and r.due_at <= p_now
    order by r.due_at, r.id
    for update of r skip locked
  loop
    exit when jsonb_array_length(v_out) >= greatest(p_limit, 0);
    if v_row.posted_at <= p_now - interval '24 hours' or not companion.reactions_on(v_row.user_id) then
      update companion.my_story_reactions
      set status = 'skipped',
        skip_reason = case when v_row.posted_at <= p_now - interval '24 hours' then 'expired' else 'switch_off' end
      where id = v_row.id;
      continue;
    end if;
    -- 사람 상한 — 장부(지워도 줄지 않음).
    if coalesce((select u.claims from companion.my_story_usage u where u.day = v_day and u.user_id = v_row.user_id), 0)
       >= v_user_cap then
      update companion.my_story_reactions set status = 'skipped', skip_reason = 'cap_user' where id = v_row.id;
      v_skipped_cap := v_skipped_cap + 1;
      continue;
    end if;
    -- 전체 상한에 닿으면 남긴다 — 24시간이 지나면 위 규칙으로 정리된다.
    if v_global >= v_global_cap then
      v_global_capped := true;
      exit;
    end if;
    update companion.my_story_reactions set status = 'claimed', claimed_at = p_now where id = v_row.id;
    insert into companion.my_story_usage as u (day, user_id, claims) values (v_day, v_row.user_id, 1)
    on conflict (day, user_id) do update set claims = u.claims + 1;
    v_global := v_global + 1;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'reactionId', v_row.id,
      'userId', v_row.user_id,
      'characterId', v_row.character_id,
      'storyId', v_row.story_id,
      'kind', v_row.kind,
      'ko', v_row.ko,
      'roman', v_row.roman,
      'meaning', v_row.meaning,
      'exampleKo', v_row.example_ko,
      'lang', v_row.lang
    ));
  end loop;
  update companion.my_story_usage_global set claims = v_global where day = v_day;
  -- 고른 줄 · 사람 상한으로 건너뛴 수 · 전체 상한에 닿았는가(감사 A14 — 핸들러 결과 · 로그).
  return jsonb_build_object('rows', v_out, 'skippedCap', v_skipped_cap, 'globalCapped', v_global_capped);
end;
$$;

create function public.companion_finish_story_reaction(
  p_reaction_id uuid,
  p_text text,
  p_meaning text,
  p_ok boolean,
  p_now timestamptz,
  p_meta jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_ok and coalesce(char_length(btrim(p_text)), 0) between 1 and 400 then
    update companion.my_story_reactions
    set status = 'done', text_ko = btrim(p_text), meaning = left(nullif(btrim(coalesce(p_meaning, '')), ''), 600), done_at = p_now,
      meta = p_meta
    where id = p_reaction_id and status = 'claimed';
  else
    -- 까닭은 핸들러 결과(meta.outcome)에서 — 단어 없이 버린 답(rejected)은 no_word.
    update companion.my_story_reactions
    set status = 'failed', done_at = p_now, meta = p_meta,
      skip_reason = case
        when p_meta->>'outcome' = 'rejected' then 'no_word'
        when p_meta->>'outcome' ~ '^[a-z_]{1,40}$' then p_meta->>'outcome'
        else 'failed'
      end
    where id = p_reaction_id and status = 'claimed';
  end if;
  get diagnostics v_count = row_count;
  return jsonb_build_object('updated', v_count);
end;
$$;

-- 보관을 끈 사람의 24시간 지난 스토리 — 반응은 cascade, 대화 인용은 「Deleted story」.
create function public.companion_purge_my_stories(p_now timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from companion.my_stories s
  using companion.profiles p
  where p.user_id = s.user_id and not p.keep_my_stories and s.expires_at <= p_now;
  get diagnostics v_count = row_count;
  return jsonb_build_object('deleted', v_count);
end;
$$;

-- ------------------------------------------------------------------ 대화 — 내 스토리 답장 · 인용

-- 내 스토리 답장(인물의 반응에 답함) — 인용만 남긴다(무료 아님). 지운 스토리 · 남의 스토리는 not_found.
create function companion.claim_my_story_reply(
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
    'line', v_story.ko,
    'wordKo', v_story.ko,
    'meaning', v_story.meaning,
    'reaction', (
      select r.text_ko from companion.my_story_reactions r
      where r.story_id = v_story.id and r.character_id = p_character_id and r.status = 'done'
    ),
    'postedAt', companion.story_time(v_story.posted_at)
  ));
end;
$$;
revoke all on function companion.claim_my_story_reply(uuid, uuid, text, uuid) from public;

-- 친구 스토리(20261228120000)의 판정 앞에 내 스토리 길을 더한다 — 정의를 통째로 다시 쓰지 않고 첫 조회 앞에 한 블록을 넣는다.
do $$
declare
  v_def text := pg_get_functiondef(
    'public.companion_claim_story_reply(uuid,uuid,text,uuid,timestamptz)'::regprocedure
  );
  v_line text := 'if not companion.stories_on(p_user_id) then';
  v_new text := 'if not exists (select 1 from companion.stories where id = p_story_id) then'
    || E'\n    return companion.claim_my_story_reply(p_user_id, p_story_id, p_character_id, p_client_message_id);'
    || E'\n  end if;\n  if not companion.stories_on(p_user_id) then';
begin
  if position('claim_my_story_reply' in v_def) > 0 then
    return;
  end if;
  if position(v_line in v_def) = 0 then
    raise exception 'companion_claim_story_reply: stories_on line not found';
  end if;
  execute replace(v_def, v_line, v_new);
end $$;

-- 대화 기록의 인용 — 친구 스토리 답장 { kind: friend, … } · 내 스토리 답장 { kind: mine, … } · 지운 내 스토리 { kind: deleted, characterId }.
create or replace function companion.story_quote_json(p_user_id uuid, p_client_message_id uuid)
returns jsonb language sql stable as $$
  select coalesce(
    (
      select jsonb_build_object(
        'kind', 'friend',
        'id', s.id,
        'characterId', s.character_id,
        'line', p.line_ko,
        'imagePath', p.image_path,
        'postedAt', companion.story_time(s.posted_at)
      )
      from companion.story_replies r
      join companion.stories s on s.id = r.story_id
      join companion.story_pool p on p.id = s.pool_id
      where r.user_id = p_user_id and r.client_message_id = p_client_message_id
    ),
    (
      select case when m.id is null
        then jsonb_build_object('kind', 'deleted', 'characterId', r.character_id)
        else jsonb_build_object(
          'kind', 'mine',
          'id', m.id,
          'characterId', r.character_id,
          'line', m.ko,
          'imagePath', null,
          'postedAt', companion.story_time(m.posted_at)
        ) end
      from companion.my_story_replies r
      left join companion.my_stories m on m.id = r.my_story_id
      where r.user_id = p_user_id and r.client_message_id = p_client_message_id
    )
  )
$$;

-- ------------------------------------------------------------------ 권한

revoke all on function public.companion_my_stories() from public, anon;
revoke all on function public.companion_post_my_story(uuid, text, jsonb, text, text, text, text, text, text) from public, anon;
revoke all on function public.companion_delete_my_story(uuid) from public, anon;
revoke all on function public.companion_set_keep_my_stories(boolean) from public, anon;
revoke all on function public.companion_claim_story_reactions(timestamptz, integer) from public, anon, authenticated;
revoke all on function public.companion_finish_story_reaction(uuid, text, text, boolean, timestamptz, jsonb)
  from public, anon, authenticated;
revoke all on function public.companion_purge_my_stories(timestamptz) from public, anon, authenticated;
grant execute on function public.companion_my_stories() to authenticated;
grant execute on function public.companion_post_my_story(uuid, text, jsonb, text, text, text, text, text, text) to authenticated;
grant execute on function public.companion_delete_my_story(uuid) to authenticated;
grant execute on function public.companion_set_keep_my_stories(boolean) to authenticated;
grant execute on function public.companion_claim_story_reactions(timestamptz, integer) to service_role;
grant execute on function public.companion_finish_story_reaction(uuid, text, text, boolean, timestamptz, jsonb) to service_role;
grant execute on function public.companion_purge_my_stories(timestamptz) to service_role;
