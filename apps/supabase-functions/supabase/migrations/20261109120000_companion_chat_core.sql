-- AI 컴패니언 M1 대화 코어: 캐릭터 · 관계(말투) · 대화 · 메시지 · 고지 · 이용 시간 · 가드레일 판정 · 신고.
-- 결정 · 계약은 docs/specs/ai-companion.md · ai-companion-api.md(§3 · §7)와 ADR-0112 · 0114가 진다.
--
-- 길은 셋이다(ADR-0114).
--   앱용     `public.companion_*`          — `authenticated`, `auth.uid()`의 행만.
--   서버용   `public.companion_*`          — `service_role`만. `chat-send`가 사용자 id를 인자로 넘긴다(토큰은 함수가 먼저 검증).
--   운영 조회 `public.companion_inspect_*` — `service_role`만, 읽기만. ops-dashboard가 부른다.
-- 표는 M0처럼 RLS on · 정책 0 · 앱 역할 권한 회수다.

-- ------------------------------------------------------------------ 표

-- 캐릭터. 원천은 duru-curation `bible.yaml`이다(정식 `companion:` 블록이 생기면 빌드 결과로 바꾼다 — M3).
create table companion.characters (
  id text primary key check (id ~ '^[a-z][a-z0-9-]{0,63}$'),
  bible_version text not null,
  persona jsonb not null check (jsonb_typeof(persona) = 'object'),
  active boolean not null default false,
  sort_order smallint not null default 0
);

-- 말투 단계. 친밀도는 M3에서 채운다 — 지금은 늘 polite.
create table companion.relationships (
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id text not null references companion.characters (id),
  intimacy integer not null default 0,
  speech_level text not null default 'polite' check (speech_level in ('polite', 'casual', 'slang')),
  updated_at timestamptz not null default now(),
  primary key (user_id, character_id)
);

-- 캐릭터당 대화 하나(O14 제안).
create table companion.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id text not null references companion.characters (id),
  kind text not null default 'companion' check (kind in ('companion')),
  topic_state jsonb not null default '{}'::jsonb,
  rolling_summary text,
  summarized_until timestamptz,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index conversations_companion_uniq on companion.conversations (user_id, character_id)
  where kind = 'companion';

-- 메시지. `pending`은 턴이 도는 동안의 유저 메시지이고 앱에 보이지 않는다. 오래된 `pending`(서버가 죽은 턴)은 실패로 본다.
create table companion.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references companion.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'notice')),
  origin text not null default 'turn' check (origin in ('turn', 'proactive', 'crisis')),
  status text not null check (status in ('pending', 'complete', 'blocked', 'crisis', 'failed')),
  client_message_id uuid,
  text text check (text is null or char_length(text) <= 4000),
  input_mode text check (input_mode is null or input_mode in ('text', 'voice')),
  segments jsonb not null default '[]'::jsonb check (jsonb_typeof(segments) = 'array'),
  notice_kind text check (notice_kind is null or notice_kind in ('ai_disclosure', 'minor_notice', 'break_reminder')),
  hidden boolean not null default false,
  credits_spent integer not null default 0 check (credits_spent >= 0),
  -- 모델 · 토큰 · 지연 · 넣은 학습 표현. 앱에 돌려주지 않는다.
  meta jsonb not null default '{}'::jsonb,
  -- 유저 메시지에 대한 캐릭터 답(assistant · notice가 가리킨다).
  reply_to uuid references companion.messages (id) on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  check ((role = 'user') = (client_message_id is not null))
);
create unique index messages_client_uniq on companion.messages (user_id, client_message_id)
  where client_message_id is not null;
create index messages_conversation_idx on companion.messages (conversation_id, created_at desc);

-- 이용 시간. 턴 사이 간격이 `companion.usage_gap()`보다 길면 연속 사용이 끊긴 것으로 본다.
create table companion.usage_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  active_seconds integer not null default 0,
  turns integer not null default 0,
  continuous_started_at timestamptz,
  last_activity_at timestamptz,
  primary key (user_id, day)
);

create table companion.notice_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_ai_disclosure_at timestamptz,
  last_break_reminder_at timestamptz,
  minor_notice_at timestamptz
);

create table companion.moderation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  message_id uuid references companion.messages (id) on delete cascade,
  layer text not null check (layer in ('input', 'output_sync', 'output_async')),
  category text not null check (char_length(category) between 1 and 64),
  action text not null check (action in ('allow', 'block', 'crisis', 'hide')),
  created_at timestamptz not null default now()
);
create index moderation_events_created_idx on companion.moderation_events (created_at desc);

create table companion.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references companion.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

alter table companion.characters enable row level security;
alter table companion.relationships enable row level security;
alter table companion.conversations enable row level security;
alter table companion.messages enable row level security;
alter table companion.usage_daily enable row level security;
alter table companion.notice_state enable row level security;
alter table companion.moderation_events enable row level security;
alter table companion.message_reports enable row level security;
revoke all on all tables in schema companion from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema companion to service_role;

-- 덕수쌤. 원천: duru-curation pipeline/worlds/backpack/bible.yaml `deoksu-teacher`(2026-11-03).
insert into companion.characters (id, bible_version, persona, active, sort_order) values (
  'duksu',
  'backpack@2026-11-03',
  jsonb_build_object(
    'name', '덕수쌤',
    'age', '30대',
    'job', '한국어 선생님. 덕수궁 같은 바깥에서 외국인 학생들에게 야외 수업을 한다',
    'role', '낱말 놀이로 웃기는 선생님. 학생과 일상 이야기를 나누며 한국어를 자연스럽게 쓰게 한다',
    'register', '학생에게 하듯 밝은 해요체. 퀴즈를 낼 때는 「~는?」으로 묻고 답을 크게 받아 준다',
    'speech', '신나는 수업 진행. 낱말을 하나씩 또렷이 끊어 말한다. 틀린 답도 웃으며 받아 준다',
    'samples', jsonb_build_array('소 더하기 고기는? 소고기!', '거기, 새로 온 학생!', '''고기''는 없지만... 정답!'),
    'doNot', jsonb_build_array('문법 · 문화를 길게 설명하는 해설자', '학생을 깎아내리는 웃음'),
    'memorySeed', jsonb_build_array(
      '날씨 좋은 날은 교실을 나와 궁 마당에서 수업한다. 이동식 칠판을 끌고 다닌다',
      '낱말 가족(소고기 · 돼지고기처럼)을 쌓아 묻다가 마지막에 비트는 퀴즈를 좋아한다'
    )
  ),
  true,
  0
);

-- ------------------------------------------------------------------ 내부 도우미 (companion 스키마, 노출 안 됨)

-- 연속 사용이 끊겼다고 보는 턴 사이 간격.
create function companion.usage_gap()
returns interval language sql immutable as $$ select interval '10 minutes' $$;

-- 처리 중(`pending`)으로 남아도 실패로 보는 시간. 턴 하나의 제한 시간보다 길다.
create function companion.pending_timeout()
returns interval language sql immutable as $$ select interval '3 minutes' $$;

-- 연령대: 생년이 없으면 unknown(미성년자 기본값으로 다룬다 — PRD §3.12).
create function companion.age_band(p_birth_year smallint, p_now timestamptz)
returns text language sql immutable as $$
  select case
    when p_birth_year is null then 'unknown'
    when extract(year from p_now)::integer - p_birth_year >= 18 then 'adult'
    else 'minor'
  end
$$;

-- 앱에 보이는 상태. 오래된 pending은 failed, 막 생긴 pending은 null(목록에서 뺀다).
create function companion.visible_status(p_status text, p_created_at timestamptz, p_now timestamptz)
returns text language sql immutable as $$
  select case
    when p_status <> 'pending' then p_status
    when p_created_at < p_now - companion.pending_timeout() then 'failed'
    else null
  end
$$;

create function companion.message_json(m companion.messages)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', m.id,
    'role', m.role,
    'origin', m.origin,
    'status', companion.visible_status(m.status, m.created_at, now()),
    'hidden', m.hidden,
    'text', case when m.role = 'user' then m.text end,
    'inputMode', m.input_mode,
    'segments', case when m.hidden then '[]'::jsonb else m.segments end,
    'notice', case when m.notice_kind is null then null else jsonb_build_object('kind', m.notice_kind) end,
    'feedback', null,
    'createdAt', to_char(m.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
$$;

-- ------------------------------------------------------------------ 서버용 (service_role)

-- `chat-send` 판정 5 ~ 9를 한 번에 본다. 막히면 { result: <에러 코드>, detail }, 통과면 { result: 'ok', … }.
-- p_daily_limit_seconds가 null이면 이용 시간 상한을 보지 않는다(상한 값은 O4 — 팀 논의).
create function public.companion_turn_gate(
  p_user_id uuid,
  p_character_id text,
  p_client_message_id uuid,
  p_now timestamptz,
  p_daily_limit_seconds integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tester boolean;
  v_birth_year smallint;
  v_l1 text;
  v_band text;
  v_existing record;
  v_conversation uuid;
  v_usage record;
  v_notice record;
  v_reply record;
begin
  -- M4 전에는 시험 계정만(ADR-0085 표시).
  select coalesce(raw_app_meta_data->>'duru_tester' = 'true', false) into v_tester
  from auth.users where id = p_user_id;
  if v_tester is null then
    return jsonb_build_object('result', 'invalid_session');
  end if;
  if not v_tester then
    return jsonb_build_object('result', 'not_available');
  end if;

  if not exists (select 1 from companion.characters where id = p_character_id) then
    return jsonb_build_object('result', 'character_not_found');
  end if;
  if not exists (select 1 from companion.characters where id = p_character_id and active) then
    return jsonb_build_object('result', 'not_available');
  end if;

  select birth_year, l1 into v_birth_year, v_l1 from companion.profiles where user_id = p_user_id;
  v_band := companion.age_band(v_birth_year, p_now);
  -- [제안] 보호자 동의 경로가 없으니 13세 미만은 쓰지 못한다(PRD §3.12 · O12).
  if v_band = 'minor' and extract(year from p_now)::integer - v_birth_year < 13 then
    return jsonb_build_object('result', 'age_restricted', 'detail', jsonb_build_object('reason', 'guardian_consent_required'));
  end if;

  if p_daily_limit_seconds is not null then
    select * into v_usage from companion.usage_daily
    where user_id = p_user_id and day = (p_now at time zone 'utc')::date;
    if found and v_usage.active_seconds >= p_daily_limit_seconds then
      return jsonb_build_object('result', 'usage_time_limit', 'detail', jsonb_build_object(
        'limit', 'daily',
        'resetsAt', to_char(((p_now at time zone 'utc')::date + 1)::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ));
    end if;
  end if;

  select id, status, created_at into v_existing from companion.messages
  where user_id = p_user_id and client_message_id = p_client_message_id;
  if found then
    if v_existing.status = 'pending' and v_existing.created_at >= p_now - companion.pending_timeout() then
      return jsonb_build_object('result', 'turn_in_progress');
    end if;
    if v_existing.status in ('complete', 'blocked', 'crisis') then
      return jsonb_build_object('result', 'duplicate_message', 'detail', jsonb_build_object(
        'messageId', v_existing.id, 'messageStatus', v_existing.status
      ));
    end if;
    -- failed · 오래된 pending은 같은 id로 다시 돈다(§6.3).
  end if;

  select id into v_conversation from companion.conversations
  where user_id = p_user_id and character_id = p_character_id and kind = 'companion';
  if v_conversation is not null and exists (
    select 1 from companion.messages
    where conversation_id = v_conversation and role = 'user' and status = 'pending'
      and created_at >= p_now - companion.pending_timeout()
      and client_message_id is distinct from p_client_message_id
  ) then
    return jsonb_build_object('result', 'turn_in_progress');
  end if;

  select * into v_notice from companion.notice_state where user_id = p_user_id;
  select continuous_started_at, last_activity_at into v_reply from companion.usage_daily
  where user_id = p_user_id order by day desc limit 1;

  return jsonb_build_object(
    'result', 'ok',
    'ageBand', v_band,
    'l1', v_l1,
    'notices', to_jsonb(array_remove(array[
      -- 첫 메시지와 3시간마다 AI 고지.
      case when v_notice.last_ai_disclosure_at is null
        or v_notice.last_ai_disclosure_at < p_now - interval '3 hours' then 'ai_disclosure' end,
      -- 미성년자 · 나이 모름은 처음 한 번 안내.
      case when v_band <> 'adult' and v_notice.minor_notice_at is null then 'minor_notice' end,
      -- 연속 사용 3시간이면 휴식 알림(3시간에 한 번).
      case when v_reply.last_activity_at >= p_now - companion.usage_gap()
        and v_reply.continuous_started_at <= p_now - interval '3 hours'
        and (v_notice.last_break_reminder_at is null or v_notice.last_break_reminder_at < p_now - interval '3 hours')
        then 'break_reminder' end
    ], null))
  );
end;
$$;

-- 대화가 없으면 만들고 유저 메시지를 pending으로 저장한다(실패했던 같은 id는 그 행을 다시 pending으로).
-- 반환: 대화 · 메시지 id, 말투, 페르소나, 요약, 최근 기록(오래된 것부터, 보이는 메시지만).
create function public.companion_begin_turn(
  p_user_id uuid,
  p_character_id text,
  p_client_message_id uuid,
  p_text text,
  p_input_mode text,
  p_history_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation companion.conversations;
  v_message_id uuid;
  v_speech text;
begin
  if p_text is null or char_length(p_text) not between 1 and 1000 or p_input_mode not in ('text', 'voice')
    or p_history_limit not between 0 and 100 then
    raise exception 'invalid turn' using errcode = '22023';
  end if;

  insert into companion.conversations (user_id, character_id)
  values (p_user_id, p_character_id)
  on conflict (user_id, character_id) where kind = 'companion' do nothing;
  select * into v_conversation from companion.conversations
  where user_id = p_user_id and character_id = p_character_id and kind = 'companion';

  insert into companion.relationships (user_id, character_id)
  values (p_user_id, p_character_id) on conflict do nothing;
  select speech_level into v_speech from companion.relationships
  where user_id = p_user_id and character_id = p_character_id;

  insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, input_mode)
  values (v_conversation.id, p_user_id, 'user', 'pending', p_client_message_id, p_text, p_input_mode)
  on conflict (user_id, client_message_id) where client_message_id is not null do update set
    status = 'pending', text = excluded.text, input_mode = excluded.input_mode, created_at = clock_timestamp()
  returning id into v_message_id;
  -- 다시 도는 턴의 옛 답은 지운다.
  delete from companion.messages where reply_to = v_message_id;

  return jsonb_build_object(
    'conversationId', v_conversation.id,
    'userMessageId', v_message_id,
    'speechLevel', v_speech,
    'persona', (select persona from companion.characters where id = p_character_id),
    'summary', v_conversation.rolling_summary,
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('role', h.role, 'text', h.text, 'segments', h.segments) order by h.created_at)
      from (
        select m.role, m.text, m.segments, m.created_at
        from companion.messages m
        where m.conversation_id = v_conversation.id and m.id <> v_message_id
          and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
        order by m.created_at desc
        limit p_history_limit
      ) h
    ), '[]'::jsonb)
  );
end;
$$;

-- 턴의 끝. 유저 메시지 상태를 닫고, 캐릭터 답 · 고지 · 판정을 저장하고, 이용 시간을 센다.
-- p_assistant: { id, origin, segments, meta } 또는 null. p_moderation: [{ layer, category, action }]. p_notices: ['ai_disclosure', …].
create function public.companion_finish_turn(
  p_user_message_id uuid,
  p_status text,
  p_assistant jsonb,
  p_moderation jsonb,
  p_notices text[],
  p_now timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user companion.messages;
  v_day date := (p_now at time zone 'utc')::date;
  v_usage companion.usage_daily;
  v_gap_seconds integer;
begin
  if p_status not in ('complete', 'blocked', 'crisis', 'failed') then
    raise exception 'invalid turn status' using errcode = '22023';
  end if;
  update companion.messages set status = p_status
  where id = p_user_message_id and role = 'user'
  returning * into v_user;
  if not found then
    raise exception 'turn not found' using errcode = 'P0002';
  end if;

  insert into companion.messages (conversation_id, user_id, role, origin, status, notice_kind, reply_to, created_at)
  select v_user.conversation_id, v_user.user_id, 'notice', 'turn', 'complete', kind, v_user.id, clock_timestamp()
  from unnest(coalesce(p_notices, array[]::text[])) as kind;

  if p_assistant is not null then
    insert into companion.messages (id, conversation_id, user_id, role, origin, status, segments, meta, reply_to, created_at)
    values (
      (p_assistant->>'id')::uuid, v_user.conversation_id, v_user.user_id, 'assistant',
      coalesce(p_assistant->>'origin', 'turn'), case when p_status = 'crisis' then 'crisis' else 'complete' end,
      coalesce(p_assistant->'segments', '[]'::jsonb), coalesce(p_assistant->'meta', '{}'::jsonb),
      v_user.id, clock_timestamp()
    );
  end if;

  insert into companion.moderation_events (user_id, message_id, layer, category, action)
  select v_user.user_id, v_user.id, r.layer, r.category, r.action
  from jsonb_to_recordset(coalesce(p_moderation, '[]'::jsonb)) as r(layer text, category text, action text);

  if p_notices is not null and cardinality(p_notices) > 0 then
    insert into companion.notice_state (user_id) values (v_user.user_id) on conflict do nothing;
    update companion.notice_state set
      last_ai_disclosure_at = case when 'ai_disclosure' = any (p_notices) then p_now else last_ai_disclosure_at end,
      last_break_reminder_at = case when 'break_reminder' = any (p_notices) then p_now else last_break_reminder_at end,
      minor_notice_at = case when 'minor_notice' = any (p_notices) then p_now else minor_notice_at end
    where user_id = v_user.user_id;
  end if;

  if p_status <> 'failed' then
    update companion.conversations set last_message_at = p_now where id = v_user.conversation_id;
    insert into companion.usage_daily (user_id, day) values (v_user.user_id, v_day) on conflict do nothing;
    select * into v_usage from companion.usage_daily where user_id = v_user.user_id and day = v_day for update;
    v_gap_seconds := extract(epoch from p_now - v_usage.last_activity_at)::integer;
    update companion.usage_daily set
      turns = turns + 1,
      active_seconds = active_seconds + case
        when v_gap_seconds is not null and v_gap_seconds <= extract(epoch from companion.usage_gap()) then v_gap_seconds else 0 end,
      continuous_started_at = case
        when v_gap_seconds is null or v_gap_seconds > extract(epoch from companion.usage_gap()) then p_now
        else continuous_started_at end,
      last_activity_at = p_now
    where user_id = v_user.user_id and day = v_day;
  end if;
end;
$$;

-- 프롬프트에 넣을 학습 맥락: 해금 에피소드와 끝낸 유닛의 학습 표현(최대 p_limit개, 마지막 에피소드 것부터).
create function public.companion_learning_context(p_user_id uuid, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with progress as (
    select progress->'catalogProgress' as catalog from public.learning_progress where user_id = p_user_id
  ),
  units as (
    select e.key as episode_id, u.value as unit_key
    from progress, jsonb_each(coalesce(progress.catalog, '{}'::jsonb)) as e(key, value),
      jsonb_array_elements_text(e.value) as u(value)
    where jsonb_typeof(progress.catalog) = 'object' and jsonb_typeof(e.value) = 'array'
  ),
  picked as (
    select distinct on (x.id) x.id, x.kind, x.surface, x.roman, x.gloss_en, eu.episode_id
    from units
    join companion.expression_units eu on eu.episode_id = units.episode_id and eu.unit_key = units.unit_key
    join companion.expressions x on x.id = eu.expression_id and not x.retired
    order by x.id, eu.episode_id desc
  )
  select jsonb_build_object(
    'episodes', coalesce((select jsonb_agg(distinct episode_id) from units), '[]'::jsonb),
    'expressions', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'surface', surface, 'roman', roman, 'gloss', gloss_en))
      from (select * from picked order by episode_id desc, id limit greatest(0, least(p_limit, 200))) p
    ), '[]'::jsonb)
  )
$$;

-- ------------------------------------------------------------------ 앱용 (authenticated)

create function public.companion_list_characters()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tester boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select coalesce(raw_app_meta_data->>'duru_tester' = 'true', false) into v_tester from auth.users where id = auth.uid();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'available', c.active and coalesce(v_tester, false),
      'unavailableReason', case when c.active and coalesce(v_tester, false) then null else 'not_available' end,
      'speechLevel', coalesce(r.speech_level, 'polite'),
      'lastMessageAt', to_char(conv.last_message_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ) order by c.sort_order, c.id)
    from companion.characters c
    left join companion.relationships r on r.user_id = auth.uid() and r.character_id = c.id
    left join companion.conversations conv on conv.user_id = auth.uid() and conv.character_id = c.id and conv.kind = 'companion'
  ), '[]'::jsonb);
end;
$$;

-- 최신부터. 처리 중(pending) 메시지는 빠지고, 오래된 pending은 failed로 보인다.
create function public.companion_list_messages(p_character_id text, p_before timestamptz, p_limit integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rows jsonb;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_character_id is null or p_limit is null or p_limit not between 1 and 50 then
    raise exception 'invalid page' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(companion.message_json(m) order by m.created_at desc), '[]'::jsonb), count(*)
  into v_rows, v_count
  from (
    select m.* from companion.messages m
    join companion.conversations c on c.id = m.conversation_id
    where c.user_id = auth.uid() and c.character_id = p_character_id and c.kind = 'companion'
      and (p_before is null or m.created_at < p_before)
      and companion.visible_status(m.status, m.created_at, now()) is not null
    order by m.created_at desc
    limit p_limit + 1
  ) m;
  if v_count > p_limit then
    v_rows := v_rows - p_limit;
  end if;
  return jsonb_build_object('messages', v_rows, 'hasMore', v_count > p_limit);
end;
$$;

create function public.companion_report_message(p_message_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_reason is null or char_length(p_reason) not between 1 and 500 then
    raise exception 'invalid report' using errcode = '22023';
  end if;
  if not exists (select 1 from companion.messages where id = p_message_id and user_id = auth.uid()) then
    raise exception 'message not found' using errcode = 'P0002';
  end if;
  insert into companion.message_reports (message_id, user_id, reason)
  values (p_message_id, auth.uid(), p_reason)
  on conflict (message_id, user_id) do update set reason = excluded.reason, created_at = now();
end;
$$;

-- ------------------------------------------------------------------ 운영 조회 (service_role, 읽기만 — API §3.4)

-- 플레이그라운드가 고를 시험 계정. 이메일은 운영자 화면에만 쓴다.
create function public.companion_inspect_testers()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', u.id,
    'email', u.email,
    'ageBand', companion.age_band(p.birth_year, now()),
    'l1', p.l1
  ) order by u.email), '[]'::jsonb)
  from auth.users u
  left join companion.profiles p on p.user_id = u.id
  where u.raw_app_meta_data->>'duru_tester' = 'true'
$$;

-- 한 유저 · 캐릭터의 대화. 메시지마다 내부 상태(pending 포함) · meta · 판정 · 신고가 붙는다.
create function public.companion_inspect_conversation(
  p_user_id uuid,
  p_character_id text,
  p_before timestamptz,
  p_limit integer
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'conversation', (
      select jsonb_build_object('id', c.id, 'summary', c.rolling_summary, 'lastMessageAt', c.last_message_at,
        'speechLevel', coalesce(r.speech_level, 'polite'))
      from companion.conversations c
      left join companion.relationships r on r.user_id = c.user_id and r.character_id = c.character_id
      where c.user_id = p_user_id and c.character_id = p_character_id and c.kind = 'companion'
    ),
    'messages', coalesce((
      select jsonb_agg(
        companion.message_json(m) || jsonb_build_object(
          'rawStatus', m.status,
          'replyTo', m.reply_to,
          'meta', m.meta,
          'moderation', coalesce((
            select jsonb_agg(jsonb_build_object('layer', e.layer, 'category', e.category, 'action', e.action, 'createdAt', e.created_at) order by e.created_at)
            from companion.moderation_events e where e.message_id = m.id
          ), '[]'::jsonb),
          'reports', coalesce((
            select jsonb_agg(jsonb_build_object('reason', rp.reason, 'createdAt', rp.created_at))
            from companion.message_reports rp where rp.message_id = m.id
          ), '[]'::jsonb)
        ) order by m.created_at desc)
      from (
        select m.* from companion.messages m
        join companion.conversations c on c.id = m.conversation_id
        where c.user_id = p_user_id and c.character_id = p_character_id and c.kind = 'companion'
          and (p_before is null or m.created_at < p_before)
        order by m.created_at desc
        limit greatest(1, least(coalesce(p_limit, 50), 200))
      ) m
    ), '[]'::jsonb)
  )
$$;

create function public.companion_inspect_moderation(p_since timestamptz, p_action text, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'userId', e.user_id, 'messageId', e.message_id, 'layer', e.layer,
    'category', e.category, 'action', e.action, 'createdAt', e.created_at,
    'text', m.text
  ) order by e.created_at desc), '[]'::jsonb)
  from (
    select * from companion.moderation_events
    where created_at >= coalesce(p_since, now() - interval '7 days')
      and (p_action is null or action = p_action)
    order by created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  ) e
  left join companion.messages m on m.id = e.message_id
$$;

create function public.companion_inspect_reports(p_since timestamptz, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', rp.id, 'userId', rp.user_id, 'messageId', rp.message_id, 'reason', rp.reason,
    'createdAt', rp.created_at, 'message', companion.message_json(m)
  ) order by rp.created_at desc), '[]'::jsonb)
  from (
    select * from companion.message_reports
    where created_at >= coalesce(p_since, now() - interval '30 days')
    order by created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  ) rp
  join companion.messages m on m.id = rp.message_id
$$;

-- ------------------------------------------------------------------ 권한

revoke all on function companion.usage_gap() from public;
revoke all on function companion.pending_timeout() from public;
revoke all on function companion.age_band(smallint, timestamptz) from public;
revoke all on function companion.visible_status(text, timestamptz, timestamptz) from public;
revoke all on function companion.message_json(companion.messages) from public;

revoke all on function public.companion_turn_gate(uuid, text, uuid, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.companion_begin_turn(uuid, text, uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.companion_finish_turn(uuid, text, jsonb, jsonb, text[], timestamptz) from public, anon, authenticated;
revoke all on function public.companion_learning_context(uuid, integer) from public, anon, authenticated;
revoke all on function public.companion_inspect_testers() from public, anon, authenticated;
revoke all on function public.companion_inspect_conversation(uuid, text, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.companion_inspect_moderation(timestamptz, text, integer) from public, anon, authenticated;
revoke all on function public.companion_inspect_reports(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.companion_turn_gate(uuid, text, uuid, timestamptz, integer) to service_role;
grant execute on function public.companion_begin_turn(uuid, text, uuid, text, text, integer) to service_role;
grant execute on function public.companion_finish_turn(uuid, text, jsonb, jsonb, text[], timestamptz) to service_role;
grant execute on function public.companion_learning_context(uuid, integer) to service_role;
grant execute on function public.companion_inspect_testers() to service_role;
grant execute on function public.companion_inspect_conversation(uuid, text, timestamptz, integer) to service_role;
grant execute on function public.companion_inspect_moderation(timestamptz, text, integer) to service_role;
grant execute on function public.companion_inspect_reports(timestamptz, integer) to service_role;

revoke all on function public.companion_list_characters() from public, anon;
revoke all on function public.companion_list_messages(text, timestamptz, integer) from public, anon;
revoke all on function public.companion_report_message(uuid, text) from public, anon;
grant execute on function public.companion_list_characters() to authenticated;
grant execute on function public.companion_list_messages(text, timestamptz, integer) to authenticated;
grant execute on function public.companion_report_message(uuid, text) to authenticated;
