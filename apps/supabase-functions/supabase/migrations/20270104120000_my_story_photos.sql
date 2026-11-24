-- 내 스토리 — 사진(ADR-0191 D11, 사용자 결정 2026-11-24). 단어 · 카드 스토리(20261228140000) 위에 쌓는다.
-- 1. 스위치 `my_story_photo`(off 기본 · testers · on) — `my_stories`가 켜진 **성인**에게만 뜻이 있다(미성년 · 나이 모름은 사진 불가).
--    상한: `my_story_check_daily`(사람 하루 검수 시도) · `my_story_draft_daily`(사람 하루 교정) · `my_story_edit_limit`(스토리당 글 고치기) ·
--    `my_story_reject_keep_days`(거절한 사진을 격리 버킷에 두는 날 수).
-- 2. 버킷: `my-story-photos`(비공개 — 올릴 수 있는 사람이 자기 폴더 `<user_id>/…`에 올리고 읽는다) · `my-story-quarantine`(비공개, 서버 키만).
-- 3. `my_stories`: kind `photo` · `status`(checking — 나에게만 보임 · live) · `image_path` · `overlays`(얹은 단어 · 카드, 굽지 않음) ·
--    `scene`(읽기 결과 — 개인정보를 뺀 장면 설명. 인물 호출은 사진이 아니라 이것만 받는다) · `line_original` · `edits` · `check_tries`.
-- 4. 거절: `my_story_rejections`(분류 · 격리 경로 · 지울 날 · 다시 확인 요청). 스토리 줄은 만들지 않는다.
-- 5. 파일 정리 대기열 `my_story_file_purges`: 스토리를 지우면(계정 삭제 · 보관 끔 정리 포함) 그 사진을, 기한이 지난 거절은 격리 파일을 넣는다 —
--    저장소 파일은 SQL로 지울 수 없어 매분 도는 반응 함수가 지운다.
-- 6. 서버 역할 RPC: 문(`companion_my_photo_gate`) · 저장 · 거절 · 다시 볼 것(`companion_my_story_checks_due`) · 판정 · 글 고치기 · 교정 횟수 ·
--    파일 정리. 앱 RPC: `companion_request_story_review`(다시 확인 요청) · `companion_can_upload_story_photo`(저장소 정책이 부른다).

alter table companion.settings
  add column if not exists my_story_photo text not null default 'off' check (my_story_photo in ('off', 'testers', 'on')),
  add column if not exists my_story_check_daily integer not null default 5 check (my_story_check_daily between 0 and 50),
  add column if not exists my_story_draft_daily integer not null default 30 check (my_story_draft_daily between 0 and 500),
  add column if not exists my_story_edit_limit integer not null default 3 check (my_story_edit_limit between 0 and 20),
  add column if not exists my_story_reject_keep_days integer not null default 30
    check (my_story_reject_keep_days between 1 and 365);

alter table companion.my_story_usage
  add column if not exists checks integer not null default 0,
  add column if not exists drafts integer not null default 0;

-- ------------------------------------------------------------------ 표

alter table companion.my_stories
  drop constraint my_stories_kind_check,
  drop constraint my_stories_word_check,
  drop constraint my_stories_ko_check,
  drop constraint my_stories_roman_check,
  drop constraint my_stories_meaning_check;
alter table companion.my_stories alter column word drop not null;
alter table companion.my_stories
  -- checking: 읽기(검수)가 제때 끝나지 않아 다시 보는 중 — 올린 사람에게만 보이고 Seen · 반응이 없다.
  add column status text not null default 'live' check (status in ('checking', 'live')),
  -- 버킷 `my-story-photos` 안의 경로 `<user_id>/<파일>`.
  add column image_path text check (image_path is null or image_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  -- 얹은 단어 · 카드 — [{ kind, ko, roman?, meaning?, word?: { episodeId, ref }, x, y, scale, rotation }]. 서버는 모양을 깊이 보지 않는다.
  add column overlays jsonb not null default '[]'::jsonb
    check (jsonb_typeof(overlays) = 'array' and jsonb_array_length(overlays) <= 8 and pg_column_size(overlays) <= 8000),
  -- 읽기 결과 { description, hooks: [..], crisis: boolean } — 이름 · 번호 · 문서의 글자 · 사람의 신원 · 외모 평가는 없다.
  add column scene jsonb check (scene is null or (jsonb_typeof(scene) = 'object' and pg_column_size(scene) <= 6000)),
  -- 교정 전 내가 쓴 글(「Use this」로 바꿨을 때만).
  add column line_original text check (line_original is null or char_length(line_original) <= 300),
  add column edits integer not null default 0,
  add column check_tries integer not null default 0,
  -- 다시 보기가 마지막으로 이 줄을 고른 때 — 읽는 중인 줄을 다음 회차가 또 고르거나 게시로 끝내지 않게.
  add column checked_at timestamptz,
  add constraint my_stories_kind_check check (kind in ('word', 'card', 'photo')),
  add constraint my_stories_word_check check (
    (kind = 'photo' and word is null) or (kind <> 'photo' and word is not null
      and coalesce(jsonb_typeof(word->'episodeId') = 'string' and jsonb_typeof(word->'ref') = 'string', false)
      and char_length(word->>'episodeId') between 1 and 80 and char_length(word->>'ref') between 1 and 120)
  ),
  add constraint my_stories_ko_check check (char_length(ko) between 1 and case when kind = 'photo' then 120 else 40 end),
  add constraint my_stories_roman_check check (char_length(roman) <= case when kind = 'photo' then 400 else 80 end),
  add constraint my_stories_meaning_check check (
    char_length(meaning) between case when kind = 'photo' then 0 else 1 end and case when kind = 'photo' then 300 else 120 end
  ),
  add constraint my_stories_photo_check check ((kind = 'photo') = (image_path is not null));

-- 거절한 사진(ADR-0191 D11) — 스토리가 되지 않는다. 사진은 격리 버킷에 `purge_after`까지 두었다 지운다.
create table companion.my_story_rejections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null,
  -- 읽기 단계의 분류: sexual_minors · nudity · gore · other.
  category text not null check (category ~ '^[a-z_]{1,40}$'),
  -- 버킷 `my-story-quarantine` 안의 경로. 옮기지 못했거나 이미 지웠으면 null.
  quarantine_path text,
  created_at timestamptz not null,
  purge_after timestamptz not null,
  -- 「다시 확인 요청」 — 권한 있는 사람이 운영 도구에서 다시 본다.
  review_requested_at timestamptz,
  review_result text check (review_result is null or review_result in ('upheld', 'overturned')),
  reviewed_at timestamptz,
  unique (user_id, client_id)
);
create index my_story_rejections_purge_idx on companion.my_story_rejections (purge_after) where quarantine_path is not null;

-- 지울 저장소 파일. 반응 함수가 매분 읽어 지우고 줄을 없앤다(없는 파일을 지워도 된다).
create table companion.my_story_file_purges (
  id bigint generated always as identity primary key,
  bucket text not null check (bucket in ('my-story-photos', 'my-story-quarantine')),
  path text not null,
  created_at timestamptz not null default now()
);

alter table companion.my_story_rejections enable row level security;
alter table companion.my_story_file_purges enable row level security;
revoke all on table companion.my_story_rejections, companion.my_story_file_purges from public, anon, authenticated;

-- 스토리가 지워지면(하나 · 모두 · 보관 끔 정리 · 계정 삭제) 그 사진을 정리 대기열에 넣는다.
-- 정의자 권한으로 돈다 — 계정 삭제는 auth 쪽 역할이 `auth.users`를 지우는 cascade라, 그 역할에는 companion 스키마 권한이 없다.
create function companion.queue_my_story_photo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into companion.my_story_file_purges (bucket, path) values ('my-story-photos', old.image_path);
  return old;
end;
$$;
create trigger my_stories_queue_photo
  after delete on companion.my_stories
  for each row when (old.image_path is not null)
  execute function companion.queue_my_story_photo();
revoke all on function companion.queue_my_story_photo() from public;

-- ------------------------------------------------------------------ 도움 함수

-- 사진을 올릴 수 있는 사람 — 내 스토리 · 사진 스위치가 켜져 있고 성인(생년으로 확인).
create function companion.photo_stories_on(p_user_id uuid, p_now timestamptz)
returns boolean language sql stable as $$
  select companion.my_stories_on(p_user_id)
    and companion.switch_on((select my_story_photo from companion.settings), p_user_id)
    and companion.age_band((select p.birth_year from companion.profiles p where p.user_id = p_user_id), p_now) = 'adult'
$$;
revoke all on function companion.photo_stories_on(uuid, timestamptz) from public;

-- 저장소 정책이 부른다 — 지금 로그인한 사람이 사진을 올릴 수 있는가.
-- 한 사람이 버킷에 둘 수 있는 파일 수 — 스토리가 되지 못한 파일은 하루 뒤 정리되므로(아래 `companion_my_story_file_purges`) 넉넉하다.
create function companion.story_photo_count(p_user_id uuid)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare
  v_count integer := 0;
begin
  if to_regclass('storage.objects') is not null then
    execute 'select count(*) from storage.objects where bucket_id = ''my-story-photos'' and name like $1'
      into v_count using p_user_id::text || '/%';
  end if;
  return v_count;
end;
$$;
revoke all on function companion.story_photo_count(uuid) from public;

create function public.companion_can_upload_story_photo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and companion.photo_stories_on(auth.uid(), now())
    and companion.story_photo_count(auth.uid()) < 40
$$;

-- 앱이 받는 스토리 한 건(20261228140000) + 사진 칸: status · imagePath · overlays · lineOriginal · edits.
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

-- ------------------------------------------------------------------ 서버 — 올리기 문 · 저장 · 거절

-- 읽기(모델) 전에 본다: 스위치 · 연령 · 창 · 24시간 상한 · 검수 시도 상한. ok면 검수 시도를 하나 센다.
-- 같은 client id의 스토리가 이미 있으면 `exists`(그 스토리) — 두 번 눌러도 하나.
create function public.companion_my_photo_gate(
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
  if not companion.my_stories_on(p_user_id) then
    return jsonb_build_object('result', 'off');
  end if;
  perform companion.lock_wallet(p_user_id);
  select * into v_story from companion.my_stories where user_id = p_user_id and client_id = p_client_id;
  if found then
    return jsonb_build_object('result', 'exists', 'story', companion.my_story_json(v_story));
  end if;
  if exists (select 1 from companion.my_story_rejections r where r.user_id = p_user_id and r.client_id = p_client_id) then
    return jsonb_build_object('result', 'rejected', 'rejection', (
      select jsonb_build_object('id', r.id, 'category', r.category) from companion.my_story_rejections r
      where r.user_id = p_user_id and r.client_id = p_client_id
    ));
  end if;
  if not companion.switch_on((select my_story_photo from companion.settings), p_user_id) then
    return jsonb_build_object('result', 'off');
  end if;
  if not companion.photo_stories_on(p_user_id, p_now) then
    return jsonb_build_object('result', 'age');
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
  return jsonb_build_object('result', 'ok', 'window', v_window);
end;
$$;

-- 사진 스토리를 저장한다. `p_status`가 live면 Seen · 알람을 적는다(위기 신호가 읽혔으면 적지 않는다 — 보통 반응을 끈다).
-- checking이면 나에게만 보이는 줄로 두고 `companion_my_story_checks_due`가 다시 본다. 창 · 상한은 여기서 다시 본다(문과 저장 사이의 경쟁).
create function public.companion_save_my_photo_story(
  p_user_id uuid,
  p_client_id uuid,
  p_image_path text,
  p_ko text,
  p_roman text,
  p_meaning text,
  p_lang text,
  p_original text,
  p_overlays jsonb,
  p_scene jsonb,
  p_status text,
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
begin
  if not companion.photo_stories_on(p_user_id, p_now) then
    return jsonb_build_object('result', 'off', 'story', null);
  end if;
  perform companion.lock_wallet(p_user_id);
  select * into v_story from companion.my_stories where user_id = p_user_id and client_id = p_client_id;
  if found then
    return jsonb_build_object('result', 'ok', 'story', companion.my_story_json(v_story));
  end if;
  if p_client_id is null or p_status is null or p_status not in ('checking', 'live')
    or coalesce(p_image_path, '') !~ ('^' || p_user_id::text || '/[A-Za-z0-9._-]{1,120}$')
    or coalesce(char_length(btrim(p_ko)), 0) not between 1 and 120
    or char_length(coalesce(p_roman, '')) > 400
    or char_length(coalesce(p_meaning, '')) > 300
    or char_length(coalesce(p_original, '')) > 300
    or coalesce(p_lang, '') !~ '^[a-z]{2}(-[A-Za-z]{2,4})?$'
    or (p_overlays is not null and (jsonb_typeof(p_overlays) <> 'array' or jsonb_array_length(p_overlays) > 8
      or pg_column_size(p_overlays) > 8000))
    or (p_scene is not null and (jsonb_typeof(p_scene) <> 'object' or pg_column_size(p_scene) > 6000)) then
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
    user_id, client_id, kind, word, ko, roman, meaning, lang, posted_at, expires_at,
    status, image_path, overlays, scene, line_original
  ) values (
    p_user_id, p_client_id, 'photo', null, btrim(p_ko), coalesce(p_roman, ''), btrim(coalesce(p_meaning, '')), p_lang,
    p_now, p_now + interval '24 hours',
    p_status, p_image_path, coalesce(p_overlays, '[]'::jsonb), p_scene, nullif(btrim(coalesce(p_original, '')), '')
  ) returning * into v_story;
  insert into companion.my_story_slots (user_id, local_day, slot, created_at)
  values (p_user_id, (v_window->>'day')::date, v_window->>'slot', p_now);
  insert into companion.my_story_usage as u (day, user_id, posts)
  values ((p_now at time zone 'utc')::date, p_user_id, 1)
  on conflict (day, user_id) do update set posts = u.posts + 1;
  if p_status = 'live' and coalesce(p_scene->>'crisis', 'false') <> 'true' then
    perform companion.schedule_my_story_reactions(v_story, p_now);
  end if;
  return jsonb_build_object(
    'result', 'ok',
    'story', companion.my_story_json(v_story),
    'window', companion.my_story_window(p_user_id, p_tz_offset_min, p_now)
  );
end;
$$;

-- 거절을 적는다 — 스토리는 만들지 않는다. 창은 쓰지 않는다(검수 시도만 셌다). 같은 요청이 다시 오면 같은 줄.
create function public.companion_reject_my_photo(
  p_user_id uuid,
  p_client_id uuid,
  p_category text,
  p_quarantine_path text,
  p_now timestamptz,
  p_source_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row companion.my_story_rejections;
begin
  insert into companion.my_story_rejections (user_id, client_id, category, quarantine_path, created_at, purge_after)
  values (
    p_user_id, p_client_id,
    case when coalesce(p_category, '') ~ '^[a-z_]{1,40}$' then p_category else 'other' end,
    p_quarantine_path, p_now,
    p_now + make_interval(days => (select my_story_reject_keep_days from companion.settings))
  )
  on conflict (user_id, client_id) do update set quarantine_path = coalesce(excluded.quarantine_path, companion.my_story_rejections.quarantine_path)
  returning * into v_row;
  -- 격리 버킷으로 옮기지 못했으면(`p_quarantine_path` null) 거절한 원본이 올린 사람의 버킷에 남는다 — 지우도록 대기열에 넣는다.
  -- 이 드문 경우에는 보관(다시 확인)을 포기한다: 거절한 사진을 읽을 수 있는 곳에 두지 않는 쪽이 먼저다.
  if p_quarantine_path is null and coalesce(p_source_path, '') ~ ('^' || p_user_id::text || '/[A-Za-z0-9._-]{1,120}$') then
    insert into companion.my_story_file_purges (bucket, path) values ('my-story-photos', p_source_path);
  end if;
  return jsonb_build_object('id', v_row.id, 'category', v_row.category, 'purgeAfter', companion.story_time(v_row.purge_after));
end;
$$;

-- ------------------------------------------------------------------ 서버 — 다시 보기(checking)

-- 다시 읽을 스토리. 고를 때마다 시도를 센다 — 다섯 번을 넘기면 반응 없이 게시로 끝낸다(읽기가 계속 실패 — 올리기는 지킨다).
create function public.companion_my_story_checks_due(p_now timestamptz, p_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_out jsonb;
begin
  -- 다섯 번을 다 쓴 줄은 마지막 읽기가 끝났을 만큼(3분) 지난 뒤에 게시로 끝낸다 — 읽는 중에 끝내면 늦게 온 거절을 놓친다.
  update companion.my_stories set status = 'live'
  where status = 'checking' and check_tries >= 5 and checked_at < p_now - interval '3 minutes';
  with due as (
    select s.id from companion.my_stories s
    where s.status = 'checking' and s.check_tries < 5
      and (s.checked_at is null or s.checked_at < p_now - interval '90 seconds')
    order by s.posted_at, s.id
    limit greatest(p_limit, 0)
    for update skip locked
  ), bumped as (
    update companion.my_stories s set check_tries = s.check_tries + 1, checked_at = p_now
    from due where s.id = due.id
    returning s.id, s.user_id, s.client_id, s.image_path, s.ko, s.overlays, s.lang
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'storyId', b.id, 'userId', b.user_id, 'clientId', b.client_id, 'imagePath', b.image_path,
    'ko', b.ko, 'overlays', b.overlays, 'lang', b.lang
  )), '[]'::jsonb) into v_out from bumped b;
  return v_out;
end;
$$;

-- 다시 본 결과. live: 읽기 결과를 적고 Seen · 알람을 지금부터 적는다. rejected: 거절을 적고 스토리를 지운다. 그 밖(retry)은 그대로 둔다.
create function public.companion_resolve_my_story_check(
  p_story_id uuid,
  p_verdict text,
  p_scene jsonb,
  p_category text,
  p_quarantine_path text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_story companion.my_stories;
begin
  select * into v_story from companion.my_stories where id = p_story_id and status = 'checking' for update;
  if not found then
    return jsonb_build_object('result', 'gone');
  end if;
  if p_verdict = 'live' then
    -- 올릴 때 글에서 읽힌 위기 신호(`scene.crisis`)는 다시 읽은 결과가 덮지 못한다.
    update companion.my_stories
    set status = 'live',
      scene = case
        when coalesce(scene->>'crisis', 'false') = 'true'
          then coalesce(p_scene, scene) || jsonb_build_object('crisis', true)
        else p_scene end
    where id = p_story_id returning * into v_story;
    if coalesce(v_story.scene->>'crisis', 'false') <> 'true' and v_story.expires_at > p_now then
      perform companion.schedule_my_story_reactions(v_story, p_now);
    end if;
    return jsonb_build_object('result', 'live');
  elsif p_verdict = 'rejected' then
    perform public.companion_reject_my_photo(v_story.user_id, v_story.client_id, p_category, p_quarantine_path, p_now, null);
    delete from companion.my_stories where id = p_story_id;
    return jsonb_build_object('result', 'rejected');
  end if;
  return jsonb_build_object('result', 'retry');
end;
$$;

-- ------------------------------------------------------------------ 서버 — 글 고치기 · 교정 횟수

-- 올린 뒤에는 글(한 줄)만 고친다(ADR-0191 D10). 글 검수는 부르는 함수가 먼저 한다. 이미 온 반응은 그대로 — 남은 알람은 새 글을 본다.
create function public.companion_edit_my_story_line(
  p_user_id uuid,
  p_story_id uuid,
  p_ko text,
  p_roman text,
  p_meaning text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_story companion.my_stories;
begin
  select * into v_story from companion.my_stories
  where id = p_story_id and user_id = p_user_id and kind = 'photo' for update;
  if not found then
    return jsonb_build_object('result', 'not_found', 'story', null);
  end if;
  if v_story.edits >= (select my_story_edit_limit from companion.settings) then
    return jsonb_build_object('result', 'edit_limit', 'story', companion.my_story_json(v_story));
  end if;
  if coalesce(char_length(btrim(p_ko)), 0) not between 1 and 120 or char_length(coalesce(p_roman, '')) > 400
    or char_length(coalesce(p_meaning, '')) > 300 then
    return jsonb_build_object('result', 'invalid', 'story', null);
  end if;
  update companion.my_stories
  set ko = btrim(p_ko), roman = coalesce(p_roman, ''), meaning = btrim(coalesce(p_meaning, '')), edits = edits + 1
  where id = p_story_id returning * into v_story;
  return jsonb_build_object('result', 'ok', 'story', companion.my_story_json(v_story));
end;
$$;

-- 교정(올리기 전 · 고칠 때의 글 검수 포함) 한 번을 센다. 상한을 넘으면 allowed false — 모델을 부르지 않는다.
create function public.companion_count_story_draft(p_user_id uuid, p_now timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (p_now at time zone 'utc')::date;
  v_used integer;
begin
  if not companion.my_stories_on(p_user_id) then
    return jsonb_build_object('allowed', false, 'reason', 'off');
  end if;
  insert into companion.my_story_usage as u (day, user_id, drafts) values (v_day, p_user_id, 1)
  on conflict (day, user_id) do update set drafts = u.drafts + 1
  returning u.drafts into v_used;
  if v_used > (select my_story_draft_daily from companion.settings) then
    return jsonb_build_object('allowed', false, 'reason', 'draft_limit');
  end if;
  return jsonb_build_object(
    'allowed', true,
    'l1', (select p.l1 from companion.profiles p where p.user_id = p_user_id),
    'ageBand', companion.age_band((select p.birth_year from companion.profiles p where p.user_id = p_user_id), p_now)
  );
end;
$$;

-- ------------------------------------------------------------------ 서버 — 파일 정리

-- 지울 파일을 돌려준다. 먼저 기한이 지난 거절의 격리 파일을 대기열로 옮긴다.
create function public.companion_my_story_file_purges(p_now timestamptz, p_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  with due as (
    update companion.my_story_rejections r set quarantine_path = null
    from (
      select id, quarantine_path from companion.my_story_rejections
      where quarantine_path is not null and purge_after <= p_now
      order by purge_after limit 200 for update skip locked
    ) d
    where r.id = d.id
    returning d.quarantine_path
  )
  insert into companion.my_story_file_purges (bucket, path) select 'my-story-quarantine', quarantine_path from due;
  -- 올렸지만 스토리가 되지 못한 파일(막힌 글 · 쓴 창 · 그만둔 올리기) — 하루가 지나도 가리키는 스토리가 없으면 지운다.
  if to_regclass('storage.objects') is not null then
    execute $orphans$
      insert into companion.my_story_file_purges (bucket, path)
      select 'my-story-photos', o.name
      from storage.objects o
      where o.bucket_id = 'my-story-photos' and o.created_at < $1 - interval '1 day'
        and not exists (select 1 from companion.my_stories s where s.image_path = o.name)
        and not exists (
          select 1 from companion.my_story_file_purges q where q.bucket = 'my-story-photos' and q.path = o.name
        )
      order by o.created_at
      limit 200
    $orphans$ using p_now;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', q.id, 'bucket', q.bucket, 'path', q.path) order by q.id)
    from (select * from companion.my_story_file_purges order by id limit greatest(p_limit, 0)) q
  ), '[]'::jsonb);
end;
$$;

create function public.companion_done_my_story_file_purges(p_ids bigint[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from companion.my_story_file_purges where id = any (p_ids);
  get diagnostics v_count = row_count;
  return jsonb_build_object('deleted', v_count);
end;
$$;

-- ------------------------------------------------------------------ 앱 — 다시 확인 요청

create function public.companion_request_story_review(p_rejection_id uuid)
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
  update companion.my_story_rejections
  set review_requested_at = coalesce(review_requested_at, now())
  where id = p_rejection_id and user_id = v_user and quarantine_path is not null;
  get diagnostics v_count = row_count;
  return jsonb_build_object('result', case when v_count = 1 then 'ok' else 'not_found' end);
end;
$$;

-- ------------------------------------------------------------------ 반응 · 대화 턴이 읽는 사진 스토리

-- claim이 돌려주는 줄에 읽기 결과(장면 설명 · 말 걸 거리)를 더한다 — 정의를 통째로 다시 쓰지 않고 두 곳만 바꾼다.
do $$
declare
  v_def text := pg_get_functiondef('public.companion_claim_story_reactions(timestamptz,integer)'::regprocedure);
  v_select text := 's.kind, s.ko, s.roman, s.meaning, s.example_ko, s.lang, s.posted_at';
  v_field text := '''lang'', v_row.lang';
begin
  if position('v_row.scene' in v_def) > 0 then
    return;
  end if;
  if position(v_select in v_def) = 0 or position(v_field in v_def) = 0 then
    raise exception 'companion_claim_story_reactions: lines not found';
  end if;
  v_def := replace(v_def, v_select, v_select || ', s.scene');
  v_def := replace(v_def, v_field,
    v_field || ', ''scene'', v_row.scene->>''description'', ''hooks'', coalesce(v_row.scene->''hooks'', ''[]''::jsonb)');
  execute v_def;
end $$;

-- 이번 턴 지시에 싣는 스토리(20261228140000) — 다시 보는 중(checking)인 것은 빼고, 사진 스토리는 장면 설명을 싣는다.
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

-- ------------------------------------------------------------------ 버킷

do $storage$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('my-story-photos', 'my-story-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
      ('my-story-quarantine', 'my-story-quarantine', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
    -- 올릴 수 있는 사람(스위치 · 성인)만 자기 폴더에 올린다. 읽기는 자기 폴더. 격리 버킷에는 정책이 없다(서버 키만).
    execute 'drop policy if exists my_story_photos_owner_insert on storage.objects';
    execute $policy$
      create policy my_story_photos_owner_insert on storage.objects for insert to authenticated
        with check (
          bucket_id = 'my-story-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
          and public.companion_can_upload_story_photo()
        )
    $policy$;
    execute 'drop policy if exists my_story_photos_owner_read on storage.objects';
    execute $policy$
      create policy my_story_photos_owner_read on storage.objects for select to authenticated
        using (bucket_id = 'my-story-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
    $policy$;
  end if;
end
$storage$;

-- ------------------------------------------------------------------ 권한

revoke all on function public.companion_can_upload_story_photo() from public, anon;
revoke all on function public.companion_request_story_review(uuid) from public, anon;
revoke all on function public.companion_my_photo_gate(uuid, uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_save_my_photo_story(uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, text, integer, timestamptz)
  from public, anon, authenticated;
revoke all on function public.companion_reject_my_photo(uuid, uuid, text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.companion_my_story_checks_due(timestamptz, integer) from public, anon, authenticated;
revoke all on function public.companion_resolve_my_story_check(uuid, text, jsonb, text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.companion_edit_my_story_line(uuid, uuid, text, text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.companion_count_story_draft(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_my_story_file_purges(timestamptz, integer) from public, anon, authenticated;
revoke all on function public.companion_done_my_story_file_purges(bigint[]) from public, anon, authenticated;
grant execute on function public.companion_can_upload_story_photo() to authenticated;
grant execute on function public.companion_request_story_review(uuid) to authenticated;
grant execute on function public.companion_my_photo_gate(uuid, uuid, integer, timestamptz) to service_role;
grant execute on function public.companion_save_my_photo_story(uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, text, integer, timestamptz)
  to service_role;
grant execute on function public.companion_reject_my_photo(uuid, uuid, text, text, timestamptz, text) to service_role;
grant execute on function public.companion_my_story_checks_due(timestamptz, integer) to service_role;
grant execute on function public.companion_resolve_my_story_check(uuid, text, jsonb, text, text, timestamptz) to service_role;
grant execute on function public.companion_edit_my_story_line(uuid, uuid, text, text, text, timestamptz) to service_role;
grant execute on function public.companion_count_story_draft(uuid, timestamptz) to service_role;
grant execute on function public.companion_my_story_file_purges(timestamptz, integer) to service_role;
grant execute on function public.companion_done_my_story_file_purges(bigint[]) to service_role;
