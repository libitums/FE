-- 친구 스토리 AI 생성(ADR-0192, 사용자 결정 2026-11-24). 1단계(20261228120000 — 묶음을 날마다 돌림) 위에 쌓는다.
-- 1. 스위치 `settings.story_schedule`: `pool`(기본 — 1단계 그대로, 인물마다 날마다 하나) · `cadence`(인물별 빈도 `story_cadence`).
--    `story_cadence`: { epoch, daily: { 인물: 시 }, weekly: { 인물: { dow, hour } }, groups: [{ 인물: 시 }, …] } — 시는 UTC,
--    조는 epoch부터 하루씩 돌아간다. 설정에 없는 인물은 `cadence`에서 올리지 않는다(그날로 승인된 스토리가 있을 때만).
-- 2. 초안 `story_drafts` — 인물 · 날짜마다 하나. 컷은 셀카 · 남이 찍어 준 컷 · 인물 없음(손까지) — 비율은 `settings.story_shot_mix`(0.3 · 0.2 · 0.5). planned(글 초안) → queued(기획 승인 — 그림 대기) → drawing → ready(그림 있음 — 최종 승인 대기) ·
--    failed(그림 실패) → approved(그날 올림) → published. 버리면 discarded.
--    최종 승인하면 묶음 `story_pool`에 그날짜 한 번짜리 줄(`publish_on`)이 생긴다 — 앱 읽기 · 인용 · 알림 · 첫 답장 무료는 1단계 그대로 그 줄을 본다.
-- 3. 주간 메모 `story_plans` — 그 주(월요일)의 소재 조사(`research` · `sources`)와 사람이 고친 메모(`notes`).
-- 4. `companion_post_stories(now)` — 그날로 승인된 줄이 있으면 그것을, 없으면 올릴 차례인 인물만 묶음에서(가장 적게 올린 줄). 한 번짜리 줄은 돌려쓰지 않는다.
-- 5. 운영 도구용 서버 역할 RPC: 달력 · 초안 목록 · 기획 맥락 · 초안 넣기 · 검토(기획 승인 · 고치기 · 그림 다시 · 그림 직접 · 최종 승인 · 승인 취소 · 버리기) ·
--    그림 일꾼의 고르기 · 닫기. 앱이 부르는 것은 없다.

alter table companion.settings
  add column if not exists story_schedule text not null default 'pool' check (story_schedule in ('pool', 'cadence')),
  add column if not exists story_cadence jsonb not null default jsonb_build_object(
    'epoch', '2026-11-23',
    'daily', jsonb_build_object('duksu', 1),
    'weekly', jsonb_build_object('yoonkyung', jsonb_build_object('dow', 6, 'hour', 10)),
    'groups', jsonb_build_array(
      jsonb_build_object('seoyeon', 2, 'geonwoo', 8, 'doyun', 14),
      jsonb_build_object('daeun', 3, 'jaemin', 9),
      jsonb_build_object('mina', 4, 'haejun', 10)
    )
  ) check (jsonb_typeof(story_cadence) = 'object' and pg_column_size(story_cadence) <= 8000),
  -- 그림의 컷 비율(사용자 결정 2026-11-24): 셀카 · 남이 찍어 준 컷 · 인물 없음(손까지). 초안을 쓸 때 코드가 이 비율에 가깝게 컷을 배정한다.
  add column if not exists story_shot_mix jsonb not null default '{"selfie": 0.3, "other": 0.2, "scene": 0.5}'::jsonb
    check (jsonb_typeof(story_shot_mix) = 'object' and pg_column_size(story_shot_mix) <= 400);

-- ------------------------------------------------------------------ 표

create table companion.story_drafts (
  id uuid primary key default gen_random_uuid(),
  character_id text not null references companion.characters (id),
  -- 올릴 날(UTC 날짜 — `stories.day`와 같은 기준).
  publish_on date not null,
  status text not null default 'planned'
    check (status in ('planned', 'queued', 'drawing', 'ready', 'failed', 'approved', 'published', 'discarded')),
  -- 소재 한 줄과 메모(출처 · 왜 이 인물에게). 운영 도구에만 보인다.
  topic text not null default '' check (char_length(topic) <= 200),
  note text not null default '' check (char_length(note) <= 800),
  line_ko text not null check (char_length(line_ko) between 1 and 120),
  -- 로마자는 한 줄보다 두세 배 길다(음절마다 두세 글자).
  line_roman text not null check (char_length(line_roman) between 1 and 400),
  meaning jsonb not null check (coalesce(jsonb_typeof(meaning->'en') = 'string', false) and pg_column_size(meaning) <= 8000),
  replies jsonb not null check (
    jsonb_typeof(replies) = 'array' and jsonb_array_length(replies) between 1 and 3
    and not jsonb_path_exists(replies, '$[*] ? (@.type() != "string")')
  ),
  word jsonb check (
    word is null or coalesce(jsonb_typeof(word->'episodeId') = 'string' and jsonb_typeof(word->'ref') = 'string', false)
  ),
  -- 그림 주문: selfie(인물이 팔을 뻗어 찍은 셀카) · other(남이 찍어 준 컷 — 인물이 화면 안에) — 둘은 기준 그림을 쓴다 ·
  -- scene(인물이 없거나 손 정도만 나오는 사물 · 풍경 컷). `scene`은 영어 한두 문장.
  shot text not null default 'scene' check (shot in ('selfie', 'other', 'scene')),
  scene text not null default '' check (char_length(scene) <= 600),
  image_path text check (image_path is null or image_path ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]{0,199}$'),
  image_source text check (image_source is null or image_source in ('generated', 'uploaded')),
  -- 그림 근거(장면 설계 · 검사 판정 · 모델 · 걸린 시간 · 토큰). 운영 진단용.
  image_meta jsonb not null default '{}'::jsonb check (pg_column_size(image_meta) <= 16000),
  image_tries integer not null default 0,
  image_error text check (image_error is null or char_length(image_error) <= 300),
  -- 그림을 보고 문구를 맞추기 전의 글 { ko, roman, en, replies, word } — 처음 고칠 때 한 번 남긴다. 「그림 다시」는 이 글로 되돌려 다시 맞추고,
  -- 사람이 글을 고치면 비운다(그때부터는 사람의 글이 기준이다).
  line_draft jsonb check (line_draft is null or pg_column_size(line_draft) <= 4000),
  claimed_at timestamptz,
  pool_id text references companion.story_pool (id) on delete set null,
  created_by text check (created_by is null or char_length(created_by) <= 120),
  reviewed_by text check (reviewed_by is null or char_length(reviewed_by) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 인물 · 날짜마다 살아 있는 초안은 하나.
create unique index story_drafts_slot_idx on companion.story_drafts (character_id, publish_on) where status <> 'discarded';
create index story_drafts_day_idx on companion.story_drafts (publish_on);
create index story_drafts_queue_idx on companion.story_drafts (publish_on) where status in ('queued', 'drawing');

create table companion.story_plans (
  -- 그 주의 월요일.
  week date primary key,
  -- 사람이 고치는 메모(초안 쓰기가 읽는다). 인스타 카드뉴스 주제처럼 검색으로 닿지 않는 소재는 여기에 적는다.
  notes text not null default '' check (char_length(notes) <= 12000),
  -- 웹 검색이 모은 소재 후보(글)와 출처 [{ title, url }].
  research text not null default '' check (char_length(research) <= 12000),
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array' and pg_column_size(sources) <= 16000),
  researched_at timestamptz,
  updated_by text check (updated_by is null or char_length(updated_by) <= 120),
  updated_at timestamptz not null default now()
);

alter table companion.story_drafts enable row level security;
alter table companion.story_plans enable row level security;
revoke all on table companion.story_drafts, companion.story_plans from public, anon, authenticated;

alter table companion.story_pool
  drop constraint story_pool_line_roman_check,
  add constraint story_pool_line_roman_check check (char_length(line_roman) between 1 and 400),
  -- 그날 한 번만 올리는 줄(AI 생성 · 승인됨). null이면 1단계의 돌려쓰는 줄.
  add column publish_on date,
  add column draft_id uuid references companion.story_drafts (id) on delete set null;
create unique index story_pool_publish_idx on companion.story_pool (character_id, publish_on) where publish_on is not null;

-- ------------------------------------------------------------------ 빈도

-- 설정값 → 정수. 숫자가 아니거나 `p_min` ~ `p_max` 밖이면 `p_fallback`(큰 수를 정수로 바꾸다 던지지 않게 범위를 먼저 본다).
create function companion.story_int(p_value jsonb, p_min integer, p_max integer, p_fallback integer)
returns integer language sql immutable as $$
  select case when jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between p_min and p_max
    then floor((p_value #>> '{}')::numeric)::integer
    else p_fallback end
$$;
revoke all on function companion.story_int(jsonb, integer, integer, integer) from public;

-- 설정값 → 시(0 ~ 23). 틀리면 `p_fallback`.
create function companion.story_hour(p_value jsonb, p_fallback integer)
returns integer language sql immutable as $$
  select companion.story_int(p_value, 0, 23, p_fallback)
$$;
revoke all on function companion.story_hour(jsonb, integer) from public;

-- 인물의 올림 시각(UTC). `cadence`면 설정(매일 · 주 1회 · 조)에서 찾고, 없으면 1단계의 해시 시각.
create function companion.story_cadence_hour(p_character_id text)
returns integer language sql stable as $$
  select case when s.story_schedule = 'pool' then companion.story_post_hour(p_character_id)
    else coalesce(
      case when s.story_cadence->'daily' ? p_character_id
        then companion.story_hour(s.story_cadence->'daily'->p_character_id, null) end,
      case when s.story_cadence->'weekly' ? p_character_id
        then companion.story_hour(s.story_cadence->'weekly'->p_character_id->'hour', null) end,
      (select companion.story_hour(g.value->p_character_id, null)
       from jsonb_array_elements(case when jsonb_typeof(s.story_cadence->'groups') = 'array' then s.story_cadence->'groups' else '[]'::jsonb end) g
       where jsonb_typeof(g.value) = 'object' and g.value ? p_character_id
       limit 1),
      companion.story_post_hour(p_character_id)
    ) end
  from companion.settings s
$$;
revoke all on function companion.story_cadence_hour(text) from public;

-- 그 인물이 그날(UTC) 빈도 설정에서 올릴 차례인가 — 스위치와 상관없이 본다. 기획(달력 · 빈 자리)은 늘 이것을 쓴다:
-- `pool`인 동안에도 `cadence`로 넘어갈 한 주를 미리 기획 · 승인해 볼 수 있다(승인된 줄은 그날 묶음 대신 올라간다).
create function companion.story_cadence_due(p_character_id text, p_day date)
returns boolean language plpgsql stable as $$
declare
  v_c jsonb;
  v_groups jsonb;
  v_n integer;
  v_epoch date := date '2026-11-23';
  v_dow integer;
begin
  select story_cadence into v_c from companion.settings;
  if v_c->'daily' ? p_character_id then
    return true;
  end if;
  if v_c->'weekly' ? p_character_id then
    -- dow: 0 = 일요일 … 6 = 토요일. 틀린 값이면 토요일.
    v_dow := companion.story_int(v_c->'weekly'->p_character_id->'dow', 0, 6, 6);
    return extract(dow from p_day)::integer = v_dow;
  end if;
  v_groups := case when jsonb_typeof(v_c->'groups') = 'array' then v_c->'groups' else '[]'::jsonb end;
  v_n := jsonb_array_length(v_groups);
  if v_n = 0 then
    return false;
  end if;
  begin
    if v_c->>'epoch' ~ '^\d{4}-\d{2}-\d{2}$' then
      v_epoch := (v_c->>'epoch')::date;
    end if;
  exception when others then
    v_epoch := date '2026-11-23';
  end;
  return coalesce(jsonb_typeof(v_groups->((((p_day - v_epoch) % v_n) + v_n) % v_n)) = 'object'
    and (v_groups->((((p_day - v_epoch) % v_n) + v_n) % v_n)) ? p_character_id, false);
end;
$$;
revoke all on function companion.story_cadence_due(text, date) from public;

-- 그 인물이 그날(UTC) 올릴 차례인가(올림이 쓴다). `pool`이면 늘 참 — 1단계 그대로 날마다.
create function companion.story_due(p_character_id text, p_day date)
returns boolean language sql stable as $$
  select (select story_schedule from companion.settings) = 'pool' or companion.story_cadence_due(p_character_id, p_day)
$$;
revoke all on function companion.story_due(text, date) from public;

-- ------------------------------------------------------------------ 올림

create or replace function public.companion_post_stories(p_now timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (p_now at time zone 'utc')::date;
  v_hour integer := extract(hour from p_now at time zone 'utc')::integer;
  v_character text;
  v_pool text;
  v_draft uuid;
  v_id uuid;
  v_posted jsonb := '[]'::jsonb;
begin
  if (select friend_stories from companion.settings) = 'off' then
    return jsonb_build_object('posted', v_posted);
  end if;
  for v_character in
    select c.id from companion.characters c
    where c.active
      and companion.story_cadence_hour(c.id) <= v_hour
      and not exists (select 1 from companion.stories s where s.character_id = c.id and s.day = v_day)
    order by c.id
  loop
    -- 그날로 승인된 한 번짜리 줄이 먼저다(차례가 아닌 날이어도 올린다 — 사람이 그날로 정했다).
    select p.id, p.draft_id into v_pool, v_draft from companion.story_pool p
    where p.character_id = v_character and p.active and p.publish_on = v_day;
    if v_pool is null then
      continue when not companion.story_due(v_character, v_day);
      v_draft := null;
      select p.id into v_pool from companion.story_pool p
      where p.character_id = v_character and p.active and p.publish_on is null
      order by (select count(*) from companion.stories s where s.pool_id = p.id), p.id
      limit 1;
      continue when v_pool is null;
    elsif v_draft is not null then
      -- 검토(초안 → 묶음 줄 순으로 잠근다)와 같은 순서로 잠근다. 그 사이 승인이 풀렸으면 다음 회차에 묶음에서 올린다.
      perform 1 from companion.story_drafts where id = v_draft for update;
      continue when not exists (select 1 from companion.story_pool p where p.id = v_pool and p.publish_on = v_day);
    end if;
    v_id := null;
    insert into companion.stories (pool_id, character_id, day, posted_at, expires_at)
    values (v_pool, v_character, v_day, p_now, p_now + interval '24 hours')
    on conflict (character_id, day) do nothing
    returning id into v_id;
    if v_id is not null then
      if v_draft is not null then
        update companion.story_drafts set status = 'published', updated_at = p_now
        where id = v_draft and status = 'approved';
      end if;
      v_posted := v_posted || jsonb_build_array(jsonb_build_object(
        'storyId', v_id, 'characterId', v_character, 'poolId', v_pool, 'generated', v_draft is not null));
    end if;
  end loop;
  return jsonb_build_object('posted', v_posted);
end;
$$;

-- ------------------------------------------------------------------ 초안 읽기

create function companion.story_draft_json(d companion.story_drafts)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', d.id,
    'characterId', d.character_id,
    'publishOn', to_char(d.publish_on, 'YYYY-MM-DD'),
    'status', d.status,
    'topic', d.topic,
    'note', d.note,
    'line', jsonb_build_object('ko', d.line_ko, 'roman', d.line_roman, 'meaning', d.meaning),
    'replies', d.replies,
    'word', d.word,
    'shot', d.shot,
    'scene', d.scene,
    'imagePath', d.image_path,
    'imageSource', d.image_source,
    'imageMeta', d.image_meta,
    'imageTries', d.image_tries,
    'imageError', d.image_error,
    'lineDraft', d.line_draft,
    'poolId', d.pool_id,
    'createdBy', d.created_by,
    'reviewedBy', d.reviewed_by,
    'createdAt', companion.story_time(d.created_at),
    'updatedAt', companion.story_time(d.updated_at)
  )
$$;
revoke all on function companion.story_draft_json(companion.story_drafts) from public;

-- 그 인물의 기준 그림 묶음 이름(`companion-refs/v2/<slug>/manifest.json`이 있는 첫 slug — 스냅샷 v2m 묶음). 없으면 null — 인물 컷을 그릴 수 없다.
create function companion.story_ref_slug(p_character_id text)
returns text language plpgsql stable as $$
declare
  v_cfg jsonb := (select media from companion.characters where id = p_character_id);
  v_slug text;
  v_found boolean;
begin
  if to_regclass('storage.objects') is null then
    return null;
  end if;
  for v_slug in select value from jsonb_array_elements_text(
    case when jsonb_typeof(v_cfg->'refSlugs') = 'array' then v_cfg->'refSlugs' else jsonb_build_array(p_character_id) end
  ) loop
    execute 'select exists (select 1 from storage.objects where bucket_id = ''companion-refs'' and name = $1)'
    into v_found using 'v2/' || v_slug || '/manifest.json';
    if v_found then
      return v_slug;
    end if;
  end loop;
  return null;
end;
$$;
revoke all on function companion.story_ref_slug(text) from public;

-- 달력: 날마다 올릴 차례인 인물 · 시각 · 그 자리의 초안 · 이미 올렸는가. 차례가 아니어도 초안이 있으면 싣는다.
-- 차례는 빈도 설정대로 본다(`pool`인 동안에도 — 그때 `posted`는 묶음에서 올라간 것일 수 있다).
create function public.companion_story_calendar(p_from date, p_days integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with days as (
    select (p_from + i)::date as day from generate_series(0, least(greatest(p_days, 1), 35) - 1) i
  ),
  cells as (
    select d.day, c.id as character_id, c.sort_order,
      companion.story_cadence_due(c.id, d.day) as due,
      companion.story_cadence_hour(c.id) as hour,
      (select dr from companion.story_drafts dr
       where dr.character_id = c.id and dr.publish_on = d.day and dr.status <> 'discarded') as draft,
      exists (select 1 from companion.stories s where s.character_id = c.id and s.day = d.day) as posted
    from days d cross join companion.characters c
    where c.active
  )
  select jsonb_build_object(
    'schedule', (select story_schedule from companion.settings),
    'cadence', (select story_cadence from companion.settings),
    'shotMix', (select story_shot_mix from companion.settings),
    'characters', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', coalesce(c.persona->>'name', c.id),
        'hour', companion.story_cadence_hour(c.id),
        'hasRef', companion.story_ref_slug(c.id) is not null,
        'poolSize', (select count(*) from companion.story_pool p where p.character_id = c.id and p.active and p.publish_on is null)
      ) order by c.sort_order, c.id)
      from companion.characters c where c.active
    ), '[]'::jsonb),
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', to_char(d.day, 'YYYY-MM-DD'),
        'slots', coalesce((
          select jsonb_agg(jsonb_build_object(
            'characterId', x.character_id,
            'hour', x.hour,
            'due', x.due,
            'posted', x.posted,
            'draftId', (x.draft).id,
            'status', (x.draft).status
          ) order by x.hour, x.sort_order, x.character_id)
          from cells x where x.day = d.day and (x.due or (x.draft).id is not null)
        ), '[]'::jsonb)
      ) order by d.day)
      from days d
    ), '[]'::jsonb)
  )
$$;

create function public.companion_story_drafts(p_from date, p_to date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('drafts', coalesce((
    select jsonb_agg(companion.story_draft_json(d) order by d.publish_on, d.character_id, d.created_at)
    from companion.story_drafts d
    where d.publish_on between p_from and p_to
  ), '[]'::jsonb))
$$;

-- 주간 메모 읽기 · 쓰기. `p_notes` · `p_research`가 null이면 그 칸은 그대로 둔다.
create function public.companion_story_plan(p_week date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_build_object(
      'week', to_char(p.week, 'YYYY-MM-DD'), 'notes', p.notes, 'research', p.research, 'sources', p.sources,
      'researchedAt', case when p.researched_at is null then null else companion.story_time(p.researched_at) end,
      'updatedBy', p.updated_by, 'updatedAt', companion.story_time(p.updated_at))
    from companion.story_plans p where p.week = date_trunc('week', p_week)::date
  ), jsonb_build_object('week', to_char(date_trunc('week', p_week)::date, 'YYYY-MM-DD'), 'notes', '', 'research', '',
    'sources', '[]'::jsonb, 'researchedAt', null, 'updatedBy', null, 'updatedAt', null))
$$;

create function public.companion_save_story_plan(
  p_week date, p_notes text, p_research text, p_sources jsonb, p_by text, p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week date := date_trunc('week', p_week)::date;
begin
  insert into companion.story_plans (week, notes, research, sources, researched_at, updated_by, updated_at)
  values (v_week, left(coalesce(p_notes, ''), 12000), left(coalesce(p_research, ''), 12000),
    case when jsonb_typeof(p_sources) = 'array' then p_sources else '[]'::jsonb end,
    case when p_research is null then null else p_now end, left(p_by, 120), p_now)
  on conflict (week) do update set
    notes = case when p_notes is null then companion.story_plans.notes else excluded.notes end,
    research = case when p_research is null then companion.story_plans.research else excluded.research end,
    sources = case when p_research is null then companion.story_plans.sources else excluded.sources end,
    researched_at = case when p_research is null then companion.story_plans.researched_at else p_now end,
    updated_by = excluded.updated_by,
    updated_at = p_now;
  return public.companion_story_plan(v_week);
end;
$$;

-- 초안 쓰기의 맥락: 인물 카드 · 겉모습 · 빈 자리(차례인데 살아 있는 초안이 없는 날) · 최근 한 줄들(겹치지 않게) · 다른 인물의 그 무렵 초안 · 그 주의 메모.
create function public.companion_story_plan_context(p_character_id text, p_from date, p_days integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'character', (
      select jsonb_build_object(
        'id', c.id, 'name', coalesce(c.persona->>'name', c.id), 'persona', c.persona,
        'look', coalesce(c.media->>'look', ''), 'hasRef', companion.story_ref_slug(c.id) is not null)
      from companion.characters c where c.id = p_character_id and c.active
    ),
    'slots', coalesce((
      select jsonb_agg(to_char(d.day, 'YYYY-MM-DD') order by d.day)
      from (select (p_from + i)::date as day from generate_series(0, least(greatest(p_days, 1), 35) - 1) i) d
      where companion.story_cadence_due(p_character_id, d.day)
        and not exists (
          select 1 from companion.story_drafts dr
          where dr.character_id = p_character_id and dr.publish_on = d.day and dr.status <> 'discarded')
        and not exists (select 1 from companion.stories s where s.character_id = p_character_id and s.day = d.day)
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(r.line order by r.day desc)
      from (
        select x.line, x.day from (
          select p.line_ko as line, s.day from companion.stories s
          join companion.story_pool p on p.id = s.pool_id
          where s.character_id = p_character_id
          union all
          select dr.line_ko, dr.publish_on from companion.story_drafts dr
          where dr.character_id = p_character_id and dr.status <> 'discarded'
          union all
          select p.line_ko, date '1970-01-01' from companion.story_pool p
          where p.character_id = p_character_id and p.active and p.publish_on is null
        ) x
        order by x.day desc
        limit 30
      ) r
    ), '[]'::jsonb),
    -- 이 인물의 최근 컷들(새것부터 스무 개)과 컷 비율 — 새 초안의 컷을 비율에 가깝게 배정한다.
    'shots', coalesce((
      select jsonb_agg(r.shot order by r.publish_on desc, r.created_at desc)
      from (
        select dr.shot, dr.publish_on, dr.created_at from companion.story_drafts dr
        where dr.character_id = p_character_id and dr.status <> 'discarded'
        order by dr.publish_on desc, dr.created_at desc
        limit 20
      ) r
    ), '[]'::jsonb),
    'shotMix', (select story_shot_mix from companion.settings),
    -- 다른 인물이 그 무렵(앞뒤 사흘 포함) 올리는 초안 — 같은 소재가 겹치지 않게.
    'others', coalesce((
      select jsonb_agg(jsonb_build_object(
        'characterId', dr.character_id, 'day', to_char(dr.publish_on, 'YYYY-MM-DD'), 'topic', dr.topic, 'line', dr.line_ko
      ) order by dr.publish_on, dr.character_id)
      from companion.story_drafts dr
      where dr.character_id <> p_character_id and dr.status <> 'discarded'
        and dr.publish_on between p_from - 3 and p_from + least(greatest(p_days, 1), 35) + 2
    ), '[]'::jsonb),
    'plan', public.companion_story_plan(p_from)
  )
$$;

-- ------------------------------------------------------------------ 초안 쓰기

-- 초안 여러 개 넣기 — [{ characterId, publishOn, topic, note, ko, roman, meaning, replies, word, shot, scene }]. 그 자리에 살아 있는 초안이
-- 있거나 값이 틀린 것은 건너뛴다(`skipped`).
create function public.companion_add_story_drafts(p_drafts jsonb, p_by text, p_now timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_row companion.story_drafts;
  v_added jsonb := '[]'::jsonb;
  v_skipped integer := 0;
begin
  if jsonb_typeof(p_drafts) is distinct from 'array' then
    return jsonb_build_object('drafts', v_added, 'skipped', 0);
  end if;
  for v_item in select value from jsonb_array_elements(p_drafts) limit 200 loop
    begin
      insert into companion.story_drafts (
        character_id, publish_on, topic, note, line_ko, line_roman, meaning, replies, word, shot, scene, created_by,
        created_at, updated_at
      )
      select c.id, (v_item->>'publishOn')::date, left(coalesce(v_item->>'topic', ''), 200), left(coalesce(v_item->>'note', ''), 800),
        btrim(v_item->>'ko'), left(btrim(v_item->>'roman'), 400), v_item->'meaning', v_item->'replies',
        case when jsonb_typeof(v_item->'word') = 'object' then v_item->'word' end,
        case when v_item->>'shot' in ('selfie', 'other') then v_item->>'shot' else 'scene' end,
        left(coalesce(v_item->>'scene', ''), 600), left(p_by, 120), p_now, p_now
      from companion.characters c
      where c.id = v_item->>'characterId' and c.active and v_item->>'publishOn' ~ '^\d{4}-\d{2}-\d{2}$'
      returning * into v_row;
      if v_row.id is null then
        v_skipped := v_skipped + 1;
      else
        v_added := v_added || jsonb_build_array(companion.story_draft_json(v_row));
        v_row := null;
      end if;
    exception when unique_violation or check_violation or not_null_violation or invalid_text_representation
      or invalid_datetime_format or datetime_field_overflow then
      v_skipped := v_skipped + 1;
    end;
  end loop;
  return jsonb_build_object('drafts', v_added, 'skipped', v_skipped);
end;
$$;

-- ------------------------------------------------------------------ 검토

-- 최종 승인된 초안 → 묶음의 그날짜 줄. 이미 그날 올렸으면 null.
create function companion.story_draft_publish(p_draft companion.story_drafts)
returns text language plpgsql as $$
declare
  v_id text := 'g' || to_char(p_draft.publish_on, 'YYYYMMDD') || '-' || left(p_draft.character_id, 50);
begin
  if exists (select 1 from companion.stories s where s.character_id = p_draft.character_id and s.day = p_draft.publish_on) then
    return null;
  end if;
  insert into companion.story_pool (
    id, character_id, image_path, line_ko, line_roman, meaning, word, replies, active, publish_on, draft_id
  ) values (
    v_id, p_draft.character_id, p_draft.image_path, p_draft.line_ko, p_draft.line_roman, p_draft.meaning,
    p_draft.word, p_draft.replies, true, p_draft.publish_on, p_draft.id
  )
  on conflict (id) do update set
    image_path = excluded.image_path, line_ko = excluded.line_ko, line_roman = excluded.line_roman,
    meaning = excluded.meaning, word = excluded.word, replies = excluded.replies, active = true,
    publish_on = excluded.publish_on, draft_id = excluded.draft_id;
  return v_id;
end;
$$;
revoke all on function companion.story_draft_publish(companion.story_drafts) from public;

-- 검토 한 번. `p_action`:
--   approve_plan(planned → queued) · edit(글 · 그림 주문 · 날짜 — 승인 전에만. 승인된 것은 승인을 풀고 고친다) · redo_image(→ queued, 승인은 풀린다) ·
--   set_image(직접 올린 그림 → ready) · approve(ready → approved, 묶음에 그날짜 줄) · unapprove(approved → ready) · discard.
-- 결과: ok · not_found · invalid · wrong_state · no_image · past_date · slot_taken · already_posted.
-- `edit`에서 한국어 한 줄이나 영어 뜻이 바뀌고 다른 언어 뜻을 같이 주지 않으면 영어만 남긴다(최종 승인 때 함수가 다시 번역한다).
-- 승인된 초안은 고칠 수 없다 — 고친 글이 사람의 두 번째 확인 · 번역 없이 그대로 나가지 않게. 그리는 중에 그림 주문을 고치면 그리던 그림은 버린다.
create function public.companion_review_story_draft(
  p_id uuid, p_action text, p_patch jsonb, p_by text, p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d companion.story_drafts;
  v_patch jsonb := case when jsonb_typeof(p_patch) = 'object' then p_patch else '{}'::jsonb end;
  v_today date := (p_now at time zone 'utc')::date;
  v_posted boolean;
  v_ko text;
  v_meaning jsonb;
  v_day date;
  v_pool text;
  v_result text := 'ok';
begin
  select * into d from companion.story_drafts where id = p_id for update;
  if not found then
    return jsonb_build_object('result', 'not_found', 'draft', null);
  end if;
  v_posted := d.status = 'published' or (
    d.status = 'approved'
    and exists (select 1 from companion.stories s where s.pool_id = d.pool_id));
  if v_posted or d.status = 'discarded' then
    return jsonb_build_object('result', case when v_posted then 'already_posted' else 'wrong_state' end,
      'draft', companion.story_draft_json(d));
  end if;

  begin
    if p_action = 'approve_plan' then
      if d.status <> 'planned' then
        v_result := 'wrong_state';
      elsif d.publish_on < v_today then
        v_result := 'past_date';
      else
        update companion.story_drafts set status = 'queued', image_tries = 0, image_error = null, claimed_at = null
        where id = p_id;
      end if;

    elsif p_action = 'edit' then
      v_ko := coalesce(nullif(btrim(v_patch->>'ko'), ''), d.line_ko);
      v_meaning := case when jsonb_typeof(v_patch->'meaning') = 'object' then v_patch->'meaning' else d.meaning end;
      if (v_ko <> d.line_ko or v_meaning->>'en' is distinct from d.meaning->>'en')
        and not (jsonb_typeof(v_patch->'meaning') = 'object'
          and (select count(*) from jsonb_object_keys(v_patch->'meaning')) > 1) then
        v_meaning := jsonb_build_object('en', v_meaning->>'en');
      end if;
      -- 날짜는 YYYY-MM-DD만 받는다(`'tomorrow'::date` 같은 말을 막는다).
      v_day := case when v_patch->>'publishOn' is null then d.publish_on
        when v_patch->>'publishOn' ~ '^\d{4}-\d{2}-\d{2}$' then (v_patch->>'publishOn')::date end;
      if v_day is null then
        v_result := 'invalid';
      elsif d.status = 'approved' then
        v_result := 'wrong_state';
      else
        update companion.story_drafts set
          line_ko = v_ko,
          line_roman = coalesce(nullif(btrim(v_patch->>'roman'), ''), line_roman),
          meaning = v_meaning,
          replies = case when jsonb_typeof(v_patch->'replies') = 'array' then v_patch->'replies' else replies end,
          word = case when v_patch ? 'word' then
            case when jsonb_typeof(v_patch->'word') = 'object' then v_patch->'word' end else word end,
          -- 사람이 글을 고쳤으면 그 글이 기준이다 — 문구 맞추기 전의 글은 버린다.
          line_draft = case when v_ko <> line_ko or v_meaning->>'en' is distinct from meaning->>'en'
            or jsonb_typeof(v_patch->'replies') = 'array' then null else line_draft end,
          topic = left(coalesce(v_patch->>'topic', topic), 200),
          note = left(coalesce(v_patch->>'note', note), 800),
          shot = case when v_patch->>'shot' in ('selfie', 'other', 'scene') then v_patch->>'shot' else shot end,
          scene = left(coalesce(v_patch->>'scene', scene), 600),
          publish_on = v_day,
          -- 그리는 중에 그림 주문이 바뀌면 다시 줄을 세운다(그리던 일꾼의 결과는 닫기에서 버려진다).
          status = case when status = 'drawing' and (
            left(coalesce(v_patch->>'scene', scene), 600) <> scene
            or (v_patch->>'shot' in ('selfie', 'other', 'scene') and v_patch->>'shot' <> shot)
          ) then 'queued' else status end,
          claimed_at = case when status = 'drawing' and (
            left(coalesce(v_patch->>'scene', scene), 600) <> scene
            or (v_patch->>'shot' in ('selfie', 'other', 'scene') and v_patch->>'shot' <> shot)
          ) then null else claimed_at end
        where id = p_id;
      end if;

    elsif p_action = 'redo_image' then
      if d.status not in ('ready', 'failed', 'approved', 'queued', 'drawing') then
        v_result := 'wrong_state';
      else
        if d.status = 'approved' then
          delete from companion.story_pool where id = d.pool_id;
        end if;
        -- 문구 맞추기가 고쳤던 글은 그 전의 글로 되돌린다 — 새 그림은 기획 승인(또는 사람)이 본 글에서 다시 맞춘다.
        update companion.story_drafts set
          line_ko = coalesce(line_draft->>'ko', line_ko),
          line_roman = coalesce(line_draft->>'roman', line_roman),
          meaning = case when line_draft is null then meaning else jsonb_build_object('en', line_draft->>'en') end,
          replies = case when line_draft is null then replies else line_draft->'replies' end,
          word = case when line_draft is null then word
            when jsonb_typeof(line_draft->'word') = 'object' then line_draft->'word' end,
          line_draft = null
        where id = p_id;
        update companion.story_drafts set
          status = 'queued', image_tries = 0, image_error = null, claimed_at = null, pool_id = null,
          shot = case when v_patch->>'shot' in ('selfie', 'other', 'scene') then v_patch->>'shot' else shot end,
          scene = left(coalesce(v_patch->>'scene', scene), 600)
        where id = p_id;
      end if;

    elsif p_action = 'set_image' then
      -- 공개 콘텐츠 버킷의 그림 폴더 안만 받는다(`..`로 다른 버킷 · 폴더를 가리키지 못하게).
      if coalesce(v_patch->>'imagePath', '') !~ '^content/images/[A-Za-z0-9/_.-]{1,180}$'
        or position('..' in v_patch->>'imagePath') > 0 then
        v_result := 'invalid';
      else
        if d.status = 'approved' then
          delete from companion.story_pool where id = d.pool_id;
        end if;
        update companion.story_drafts set
          status = 'ready', image_path = v_patch->>'imagePath', image_source = 'uploaded', image_error = null,
          claimed_at = null, pool_id = null
        where id = p_id;
      end if;

    elsif p_action = 'approve' then
      if d.status <> 'ready' then
        v_result := 'wrong_state';
      -- 번역한 글과 지금 글이 다르면(그 사이 그림 다시 · 문구 맞추기) 승인하지 않는다 — 옛 번역이 새 글에 붙지 않게.
      elsif v_patch ? 'expect' and v_patch->>'expect' is distinct from d.line_ko then
        v_result := 'wrong_state';
      elsif d.image_path is null then
        v_result := 'no_image';
      -- 오늘 날짜인데 마지막 올림 회차(매시 5분, UTC 23시)가 지났으면 올라갈 길이 없다.
      elsif d.publish_on < v_today
        or (d.publish_on = v_today and extract(hour from p_now at time zone 'utc') >= 23) then
        v_result := 'past_date';
      else
        v_pool := companion.story_draft_publish(d);
        if v_pool is null then
          v_result := 'already_posted';
        else
          update companion.story_drafts set status = 'approved', pool_id = v_pool where id = p_id;
        end if;
      end if;

    elsif p_action = 'unapprove' then
      if d.status <> 'approved' then
        v_result := 'wrong_state';
      else
        delete from companion.story_pool where id = d.pool_id;
        update companion.story_drafts set status = 'ready', pool_id = null where id = p_id;
      end if;

    elsif p_action = 'discard' then
      if d.status = 'approved' then
        delete from companion.story_pool where id = d.pool_id;
      end if;
      update companion.story_drafts set status = 'discarded', pool_id = null, claimed_at = null where id = p_id;

    else
      v_result := 'invalid';
    end if;
  exception
    when unique_violation then
      v_result := 'slot_taken';
    -- 묶음 줄을 지우려는 사이 올림이 그 줄을 썼다(예약 작업과 겹침).
    when foreign_key_violation then
      v_result := 'already_posted';
    when check_violation or not_null_violation or invalid_text_representation or invalid_datetime_format
      or datetime_field_overflow then
      v_result := 'invalid';
  end;

  if v_result = 'ok' then
    update companion.story_drafts set reviewed_by = left(p_by, 120), updated_at = p_now where id = p_id;
    select * into d from companion.story_drafts where id = p_id;
  else
    select * into d from companion.story_drafts where id = p_id;
  end if;
  return jsonb_build_object('result', v_result, 'draft', companion.story_draft_json(d));
end;
$$;

create function public.companion_story_draft(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select companion.story_draft_json(d) from companion.story_drafts d where d.id = p_id
$$;

-- ------------------------------------------------------------------ 그림 일꾼

-- 그릴 초안 고르기 — 올릴 날이 가까운 것부터 `p_limit`개를 drawing으로(지난 날짜는 그리지 않는다). 10분 넘게 drawing인 줄(일꾼이 죽음)은
-- 다시 queued로 돌리되 세 번 시도했으면 failed로 끝낸다. 돌려주는 `claimedAt`은 닫기의 증표다 — 그 사이 다시 고른 줄을 늦게 끝난 일꾼이 덮지 못한다.
-- 줄마다 그리는 데 필요한 것을 싣는다: 인물 이름 · 겉모습 · 기준 그림 묶음 이름 · 이 인물의 최근 장면 설계 여섯(같은 구도를 되풀이하지 않게) ·
-- 그림 뒤에 문구를 맞추는 데 쓸 인물 카드 · 추천 답안 · 단어.
create function public.companion_claim_story_images(p_now timestamptz, p_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows jsonb;
begin
  update companion.story_drafts set
    status = case when image_tries >= 3 then 'failed' else 'queued' end,
    image_error = case when image_tries >= 3 then 'worker timed out' else image_error end,
    claimed_at = null, updated_at = p_now
  where status = 'drawing' and claimed_at < p_now - interval '10 minutes';

  with picked as (
    select d.id from companion.story_drafts d
    where d.status = 'queued' and d.publish_on >= (p_now at time zone 'utc')::date
    order by d.publish_on, d.created_at
    limit least(greatest(p_limit, 0), 10)
    for update skip locked
  ),
  claimed as (
    update companion.story_drafts d
    set status = 'drawing', claimed_at = p_now, image_tries = d.image_tries + 1, updated_at = p_now
    from picked where d.id = picked.id
    returning d.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'characterId', c.character_id,
    'characterName', coalesce(ch.persona->>'name', c.character_id),
    'look', coalesce(ch.media->>'look', ''),
    'persona', ch.persona,
    'refSlug', companion.story_ref_slug(c.character_id),
    'publishOn', to_char(c.publish_on, 'YYYY-MM-DD'),
    'topic', c.topic,
    'ko', c.line_ko,
    'meaning', coalesce(c.meaning->>'en', ''),
    'replies', c.replies,
    'word', c.word,
    'shot', c.shot,
    'scene', c.scene,
    'tries', c.image_tries,
    'claimedAt', to_char(c.claimed_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'previousPath', case when c.image_source = 'generated' then c.image_path end,
    'recent', coalesce((
      select jsonb_agg(r.plan order by r.updated_at desc)
      from (
        select o.image_meta->'plan' as plan, o.updated_at from companion.story_drafts o
        where o.character_id = c.character_id and o.id <> c.id and jsonb_typeof(o.image_meta->'plan') = 'object'
        order by o.updated_at desc
        limit 6
      ) r
    ), '[]'::jsonb),
    'engine', (select snapshot_engine from companion.settings),
    'quality', (select snapshot_quality from companion.settings)
  ) order by c.publish_on), '[]'::jsonb)
  into v_rows
  from claimed c
  join companion.characters ch on ch.id = c.character_id;
  return jsonb_build_object('rows', v_rows);
end;
$$;

-- 그림 한 장 닫기. 성공이면 ready(경로 · 근거 저장). 실패면 세 번까지 다시 queued, 그 뒤로는 failed(사람이 다시 그리기 · 직접 올리기 · 버리기).
-- `p_retry`가 거짓이면(설계 · 검사가 「그릴 수 없음」으로 판단) 바로 failed. 그 사이 사람이 손댔거나(drawing이 아님) 다른 일꾼이 다시 고른 줄
-- (`p_claimed_at`이 다름)은 건드리지 않는다.
-- `p_line`(그림을 보고 맞춘 문구 — { from, ko, roman, en, replies, word })이 있으면 그 글로 바꾸고 그 전의 글을 `line_draft`에 남긴다. 영어 뜻만
-- 남으므로 최종 승인이 다시 번역한다. 글이 틀리거나(길이 · 모양) 그리는 사이 사람이 글을 고쳤으면(`from`이 다름) 그림은 저장하고 글은 그대로 둔다
-- (`image_meta.caption`을 "rejected"로 고친다).
create function public.companion_finish_story_image(
  p_id uuid, p_claimed_at timestamptz, p_ok boolean, p_image_path text, p_meta jsonb, p_error text, p_retry boolean,
  p_now timestamptz, p_line jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d companion.story_drafts;
begin
  select * into d from companion.story_drafts where id = p_id for update;
  if not found or d.status <> 'drawing' or d.claimed_at is distinct from p_claimed_at then
    return jsonb_build_object('saved', false);
  end if;
  if p_ok and p_image_path is not null then
    update companion.story_drafts set
      status = 'ready', image_path = p_image_path, image_source = 'generated',
      image_meta = coalesce(p_meta, '{}'::jsonb), image_error = null, claimed_at = null, updated_at = p_now
    where id = p_id;
    if jsonb_typeof(p_line) = 'object' then
      -- 그리는 사이 사람이 글을 고쳤으면(`from`이 지금 글과 다름) 맞춘 글을 쓰지 않는다 — 사람의 글이 이긴다.
      if coalesce(btrim(p_line->>'en'), '') = '' or (p_line ? 'from' and p_line->>'from' is distinct from d.line_ko) then
        update companion.story_drafts set image_meta = jsonb_set(image_meta, '{caption}', '"rejected"') where id = p_id;
        return jsonb_build_object('saved', true, 'status', 'ready', 'line', false);
      end if;
      begin
        update companion.story_drafts set
          line_draft = coalesce(line_draft, jsonb_build_object(
            'ko', d.line_ko, 'roman', d.line_roman, 'en', d.meaning->>'en', 'replies', d.replies, 'word', d.word)),
          line_ko = btrim(p_line->>'ko'),
          line_roman = left(btrim(p_line->>'roman'), 400),
          meaning = jsonb_build_object('en', btrim(p_line->>'en')),
          replies = p_line->'replies',
          word = case when jsonb_typeof(p_line->'word') = 'object' then p_line->'word' end
        where id = p_id;
      exception when check_violation or not_null_violation then
        update companion.story_drafts set image_meta = jsonb_set(image_meta, '{caption}', '"rejected"') where id = p_id;
        return jsonb_build_object('saved', true, 'status', 'ready', 'line', false);
      end;
    end if;
    return jsonb_build_object('saved', true, 'status', 'ready');
  end if;
  update companion.story_drafts set
    status = case when coalesce(p_retry, true) and d.image_tries < 3 then 'queued' else 'failed' end,
    image_meta = coalesce(p_meta, image_meta), image_error = left(coalesce(p_error, 'failed'), 300),
    claimed_at = null, updated_at = p_now
  where id = p_id
  returning * into d;
  return jsonb_build_object('saved', true, 'status', d.status);
end;
$$;

revoke all on function public.companion_story_calendar(date, integer) from public, anon, authenticated;
revoke all on function public.companion_story_drafts(date, date) from public, anon, authenticated;
revoke all on function public.companion_story_plan(date) from public, anon, authenticated;
revoke all on function public.companion_save_story_plan(date, text, text, jsonb, text, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_story_plan_context(text, date, integer) from public, anon, authenticated;
revoke all on function public.companion_add_story_drafts(jsonb, text, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_review_story_draft(uuid, text, jsonb, text, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_story_draft(uuid) from public, anon, authenticated;
revoke all on function public.companion_claim_story_images(timestamptz, integer) from public, anon, authenticated;
revoke all on function public.companion_finish_story_image(uuid, timestamptz, boolean, text, jsonb, text, boolean, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.companion_story_calendar(date, integer) to service_role;
grant execute on function public.companion_story_drafts(date, date) to service_role;
grant execute on function public.companion_story_plan(date) to service_role;
grant execute on function public.companion_save_story_plan(date, text, text, jsonb, text, timestamptz) to service_role;
grant execute on function public.companion_story_plan_context(text, date, integer) to service_role;
grant execute on function public.companion_add_story_drafts(jsonb, text, timestamptz) to service_role;
grant execute on function public.companion_review_story_draft(uuid, text, jsonb, text, timestamptz) to service_role;
grant execute on function public.companion_story_draft(uuid) to service_role;
grant execute on function public.companion_claim_story_images(timestamptz, integer) to service_role;
grant execute on function public.companion_finish_story_image(uuid, timestamptz, boolean, text, jsonb, text, boolean, timestamptz, jsonb) to service_role;
