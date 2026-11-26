-- 내 스토리 — 단어 · 카드(ADR-0194 내 스토리 · ADR-0191). 사진은 없다(ADR-0191 D11은 다음 단계). 친구 스토리(20261228120000) 위에 쌓는다.
-- 운영에 올라가기 전에 ADR-0191(사용자 결정 2026-11-24)대로 제자리에서 고쳐 썼다 — 반응은 그 인물 방의 채팅 메시지다.
-- 1. 스위치(companion.settings): `my_stories`(올리기 · 읽기 · 지우기) · `story_reactions`(반응 예약 · 만들기) · `story_reaction_push`(반응 알림)
--    — off(기본) · testers · on. `my_story_seen`(Seen by, 기본 켬). 규칙 수치는 `my_story_rules`(jsonb, 비면 아래 기본값).
--    상한: `my_story_daily`(24시간 안 올리기) · `story_reaction_user_daily`(사람 하루 반응) · `story_reaction_global_daily`(전체 하루 반응 — 퓨즈).
--    반응 상한은 **claim 수**로 세고 지워지지 않는 장부(`my_story_usage` · `my_story_usage_global`, UTC 날)에 쌓는다.
-- 2. 올리기는 현지 시간대 창(아침 · 낮 · 밤)마다 하나(`my_story_slots` — 지워도 돌아오지 않음) + 24시간 안 `my_story_daily`개.
-- 3. 프로필 `keep_my_stories`(기본 켬): 친구에게는 24시간, 내 보관함에는 지울 때까지. 끄면 24시간 지난 것은 정리 때 지운다.
-- 4. 표(RLS 켬, 앱 직접 접근 없음): `my_stories` · `my_story_reactions`(알람 — 누가 · 언제 · 어떤 각도, 만든 메시지를 가리킴) · `my_story_seen` ·
--    `my_story_replies`(내가 인용해 보낸 답) · `my_story_slots` · 장부 둘.
-- 5. 반응 메시지: `companion.messages.origin = 'story_reaction'`. 선톡 수 · 간격에는 세지 않고, 스냅샷 · 음성은 다른 인물 메시지처럼 된다.
--    기록 읽기의 `story`가 { kind: mine, … }, 스토리를 지우면 { kind: deleted } — 메시지 글은 남는다.
-- 6. 앱 RPC: `companion_my_stories(tz?)` · `companion_post_my_story(…, tz?)` · `companion_delete_my_story(id|null)` · `companion_set_keep_my_stories(bool)`.
-- 7. 서버 역할: `companion_claim_story_reactions` · `companion_finish_story_reaction` · `companion_purge_my_stories` ·
--    `companion_story_reaction_push_gate` · `companion_story_context`(대화 턴 지시에 싣는 스토리).

alter table companion.settings
  add column if not exists my_stories text not null default 'off' check (my_stories in ('off', 'testers', 'on')),
  add column if not exists story_reactions text not null default 'off' check (story_reactions in ('off', 'testers', 'on')),
  add column if not exists story_reaction_push text not null default 'off'
    check (story_reaction_push in ('off', 'testers', 'on')),
  add column if not exists my_story_seen boolean not null default true,
  add column if not exists my_story_daily integer not null default 3 check (my_story_daily between 0 and 20),
  add column if not exists story_reaction_user_daily integer not null default 6
    check (story_reaction_user_daily between 0 and 40),
  add column if not exists story_reaction_global_daily integer not null default 1000
    check (story_reaction_global_daily between 0 and 100000),
  add column if not exists my_story_rules jsonb not null default '{}'::jsonb
    check (jsonb_typeof(my_story_rules) = 'object');

alter table companion.profiles
  add column if not exists keep_my_stories boolean not null default true;

-- 반응 메시지의 origin. 선톡(`proactive`)과 따로 둬 선톡 하루 상한 · 간격 · 답 없는 선톡 수에 섞이지 않는다.
alter table companion.messages drop constraint messages_origin_check;
alter table companion.messages
  add constraint messages_origin_check
  check (origin in ('turn', 'proactive', 'crisis', 'greeting', 'story_reaction'));

-- 스냅샷 · 음성을 만들 수 있는 메시지(20261130) — 반응 메시지도 인물의 말이다.
create or replace function companion.media_eligible(m companion.messages)
returns boolean language sql immutable as $$
  select m.role = 'assistant' and m.origin in ('turn', 'greeting', 'proactive', 'story_reaction') and not m.hidden
    and m.status = 'complete' and coalesce(m.meta->>'refusal', '') <> 'true'
$$;

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

-- 알람 — 누가(`character_id`) · 언제(`due_at`) · 어떤 각도(`angle`)로 답할지. 글은 여기 없다: 만든 메시지(`message_id`)가 정본이다.
create table companion.my_story_reactions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references companion.my_stories (id) on delete cascade,
  user_id uuid not null,
  character_id text not null references companion.characters (id),
  rank integer not null check (rank in (1, 2)),
  -- word: 그 단어를 쓰거나 이어지게 · question: 가벼운 질문 · quiz: 뜻으로 묻는 작은 퀴즈 · together: 같이 하자 ·
  -- react: 본 것에 대한 첫 반응(사진 스토리 — 20270104130000).
  angle text not null check (angle in ('word', 'question', 'quiz', 'together', 'react')),
  due_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'claimed', 'done', 'failed', 'skipped')),
  -- 메시지를 지워도(대화 지우기) 알람 줄은 남는다 — 스토리 위 목록에서만 빠진다.
  message_id uuid references companion.messages (id) on delete set null,
  claimed_at timestamptz,
  done_at timestamptz,
  -- 끝낼 때의 사용량 요약(단계마다 모델 · 토큰) · 결과 — 비용 근거.
  meta jsonb,
  -- 건너뛰거나 실패한 까닭: cap_user · expired · switch_off · stale · budget · no_conversation · 그 밖 핸들러 결과(not_allowed · blocked …).
  skip_reason text check (skip_reason is null or skip_reason ~ '^[a-z_]{1,40}$'),
  unique (story_id, character_id)
);
create index my_story_reactions_due_idx on companion.my_story_reactions (status, due_at);
create index my_story_reactions_claimed_idx on companion.my_story_reactions (claimed_at) where claimed_at is not null;
create index my_story_reactions_message_idx on companion.my_story_reactions (message_id) where message_id is not null;

-- Seen by — 친구 전원. 올릴 때 시각만 적는다(모델 없음). 읽기는 `seen_at <= now`인 줄만 보여 준다.
create table companion.my_story_seen (
  story_id uuid not null references companion.my_stories (id) on delete cascade,
  character_id text not null references companion.characters (id),
  seen_at timestamptz not null,
  primary key (story_id, character_id)
);

create table companion.my_story_replies (
  user_id uuid not null references auth.users (id) on delete cascade,
  client_message_id uuid not null,
  -- 스토리를 지우면 null — 기록 읽기의 인용이 「Deleted story」가 된다.
  my_story_id uuid references companion.my_stories (id) on delete set null,
  character_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, client_message_id)
);

-- 쓴 창 — 현지 날 · 창마다 한 줄. 스토리를 지워도 남는다(지우고 다시 올리기로 창을 되찾지 못한다). 24시간 상한도 여기서 센다.
create table companion.my_story_slots (
  user_id uuid not null references auth.users (id) on delete cascade,
  local_day date not null,
  slot text not null check (slot in ('morning', 'day', 'night')),
  created_at timestamptz not null,
  primary key (user_id, local_day, slot)
);
create index my_story_slots_recent_idx on companion.my_story_slots (user_id, created_at desc);

-- 하루 쓴 양 장부 — 스토리 · 반응을 지워도 줄지 않는다. 날은 UTC. 사람 줄은 계정을 지우면 함께 지운다.
create table companion.my_story_usage (
  day date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  posts integer not null default 0,
  claims integer not null default 0,
  primary key (day, user_id)
);
-- 전체 하루 반응 claim 수 — 계정을 지워도 남는다. claim은 이 줄을 잠가 동시 호출을 줄 세운다.
create table companion.my_story_usage_global (
  day date primary key,
  claims integer not null default 0
);

alter table companion.my_stories enable row level security;
alter table companion.my_story_reactions enable row level security;
alter table companion.my_story_seen enable row level security;
alter table companion.my_story_replies enable row level security;
alter table companion.my_story_slots enable row level security;
alter table companion.my_story_usage enable row level security;
alter table companion.my_story_usage_global enable row level security;
revoke all on table companion.my_stories, companion.my_story_reactions, companion.my_story_seen, companion.my_story_replies,
  companion.my_story_slots, companion.my_story_usage, companion.my_story_usage_global
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

-- 규칙 수치 하나 — `settings.my_story_rules`에 있으면 그 값, 없거나 수가 아니면 기본값(ADR-0191 D3 · D4 · D8).
create function companion.my_story_rule(p_key text, p_default numeric)
returns numeric language sql stable as $$
  select coalesce((
    select case when jsonb_typeof(s.my_story_rules->p_key) = 'number' then (s.my_story_rules->>p_key)::numeric end
    from companion.settings s
  ), p_default)
$$;
revoke all on function companion.my_story_rule(text, numeric) from public;

-- 씨앗 글 → (0, 1) 사이 수. 스토리 · 인물로 결정적이라 같은 올리기는 늘 같은 인물 · 시각을 고른다(재시도 · 테스트).
create function companion.story_unit(p_seed text)
returns double precision language sql immutable as $$
  select ((abs(hashtext(p_seed)::bigint) % 999983) + 1) / 999984.0::double precision
$$;
revoke all on function companion.story_unit(text) from public;

-- 답할 인물의 가중치(ADR-0191 D3) = 최근성 × 친밀도, 직전 내 스토리에 답한 인물은 덜.
create function companion.reaction_weight(
  p_last_user_at timestamptz,
  p_intimacy integer,
  p_repeated boolean,
  p_now timestamptz
)
returns numeric language sql stable as $$
  select (case
      when p_last_user_at >= p_now - make_interval(days => companion.my_story_rule('recentDays', 3)::integer)
        then companion.my_story_rule('recentWeight', 1.0)
      when p_last_user_at >= p_now - make_interval(days => companion.my_story_rule('midDays', 14)::integer)
        then companion.my_story_rule('midWeight', 0.5)
      else companion.my_story_rule('oldWeight', 0.15)
    end)
    * (case
      when coalesce(p_intimacy, 0) >= 60 then companion.my_story_rule('intimacy60', 3.0)
      when coalesce(p_intimacy, 0) >= 35 then companion.my_story_rule('intimacy35', 2.2)
      when coalesce(p_intimacy, 0) >= 15 then companion.my_story_rule('intimacy15', 1.5)
      else companion.my_story_rule('intimacy0', 1.0)
    end)
    * (case when p_repeated then companion.my_story_rule('repeatFactor', 0.6) else 1 end)
$$;
revoke all on function companion.reaction_weight(timestamptz, integer, boolean, timestamptz) from public;

-- 지금의 올리기 창(ADR-0191 D8) — { slot, day(창이 속한 현지 날), nextAt(다음 창이 열리는 때) }.
-- 시간대: 프로필 · 지역 · 학습 나라(`user_timezone`) → 앱이 보낸 UTC 차이(분, -720 ~ 840) → UTC.
-- 밤 창은 자정을 넘는다 — 새벽(아침 창 전)은 전날의 밤 창이다.
create function companion.my_story_window(p_user_id uuid, p_tz_offset_min integer, p_now timestamptz)
returns jsonb language plpgsql stable as $$
declare
  v_tz text := companion.user_timezone(p_user_id);
  v_offset integer := least(greatest(coalesce(p_tz_offset_min, 0), -720), 840);
  v_morning integer := companion.my_story_rule('morningStart', 4)::integer;
  v_day integer := companion.my_story_rule('dayStart', 12)::integer;
  v_night integer := companion.my_story_rule('nightStart', 18)::integer;
  v_local timestamp;
  v_hour integer;
  v_slot text;
  v_slot_day date;
  v_next timestamp;
begin
  v_local := case when v_tz is null then (p_now at time zone 'UTC') + make_interval(mins => v_offset)
    else p_now at time zone v_tz end;
  v_hour := extract(hour from v_local)::integer;
  if v_hour < v_morning then
    v_slot := 'night'; v_slot_day := v_local::date - 1;
    v_next := v_local::date + make_interval(hours => v_morning);
  elsif v_hour < v_day then
    v_slot := 'morning'; v_slot_day := v_local::date;
    v_next := v_local::date + make_interval(hours => v_day);
  elsif v_hour < v_night then
    v_slot := 'day'; v_slot_day := v_local::date;
    v_next := v_local::date + make_interval(hours => v_night);
  else
    v_slot := 'night'; v_slot_day := v_local::date;
    v_next := v_local::date + 1 + make_interval(hours => v_morning);
  end if;
  return jsonb_build_object(
    'slot', v_slot,
    'day', v_slot_day,
    'nextAt', companion.story_time(case when v_tz is null
      then (v_next - make_interval(mins => v_offset)) at time zone 'UTC' else v_next at time zone v_tz end),
    'used', exists (
      select 1 from companion.my_story_slots s
      where s.user_id = p_user_id and s.local_day = v_slot_day and s.slot = v_slot
    )
  );
end;
$$;
revoke all on function companion.my_story_window(uuid, integer, timestamptz) from public;

-- 24시간 안에 `my_story_daily` + 1개를 이미 올렸는가. 시간대를 바르게 쓰는 사람은 어느 24시간에도 창 셋 + 하나(전날 같은 창의 끝과
-- 오늘 그 창의 처음)까지 올릴 수 있다 — 상한을 창 수와 같게 두면 어제 올린 시각보다 이른 시각에는 오늘 창이 막힌다.
create function companion.my_story_day_full(p_user_id uuid, p_now timestamptz)
returns boolean language sql stable as $$
  select (select count(*) from companion.my_story_slots s
          where s.user_id = p_user_id and s.created_at > p_now - interval '24 hours')
    >= (select my_story_daily + 1 from companion.settings)
$$;
revoke all on function companion.my_story_day_full(uuid, timestamptz) from public;

-- 말(speech) 조각에 붙은 번역을 이어 붙인 뜻. 없으면 null.
create function companion.reaction_meaning(p_segments jsonb)
returns text language sql immutable as $$
  select nullif(btrim(coalesce(string_agg(btrim(t.e->>'translation'), ' ' order by t.ord), '')), '')
  from jsonb_array_elements(case when jsonb_typeof(p_segments) = 'array' then p_segments else '[]'::jsonb end)
    with ordinality as t(e, ord)
  where coalesce(t.e->>'kind', 'speech') = 'speech' and coalesce(btrim(t.e->>'translation'), '') <> ''
$$;
revoke all on function companion.reaction_meaning(jsonb) from public;

-- 앱이 받는 스토리 한 건. `reactions`는 알람 → 메시지를 따라가 읽는다(모양은 ADR-0194 그대로 + messageId). `seenBy`는 시각이 된 줄만.
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
revoke all on function companion.my_story_json(companion.my_stories) from public;

-- ------------------------------------------------------------------ 앱 — 읽기

create function public.companion_my_stories(p_tz_offset_min integer default null)
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
    return jsonb_build_object('enabled', false, 'keep', v_keep, 'stories', '[]'::jsonb, 'window', null);
  end if;
  return jsonb_build_object(
    'enabled', true,
    'keep', v_keep,
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

-- ------------------------------------------------------------------ 앱 — 올리기

-- 답할 인물 · 시각 · 각도 · Seen을 적는다(ADR-0191 D3 · D4 · D5). 모델은 부르지 않는다.
create function companion.schedule_my_story_reactions(p_story companion.my_stories, p_now timestamptz)
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
  for v_row in
    select t.id as character_id from jsonb_array_elements_text(v_list) with ordinality as t(id, ord)
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
        when v_rank = 1 then 'word'
        else (array['question', 'quiz', 'together'])[1 + floor(companion.story_unit(v_seed || ':angle') * 3)::integer]
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

create function public.companion_post_my_story(
  p_client_id uuid,
  p_kind text,
  p_word jsonb,
  p_ko text,
  p_roman text,
  p_meaning text,
  p_example_ko text,
  p_example_meaning text,
  p_lang text,
  p_tz_offset_min integer default null
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
  v_window jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not companion.my_stories_on(v_user) then
    return jsonb_build_object('result', 'off', 'story', null);
  end if;
  -- 같은 사람의 동시 요청을 줄 세운다 — 창 · 상한 · 두 번 누름.
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
  -- 창마다 하나(ADR-0191 D8). 쓴 창은 지워도 돌아오지 않는다.
  v_window := companion.my_story_window(v_user, p_tz_offset_min, v_now);
  if (v_window->>'used')::boolean then
    return jsonb_build_object('result', 'window_used', 'story', null, 'window', v_window);
  end if;
  -- 앱이 보낸 시간대로 창을 늘리지 못하게 24시간 상한도 건다(`companion.my_story_day_full`).
  if companion.my_story_day_full(v_user, v_now) then
    return jsonb_build_object('result', 'daily_limit', 'story', null, 'window', v_window);
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
  insert into companion.my_story_slots (user_id, local_day, slot, created_at)
  values (v_user, (v_window->>'day')::date, v_window->>'slot', v_now);
  insert into companion.my_story_usage as u (day, user_id, posts)
  values ((v_now at time zone 'utc')::date, v_user, 1)
  on conflict (day, user_id) do update set posts = u.posts + 1;

  perform companion.schedule_my_story_reactions(v_story, v_now);
  return jsonb_build_object(
    'result', 'ok',
    'story', companion.my_story_json(v_story),
    'window', companion.my_story_window(v_user, p_tz_offset_min, v_now)
  );
end;
$$;

-- ------------------------------------------------------------------ 앱 — 지우기 · 보관

-- 스토리 · 남은 알람 · Seen이 사라진다(cascade). 대화방의 반응 메시지는 남고 인용만 「Deleted story」가 된다(ADR-0191 D10).
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

-- 때가 된 알람을 고른다(상한 안에서). 고른 줄은 claimed — 상한은 이 수로 센다(모델 부르기가 실패해도).
-- 그 대화에 도는 턴이 있거나 마지막 메시지가 1분 안이면 이번에는 건너뛴다(scheduled로 남아 다음 회차에 본다).
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
  v_deferred integer := 0;
  v_global_capped boolean := false;
begin
  -- 줄 세움: 그날 전체 장부 줄을 잠근다 — 겹친 호출은 앞 호출이 커밋할 때까지 기다렸다가 새 수를 읽는다.
  insert into companion.my_story_usage_global (day) values (v_day) on conflict (day) do nothing;
  select g.claims into v_global from companion.my_story_usage_global g where g.day = v_day for update;
  -- 끊긴 함수가 남긴 claimed(30분 넘음)는 failed로 끝낸다 — 상한은 이미 셌다.
  update companion.my_story_reactions set status = 'failed', done_at = p_now, skip_reason = 'stale'
  where status = 'claimed' and claimed_at < p_now - interval '30 minutes';
  for v_row in
    select r.id, r.user_id, r.character_id, r.story_id, r.angle, r.rank,
      s.kind, s.ko, s.roman, s.meaning, s.example_ko, s.lang, s.posted_at
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
    if exists (
      select 1 from companion.conversations cv
      join companion.messages m on m.conversation_id = cv.id
      where cv.user_id = v_row.user_id and cv.character_id = v_row.character_id and cv.kind = 'companion'
        and ((m.status = 'pending' and m.created_at > p_now - interval '3 minutes')
          or m.created_at > p_now - interval '60 seconds')
    ) then
      v_deferred := v_deferred + 1;
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
      'angle', v_row.angle,
      'rank', v_row.rank,
      'kind', v_row.kind,
      'ko', v_row.ko,
      'roman', v_row.roman,
      'meaning', v_row.meaning,
      'exampleKo', v_row.example_ko,
      'lang', v_row.lang
    ));
  end loop;
  update companion.my_story_usage_global set claims = v_global where day = v_day;
  return jsonb_build_object(
    'rows', v_out, 'skippedCap', v_skipped_cap, 'deferred', v_deferred, 'globalCapped', v_global_capped
  );
end;
$$;

-- 알람을 끝낸다. 성공이면 반응을 그 인물 방의 메시지로 저장하고(선톡과 같은 모양, origin `story_reaction`) 알람이 그 메시지를 가리킨다.
-- 그 사이 스토리를 지웠으면 알람 줄이 없다 — 메시지도 저장하지 않는다(saved: false).
create function public.companion_finish_story_reaction(
  p_reaction_id uuid,
  p_ok boolean,
  p_now timestamptz,
  p_message_id uuid default null,
  p_segments jsonb default null,
  p_meta jsonb default null,
  p_suggestions jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row companion.my_story_reactions;
  v_conversation uuid;
  v_reason text;
begin
  if p_suggestions is not null and (
    jsonb_typeof(p_suggestions) <> 'object' or jsonb_typeof(p_suggestions->'items') is distinct from 'array'
  ) then
    raise exception 'invalid suggestions' using errcode = '22023';
  end if;
  select * into v_row from companion.my_story_reactions
  where id = p_reaction_id and status = 'claimed' for update;
  if not found then
    return jsonb_build_object('updated', 0, 'saved', false);
  end if;
  if p_ok and p_message_id is not null and jsonb_typeof(p_segments) = 'array' and jsonb_array_length(p_segments) > 0 then
    select id into v_conversation from companion.conversations
    where user_id = v_row.user_id and character_id = v_row.character_id and kind = 'companion';
    if v_conversation is not null then
      insert into companion.messages (
        id, conversation_id, user_id, role, origin, status, segments, meta, suggestions, created_at
      ) values (
        p_message_id, v_conversation, v_row.user_id, 'assistant', 'story_reaction', 'complete', p_segments,
        coalesce(p_meta, '{}'::jsonb) || jsonb_build_object('myStoryId', v_row.story_id, 'angle', v_row.angle),
        p_suggestions, clock_timestamp()
      );
      update companion.conversations set last_message_at = p_now where id = v_conversation;
      update companion.my_story_reactions
      set status = 'done', message_id = p_message_id, done_at = p_now, meta = p_meta
      where id = p_reaction_id;
      return jsonb_build_object('updated', 1, 'saved', true);
    end if;
    v_reason := 'no_conversation';
  end if;
  -- 시간 예산에 걸려 모델을 부르지 못한 줄(`budget`)은 실패가 아니다 — 알람으로 되돌리고 센 상한을 돌려놓는다(다음 회차가 다시 고른다).
  if not p_ok and p_meta->>'outcome' = 'budget' then
    update companion.my_story_reactions set status = 'scheduled', claimed_at = null where id = p_reaction_id;
    update companion.my_story_usage set claims = greatest(claims - 1, 0)
    where day = (v_row.claimed_at at time zone 'utc')::date and user_id = v_row.user_id;
    update companion.my_story_usage_global set claims = greatest(claims - 1, 0)
    where day = (v_row.claimed_at at time zone 'utc')::date;
    return jsonb_build_object('updated', 1, 'saved', false, 'requeued', true);
  end if;
  update companion.my_story_reactions
  set status = 'failed', done_at = p_now, meta = p_meta,
    skip_reason = coalesce(v_reason, case when p_meta->>'outcome' ~ '^[a-z_]{1,40}$' then p_meta->>'outcome' else 'failed' end)
  where id = p_reaction_id;
  return jsonb_build_object('updated', 1, 'saved', false);
end;
$$;

-- 보관을 끈 사람의 24시간 지난 스토리 — 알람 · Seen은 cascade, 대화 인용은 「Deleted story」.
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

-- ------------------------------------------------------------------ 알림

-- 반응 푸시 문(ADR-0191 D7) — 선톡 푸시 문의 기기 · 방 판정을 그대로 쓰고 스위치만 `story_reaction_push`. 하루 한 번 상한은 보지 않는다.
create function public.companion_story_reaction_push_gate(p_user_id uuid, p_character_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select (public.companion_proactive_push_gate(p_user_id, p_character_id) - 'pushedToday')
    || jsonb_build_object('mode', (select story_reaction_push from companion.settings))
$$;

-- 반응 푸시(묶음 「스토리 반응」)가 나간 날에는 선톡 푸시를 건너뛴다 — 선톡 문의 셈 범위에 그 묶음을 더한다.
-- (친구 스토리 알림은 어떤 묶음이든 보낸 줄이 있으면 건너뛰므로 고칠 것이 없다.)
do $$
declare
  v_def text := pg_get_functiondef('public.companion_proactive_push_gate(uuid,text)'::regprocedure);
  v_old text := 'array[''선톡'', ''스토리'', ''스토리 시험'']';
  v_new text := 'array[''선톡'', ''스토리'', ''스토리 시험'', ''스토리 반응'']';
begin
  if position(v_new in v_def) > 0 then
    return;
  end if;
  if position(v_old in v_def) = 0 then
    raise exception 'companion_proactive_push_gate: series array not found';
  end if;
  execute replace(v_def, v_old, v_new);
end $$;

-- ------------------------------------------------------------------ 대화 — 인용 · 내 스토리 답장 · 턴 지시

-- 반응 메시지의 인용 — 스토리가 살아 있으면 { kind: mine, … }, 지웠으면 { kind: deleted, characterId }.
create function companion.my_reaction_quote_json(p_message_id uuid, p_conversation_id uuid)
returns jsonb language sql stable as $$
  select coalesce(
    (
      select jsonb_build_object(
        'kind', 'mine',
        'id', s.id,
        'characterId', r.character_id,
        'line', s.ko,
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
revoke all on function companion.my_reaction_quote_json(uuid, uuid) from public;

-- 기록의 `story`(20261228120000은 내 말에만 붙였다)를 반응 메시지에도 붙인다 — 정의를 통째로 다시 쓰지 않고 그 식만 바꾼다.
do $$
declare
  v_def text := pg_get_functiondef('companion.message_json(companion.messages)'::regprocedure);
  v_old text := 'case when m.role = ''user'' then companion.story_quote_json(m.user_id, m.client_message_id) end';
  v_new text := 'case when m.role = ''user'' then companion.story_quote_json(m.user_id, m.client_message_id)'
    || ' when m.origin = ''story_reaction'' then companion.my_reaction_quote_json(m.id, m.conversation_id) end';
begin
  if position('my_reaction_quote_json' in v_def) > 0 then
    return;
  end if;
  if position(v_old in v_def) = 0 then
    raise exception 'message_json: story quote expression not found';
  end if;
  execute replace(v_def, v_old, v_new);
end $$;

-- 내 스토리를 인용해 보낸 답(옛 앱의 「Answer」 띠) — 인용만 남긴다(무료 아님). 지운 스토리 · 남의 스토리는 not_found.
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

-- 대화 기록의 인용(내 말) — 친구 스토리 답장 { kind: friend, … } · 내 스토리 답장 { kind: mine, … } · 지운 내 스토리 { kind: deleted, characterId }.
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

-- 이번 턴 지시에 싣는 스토리(ADR-0191 D9) — 학습자의 살아 있는 내 스토리(답하지 않은 인물에게도) · 그 인물이 최근 올린 자기 스토리 셋.
-- 스위치가 꺼져 있으면 빈 목록. 지운 스토리는 다음 턴부터 빠진다.
create function public.companion_story_context(p_user_id uuid, p_character_id text, p_now timestamptz)
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
        'postedAt', companion.story_time(s.posted_at)
      ) order by s.posted_at desc)
      from (
        select * from companion.my_stories s
        where s.user_id = p_user_id and s.posted_at <= p_now and s.expires_at > p_now
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

revoke all on function public.companion_my_stories(integer) from public, anon;
revoke all on function public.companion_post_my_story(uuid, text, jsonb, text, text, text, text, text, text, integer)
  from public, anon;
revoke all on function public.companion_delete_my_story(uuid) from public, anon;
revoke all on function public.companion_set_keep_my_stories(boolean) from public, anon;
revoke all on function public.companion_claim_story_reactions(timestamptz, integer) from public, anon, authenticated;
revoke all on function public.companion_finish_story_reaction(uuid, boolean, timestamptz, uuid, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
revoke all on function public.companion_purge_my_stories(timestamptz) from public, anon, authenticated;
revoke all on function public.companion_story_reaction_push_gate(uuid, text) from public, anon, authenticated;
revoke all on function public.companion_story_context(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.companion_my_stories(integer) to authenticated;
grant execute on function public.companion_post_my_story(uuid, text, jsonb, text, text, text, text, text, text, integer)
  to authenticated;
grant execute on function public.companion_delete_my_story(uuid) to authenticated;
grant execute on function public.companion_set_keep_my_stories(boolean) to authenticated;
grant execute on function public.companion_claim_story_reactions(timestamptz, integer) to service_role;
grant execute on function public.companion_finish_story_reaction(uuid, boolean, timestamptz, uuid, jsonb, jsonb, jsonb)
  to service_role;
grant execute on function public.companion_purge_my_stories(timestamptz) to service_role;
grant execute on function public.companion_story_reaction_push_gate(uuid, text) to service_role;
grant execute on function public.companion_story_context(uuid, text, timestamptz) to service_role;
