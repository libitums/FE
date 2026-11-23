-- 친구 스토리 1단계(ADR-0177, 사용자 결정 2026-11-23). 인물마다 미리 만든 묶음(사진 · 한국어 한 줄 · 단어)을 날마다 하나씩 올리고, 24시간 살아 있다.
-- 1. 스위치 `settings.friend_stories`(스토리 — 올림 · 앱 읽기 · 무료 답장) · `settings.story_push`(알림): off(기본) · testers · on.
-- 2. 표 셋: 묶음 `story_pool`(정본 `docs/content/friend-stories.json`, 내용은 20261228130000) · 올림 `stories`(인물 · UTC 하루마다 하나) ·
--    답장 `story_replies`(사용자 · 클라이언트 메시지마다 — 인용과 첫 답장 무료 표시). 셋 다 RLS 켬, 앱은 직접 읽지 않는다.
-- 3. `companion_post_stories(now)` — 서버 역할(pg_cron 매시 → `companion-stories`). 인물의 올림 시각(UTC 01 ~ 10시)이 지났고 오늘 올린 것이 없으면
--    가장 적게 올린 묶음 줄(같으면 id 순)을 올린다.
-- 4. `companion_friend_stories()` — 앱 읽기(authenticated). 살아 있는 스토리 + 이 사람의 첫 답장 무료가 남았는가.
-- 5. `companion_claim_story_reply(…)` — chat-send가 관문 전에 부른다(서버 역할). 첫 답장이면 그 메시지에 금액 0 예약을 먼저 둔다 — `begin_turn`은 같은
--    메시지의 예약이 있으면 그대로 쓴다(구독 무료 턴과 같은 길). 관문의 엽전 부족 판정은 그 메시지의 열린 예약이 있으면 건너뛴다(정의에서 그 줄만 바꿈).
-- 6. 기록 읽기(`message_json`)의 내 메시지에 스토리 인용 `story`를 싣는다.
-- 7. 알림 후보 `companion_story_push_candidates(now, limit)` · 선톡 푸시 문의 `pushedToday` — 선톡과 합쳐 하루(현지) 한 번.

alter table companion.settings
  add column if not exists friend_stories text not null default 'off' check (friend_stories in ('off', 'testers', 'on')),
  add column if not exists story_push text not null default 'off' check (story_push in ('off', 'testers', 'on'));

-- ------------------------------------------------------------------ 표

create table companion.story_pool (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  character_id text not null references companion.characters (id),
  -- 버킷 상대 경로(이미 있는 앱 · 버킷 그림, 예: content/images/u01-water/cult-u01-1plus1.webp). 앱이 아바타와 같은 해석기로 주소를 만든다.
  image_path text not null check (image_path ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]{0,199}$'),
  line_ko text not null check (char_length(line_ko) between 1 and 120),
  line_roman text not null check (char_length(line_roman) between 1 and 200),
  -- 언어별 뜻(en 필수). 인물의 한국어 한 줄은 번역하지 않고 뜻만 싣는다.
  meaning jsonb not null check (coalesce(jsonb_typeof(meaning->'en') = 'string', false)),
  -- 카탈로그 단어 카드의 `voca:` ref — { episodeId, ref }. 없으면 null.
  word jsonb check (
    word is null or coalesce(jsonb_typeof(word->'episodeId') = 'string' and jsonb_typeof(word->'ref') = 'string', false)
  ),
  -- 답장 칩(한국어 1 ~ 3개).
  replies jsonb not null check (
    jsonb_typeof(replies) = 'array' and jsonb_array_length(replies) between 1 and 3
    and not jsonb_path_exists(replies, '$[*] ? (@.type() != "string")')
  ),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table companion.stories (
  id uuid primary key default gen_random_uuid(),
  pool_id text not null references companion.story_pool (id),
  character_id text not null references companion.characters (id),
  -- 올린 UTC 날짜 — 인물마다 하루 하나.
  day date not null,
  posted_at timestamptz not null,
  expires_at timestamptz not null,
  unique (character_id, day)
);
create index stories_expires_idx on companion.stories (expires_at);
create index stories_pool_idx on companion.stories (pool_id);

create table companion.story_replies (
  user_id uuid not null references auth.users (id) on delete cascade,
  client_message_id uuid not null,
  story_id uuid not null references companion.stories (id) on delete cascade,
  character_id text not null,
  -- 이 메시지가 그 스토리의 첫 답장 무료를 받았는가(턴이 실패해 예약이 풀리면 무료가 다시 산다 — `story_free_used`).
  free boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, client_message_id)
);
create index story_replies_story_idx on companion.story_replies (user_id, story_id);

alter table companion.story_pool enable row level security;
alter table companion.stories enable row level security;
alter table companion.story_replies enable row level security;
revoke all on table companion.story_pool, companion.stories, companion.story_replies from public, anon, authenticated;

-- ------------------------------------------------------------------ 도움 함수

-- 인물의 올림 시각(UTC 01 ~ 10시) — id 해시로 고정. 동남아 · 남아시아 현지 낮(08 ~ 18시 언저리)에 올라온다.
create function companion.story_post_hour(p_character_id text)
returns integer language sql immutable as $$
  select 1 + (abs(hashtext(p_character_id)::bigint) % 10)::integer
$$;
revoke all on function companion.story_post_hour(text) from public;

-- 스토리 스위치가 이 사람에게 켜져 있는가.
create function companion.stories_on(p_user_id uuid)
returns boolean language sql stable as $$
  select case (select friend_stories from companion.settings)
    when 'on' then true
    when 'testers' then companion.is_tester(p_user_id)
    else false
  end
$$;
revoke all on function companion.stories_on(uuid) from public;

-- 그 메시지의 열린 · 확정된 예약이 있는가(관문 엽전 판정 · 무료 판정).
create function companion.message_hold_exists(p_user_id uuid, p_client_message_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from companion.credit_holds
    where user_id = p_user_id and client_message_id = p_client_message_id and status <> 'released'
  )
$$;
revoke all on function companion.message_hold_exists(uuid, uuid) from public;

-- 이 사람이 그 스토리의 첫 답장 무료를 이미 썼는가 — 무료 줄의 예약이 풀리지 않았으면 썼다. `p_except`는 지금 다시 보는 메시지.
create function companion.story_free_used(p_user_id uuid, p_story_id uuid, p_except uuid default null)
returns boolean language sql stable as $$
  select exists (
    select 1 from companion.story_replies r
    where r.user_id = p_user_id and r.story_id = p_story_id and r.free
      and r.client_message_id is distinct from p_except
      and companion.message_hold_exists(p_user_id, r.client_message_id)
  )
$$;
revoke all on function companion.story_free_used(uuid, uuid, uuid) from public;

create function companion.story_time(p_at timestamptz)
returns text language sql immutable as $$
  select to_char(p_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;
revoke all on function companion.story_time(timestamptz) from public;

-- 대화 기록의 인용 — 그 메시지가 스토리 답장이면 { id, characterId, line, imagePath, postedAt }, 아니면 null.
create function companion.story_quote_json(p_user_id uuid, p_client_message_id uuid)
returns jsonb language sql stable as $$
  select jsonb_build_object(
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
$$;
revoke all on function companion.story_quote_json(uuid, uuid) from public;

-- 사람의 현지 시간대 — 프로필 · 마지막 지역 · 학습 나라 순(선톡 · 자동 캠페인과 같은 표). 모르면 null.
create function companion.user_timezone(p_user_id uuid)
returns text language sql stable as $$
  select coalesce(
    (select p.timezone from companion.profiles p where p.user_id = p_user_id),
    companion.default_timezone((select p.last_region from companion.profiles p where p.user_id = p_user_id)),
    companion.country_timezone((select lp.country_code from public.learner_profiles lp where lp.user_id = p_user_id))
  )
$$;
revoke all on function companion.user_timezone(uuid) from public;

-- 오늘(현지 — 시간대를 모르면 UTC) 보낸 알림이 있는가. `p_series`가 null이면 모든 묶음(자동 캠페인 포함), 아니면 그 묶음만. 대조군은 세지 않는다.
create function companion.pushed_today(p_user_id uuid, p_now timestamptz, p_series text[] default null)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.push_campaign_sends s
    where s.user_id = p_user_id and s."group" = 'sent'
      and (p_series is null or s.series = any (p_series))
      and s.run_at >= (
        date_trunc('day', p_now at time zone coalesce(companion.user_timezone(p_user_id), 'UTC'))
          at time zone coalesce(companion.user_timezone(p_user_id), 'UTC')
      )
  )
$$;
revoke all on function companion.pushed_today(uuid, timestamptz, text[]) from public;

-- ------------------------------------------------------------------ 올림

create function public.companion_post_stories(p_now timestamptz)
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
  v_id uuid;
  v_posted jsonb := '[]'::jsonb;
begin
  if (select friend_stories from companion.settings) = 'off' then
    return jsonb_build_object('posted', v_posted);
  end if;
  for v_character in
    select c.id from companion.characters c
    where c.active
      and companion.story_post_hour(c.id) <= v_hour
      and exists (select 1 from companion.story_pool p where p.character_id = c.id and p.active)
      and not exists (select 1 from companion.stories s where s.character_id = c.id and s.day = v_day)
    order by c.id
  loop
    select p.id into v_pool from companion.story_pool p
    where p.character_id = v_character and p.active
    order by (select count(*) from companion.stories s where s.pool_id = p.id), p.id
    limit 1;
    insert into companion.stories (pool_id, character_id, day, posted_at, expires_at)
    values (v_pool, v_character, v_day, p_now, p_now + interval '24 hours')
    on conflict (character_id, day) do nothing
    returning id into v_id;
    if v_id is not null then
      v_posted := v_posted || jsonb_build_array(jsonb_build_object(
        'storyId', v_id, 'characterId', v_character, 'poolId', v_pool));
    end if;
  end loop;
  return jsonb_build_object('posted', v_posted);
end;
$$;

-- ------------------------------------------------------------------ 앱 읽기

create function public.companion_friend_stories()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not companion.stories_on(v_user) then
    return jsonb_build_object('stories', '[]'::jsonb);
  end if;
  return jsonb_build_object('stories', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id,
      'characterId', s.character_id,
      'postedAt', companion.story_time(s.posted_at),
      'expiresAt', companion.story_time(s.expires_at),
      'imagePath', p.image_path,
      'line', jsonb_build_object('ko', p.line_ko, 'roman', p.line_roman, 'meaning', p.meaning),
      'word', p.word,
      'replies', p.replies,
      'freeReply', not companion.story_free_used(v_user, s.id)
    ) order by s.posted_at desc, s.character_id)
    from companion.stories s
    join companion.story_pool p on p.id = s.pool_id
    join companion.characters c on c.id = s.character_id
    where c.active and s.posted_at <= v_now and s.expires_at > v_now
      and not companion.friend_hidden(v_user, c.persona, v_now)
  ), '[]'::jsonb));
end;
$$;

-- ------------------------------------------------------------------ 첫 답장 무료

create function public.companion_claim_story_reply(
  p_user_id uuid,
  p_story_id uuid,
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
  v_story companion.stories;
  v_pool companion.story_pool;
  v_reply companion.story_replies;
  v_free boolean;
  v_quote jsonb;
  v_word text;
begin
  if not companion.stories_on(p_user_id) then
    return jsonb_build_object('result', 'off', 'story', null);
  end if;
  select * into v_story from companion.stories where id = p_story_id;
  if not found or v_story.character_id <> p_character_id then
    return jsonb_build_object('result', 'not_found', 'story', null);
  end if;

  -- 지갑을 잠가 같은 사람의 동시 요청을 줄 세운다 — 다른 메시지 둘이 동시에 와도 무료는 하나.
  perform companion.lock_wallet(p_user_id);
  select * into v_reply from companion.story_replies
  where user_id = p_user_id and client_message_id = p_client_message_id;
  if found then
    -- 같은 메시지의 재전송: 그 줄 그대로. 무료였는데 앞 턴이 실패해 예약이 풀렸으면, 그 사이 다른 메시지가 무료를 쓰지 않았을 때만 다시 무료.
    select * into v_story from companion.stories where id = v_reply.story_id;
    v_free := v_reply.free;
    if v_free and not companion.message_hold_exists(p_user_id, p_client_message_id) then
      if companion.story_free_used(p_user_id, v_reply.story_id, p_client_message_id) then
        update companion.story_replies set free = false
        where user_id = p_user_id and client_message_id = p_client_message_id;
        v_free := false;
      else
        insert into companion.credit_holds (user_id, client_message_id, character_id, amount, buckets, trial)
        values (p_user_id, p_client_message_id, v_story.character_id, 0, '{}'::jsonb, false);
      end if;
    end if;
  else
    -- 이미 값이 걸린 예약이 있는 메시지(이상한 재전송)는 무료로 바꾸지 않는다.
    v_free := v_story.expires_at > p_now
      and not companion.story_free_used(p_user_id, p_story_id)
      and not companion.message_hold_exists(p_user_id, p_client_message_id);
    insert into companion.story_replies (user_id, client_message_id, story_id, character_id, free)
    values (p_user_id, p_client_message_id, p_story_id, v_story.character_id, v_free);
    if v_free then
      insert into companion.credit_holds (user_id, client_message_id, character_id, amount, buckets, trial)
      values (p_user_id, p_client_message_id, v_story.character_id, 0, '{}'::jsonb, false);
    end if;
  end if;

  select * into v_pool from companion.story_pool where id = v_story.pool_id;
  -- 단어의 한국어(프롬프트용) — 묶음 단어 칸에 `ko`가 있으면 싣는다.
  v_word := v_pool.word->>'ko';
  v_quote := jsonb_build_object(
    'line', v_pool.line_ko,
    'wordKo', v_word,
    'imagePath', v_pool.image_path,
    'postedAt', companion.story_time(v_story.posted_at)
  );
  return jsonb_build_object(
    'result', case when v_free then 'free' when v_story.expires_at <= p_now then 'expired' else 'used' end,
    'story', v_quote
  );
end;
$$;

-- ------------------------------------------------------------------ 관문 — 그 메시지의 예약이 있으면 엽전 부족을 보지 않는다
-- 관문 정의는 운영과 저장소가 어긋난 적이 있어(20261217) 통째로 다시 쓰지 않고, 엽전 판정 줄만 바꾼다. 줄이 없으면 멈춘다.

do $$
declare
  v_def text := pg_get_functiondef('companion.turn_gate_base(uuid,text,uuid,timestamptz,text)'::regprocedure);
  v_line text := 'if v_tier = ''free'' and companion.trial_left(p_user_id) = 0 then';
  v_new text := 'if v_tier = ''free'' and companion.trial_left(p_user_id) = 0'
    || ' and not companion.message_hold_exists(p_user_id, p_client_message_id) then';
begin
  if position(v_new in v_def) > 0 then
    return;
  end if;
  if position(v_line in v_def) = 0 then
    raise exception 'turn_gate_base: credit check line not found';
  end if;
  execute replace(v_def, v_line, v_new);
end $$;

do $$
declare
  v_def text := pg_get_functiondef('public.companion_turn_gate(uuid,text,uuid,timestamptz,text)'::regprocedure);
  v_line text := 'if v_plan.daily_free_messages is not null and v_turns.free_used >= v_plan.daily_free_messages then';
  v_new text := 'if v_plan.daily_free_messages is not null and v_turns.free_used >= v_plan.daily_free_messages'
    || ' and not companion.message_hold_exists(p_user_id, p_client_message_id) then';
begin
  if position(v_new in v_def) > 0 then
    return;
  end if;
  if position(v_line in v_def) = 0 then
    raise exception 'companion_turn_gate: plan credit check line not found';
  end if;
  execute replace(v_def, v_line, v_new);
end $$;

-- ------------------------------------------------------------------ 기록의 인용

do $$
declare
  v_def text := pg_get_functiondef('companion.message_json(companion.messages)'::regprocedure);
  v_line text := '''createdAt'', to_char(m.created_at';
  v_new text := '''story'', case when m.role = ''user'' then companion.story_quote_json(m.user_id, m.client_message_id) end,'
    || E'\n    ''createdAt'', to_char(m.created_at';
begin
  if position('story_quote_json' in v_def) > 0 then
    return;
  end if;
  if position(v_line in v_def) = 0 then
    raise exception 'message_json: createdAt line not found';
  end if;
  execute replace(v_def, v_line, v_new);
end $$;

-- ------------------------------------------------------------------ 알림

-- 알림 후보 — 스위치 · 기기 · 방(가장 새 기기 뒤에 그 인물에게 말함) · 선톡 설정 · 답하지 않음 · 올린 지 6시간 · 현지 09 ~ 21시 · 오늘 보낸 알림 없음
-- (모든 묶음 — 선톡 · 스토리 · 자동 캠페인). 사람마다 가장 새 스토리 하나.
create function public.companion_story_push_candidates(p_now timestamptz, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mode as (
    select story_push as value from companion.settings
  ),
  latest_device as (
    select d.user_id, max(d.created_at) as created_at from public.push_devices d group by d.user_id
  ),
  live as (
    select s.id, s.character_id, s.posted_at, p.line_ko, c.persona
    from companion.stories s
    join companion.story_pool p on p.id = s.pool_id
    join companion.characters c on c.id = s.character_id
    where c.active and s.posted_at <= p_now and s.posted_at > p_now - interval '6 hours' and s.expires_at > p_now
  ),
  pairs as (
    select distinct on (d.user_id)
      d.user_id, l.id as story_id, l.character_id, l.line_ko, l.persona,
      companion.is_tester(d.user_id) as tester
    from latest_device d
    join live l on true
    where exists (
        select 1 from companion.conversations cv
        join companion.messages m on m.conversation_id = cv.id and m.role = 'user'
        where cv.user_id = d.user_id and cv.character_id = l.character_id and m.created_at >= d.created_at
      )
      and not companion.friend_hidden(d.user_id, l.persona, p_now)
      and not exists (select 1 from companion.story_replies r where r.user_id = d.user_id and r.story_id = l.id)
    order by d.user_id, l.posted_at desc, l.character_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', x.user_id,
    'storyId', x.story_id,
    'characterId', x.character_id,
    'name', coalesce(x.persona->>'name', x.character_id),
    'line', x.line_ko,
    'mode', (select value from mode),
    'tester', x.tester
  )), '[]'::jsonb)
  from (
    select pr.* from pairs pr, mode
    where mode.value <> 'off' and (mode.value = 'on' or pr.tester)
      and coalesce((select p.proactive_pref from companion.profiles p where p.user_id = pr.user_id), 'daily1') <> 'off'
      and companion.user_timezone(pr.user_id) is not null
      and extract(hour from p_now at time zone companion.user_timezone(pr.user_id)) between 9 and 20
      and not companion.pushed_today(pr.user_id, p_now)
    limit greatest(p_limit, 0)
  ) x
$$;

-- 선톡 푸시 문(20261226) + `pushedToday` — 오늘(현지) 선톡 · 스토리 묶음으로 보낸 알림이 있으면 선톡 푸시도 보내지 않는다(하루 한 번 합산).
create or replace function public.companion_proactive_push_gate(p_user_id uuid, p_character_id text default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'mode', (select proactive_push from companion.settings),
    'tester', companion.is_tester(p_user_id),
    'hasDevice', exists (select 1 from public.push_devices d where d.user_id = p_user_id),
    'hasRoom', coalesce((
      select max(m.created_at) from companion.conversations c
      join companion.messages m on m.conversation_id = c.id and m.role = 'user'
      where c.user_id = p_user_id and c.character_id = p_character_id
    ) >= (select max(d.created_at) from public.push_devices d where d.user_id = p_user_id), false),
    'pushedToday', companion.pushed_today(p_user_id, now(), array['선톡', '스토리', '스토리 시험'])
  )
$$;

revoke all on function public.companion_post_stories(timestamptz) from public, anon, authenticated;
revoke all on function public.companion_friend_stories() from public, anon;
revoke all on function public.companion_claim_story_reply(uuid, uuid, text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_story_push_candidates(timestamptz, integer) from public, anon, authenticated;
revoke all on function public.companion_proactive_push_gate(uuid, text) from public, anon, authenticated;
grant execute on function public.companion_friend_stories() to authenticated;
grant execute on function public.companion_post_stories(timestamptz) to service_role;
grant execute on function public.companion_claim_story_reply(uuid, uuid, text, uuid, timestamptz) to service_role;
grant execute on function public.companion_story_push_candidates(timestamptz, integer) to service_role;
grant execute on function public.companion_proactive_push_gate(uuid, text) to service_role;
