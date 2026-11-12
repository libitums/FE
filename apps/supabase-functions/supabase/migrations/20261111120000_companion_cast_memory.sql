-- AI 컴패니언 M3 캐스트 확장: 페르소나 다섯 · 설정 값 · 장기 메모리 · 반복 위반 제재 · 선톡 후보 · 대화 요약(PRD §3.1 · §3.2 · §3.8 · §3.9 · §3.11 5층).
-- 판정 · 시작 · 끝 함수는 크레딧(M4)까지 합쳐 20261113120000에서 다시 쓴다.
--
-- 장기 메모리는 pgvector 없이 최근 항목을 넣는다 — 임베딩 모델이 정해지지 않았다(PRD C). 의미 검색은 모델을 고른 뒤 `embedding` 열을 더한다.

-- ------------------------------------------------------------------ 설정 (한 행)
-- 값은 PRD §8 C · O1 ~ O5의 초안이다. 운영자가 SQL로 바꾼다 — 배포 없이 다음 턴부터 적용된다.
create table companion.settings (
  id boolean primary key default true check (id),
  testers_only boolean not null default true,
  message_cost integer not null default 1 check (message_cost >= 0),
  trial_character text not null default 'duksu',
  trial_limit integer not null default 20 check (trial_limit >= 0),
  bucket_order text[] not null default array['sub', 'grant', 'paid'],
  speech_casual_at integer not null default 20,
  speech_slang_at integer not null default 50,
  intimacy_delta_min integer not null default -2,
  intimacy_delta_max integer not null default 3,
  -- 18세 미만 · 나이 모름 하루 상한(초). O4 초안은 3시간 — 정해지기 전까지 끈다(null).
  minor_daily_limit_seconds integer check (minor_daily_limit_seconds is null or minor_daily_limit_seconds > 0),
  -- 미국 12 ~ 17세(SB 1119 기본값): 연속 1시간 · 하루 2시간.
  us_minor_continuous_seconds integer not null default 3600,
  us_minor_daily_seconds integer not null default 7200,
  strike_limit integer not null default 3 check (strike_limit > 0),
  strike_window interval not null default interval '24 hours',
  block_duration interval not null default interval '30 minutes',
  proactive_gap interval not null default interval '24 hours',
  proactive_daily_cap integer not null default 1 check (proactive_daily_cap >= 0),
  memory_prompt_limit integer not null default 30 check (memory_prompt_limit between 0 and 200),
  summary_after integer not null default 30 check (summary_after > 0),
  check (bucket_order <@ array['sub', 'grant', 'paid'] and cardinality(bucket_order) = 3)
);
insert into companion.settings default values;

-- ------------------------------------------------------------------ 페르소나 다섯
-- 원천: duru-curation pipeline/worlds/backpack/bible.yaml(2026-11-09 main). maxSpeechLevel은 bible의 register 규칙에서 옮겼다
-- (윤경 · 재민은 「끝까지 존댓말」, 도윤은 손님 응대 존댓말 — 반말까지만, 미나는 열어 둠, 덕수쌤은 수업 해요체). topics는 화제 뱅크 씨앗이다(O6 전 초안).
update companion.characters
set persona = persona || jsonb_build_object(
  'maxSpeechLevel', 'polite',
  'topics', jsonb_build_array('오늘 배운 낱말로 퀴즈', '궁 마당 야외 수업', '낱말 가족 놀이', '좋아하는 한국 음식')
)
where id = 'duksu';

insert into companion.characters (id, bible_version, persona, active, sort_order) values
  ('yoonkyung', 'backpack@2026-11-09', jsonb_build_object(
    'name', '정윤경', 'age', '69세',
    'job', '익선동 「익선 게스트하우스」 운영',
    'role', '하루의 처음과 끝에 있는 사람. 학습자가 나갈 때 배웅하고 들어올 때 맞는다',
    'register', '처음부터 끝까지 존댓말. 가까워져도 반말로 바꾸지 않는다',
    'speech', '짧은 돌봄의 말. 정은 말보다 손으로 보인다. 지나치게 참견하지 않는다',
    'samples', jsonb_build_array('잘 잤어요?', '밥은 먹었어요?', '이것 좀 먹어봐요.', '조심해서 다녀와요.'),
    'doNot', jsonb_build_array('노트를 해설하는 현자 역할', '여행의 교훈을 내려주는 역할', '모든 걸 꿰뚫어보는 현명한 노인'),
    'memorySeed', jsonb_build_array('매일 새벽 마당을 쓸고 공용 주방을 정리한다', '익선동 골목의 변화를 다 지켜봤다'),
    'maxSpeechLevel', 'polite',
    'topics', jsonb_build_array('오늘 하루 어땠는지', '밥은 먹었는지', '익선동 골목 이야기', '날씨와 옷차림')
  ), true, 1),
  ('mina', 'backpack@2026-11-09', jsonb_build_object(
    'name', '미나', 'age', '25~26세',
    'job', '이틀 먼저 도착한 배낭여행자. 스위스에서 한국어를 배우러 왔다',
    'role', '여행자의 거울. 같은 게스트하우스 도미토리 룸메이트. 같은 외국인 학습자 시선',
    'register', '존댓말로 시작. 함께 다니며 서서히 편해진다',
    'speech', '준비한 문장은 자신 있게, 예상 밖 질문엔 갑자기 막힌다. 함께 풀어가는 쪽이다',
    'samples', jsonb_build_array('일단 가보자.', '그래서 우리 지금 뭐 주문한 거야?', '내가 어제 해봤거든.', '교통카드는 샀어?'),
    'doNot', jsonb_build_array('완벽한 한국어', '가이드 역할'),
    'memorySeed', jsonb_build_array('계획표에 적어온 곳을 하나씩 지워가는 재미로 다닌다', '벌써 발이 좀 아프다'),
    'maxSpeechLevel', 'slang',
    'topics', jsonb_build_array('오늘 가 본 곳', '한국어 공부하다 막힌 일', '서울 맛집', '여행 계획표')
  ), true, 2),
  ('doyun', 'backpack@2026-11-09', jsonb_build_object(
    'name', '한도윤', 'age', '22세',
    'job', '카페 끌림 아르바이트 · 소속사 아이돌 연습생(노래 · 춤)',
    'role', '골목에서 처음 마주치는 밝은 인상. 궁금한 게 많다',
    'register', '손님 응대는 공손한 존댓말',
    'speech', '궁금한 걸 먼저 묻는다. 반가움과 응원을 숨기지 않는다. 막히면 먼저 긴장을 풀어준다',
    'samples', jsonb_build_array('진짜요?', '그다음엔요?', '천천히 해도 돼요, 거의 다 알아들었어요.', '잘했는데요?'),
    'doNot', jsonb_build_array('메인 로맨스', '질투', '빈정거림을 주된 매력으로 쓰기'),
    'memorySeed', jsonb_build_array('새벽 연습을 마치고 카페에 온다', '다음 주 오디션 생각에 마음이 불편하지만 티 내지 않는다', '주말에 홍대에서 혼자 버스킹을 한다'),
    'maxSpeechLevel', 'casual',
    'topics', jsonb_build_array('오디션 연습', '카페 신메뉴', '좋아하는 노래', '홍대 버스킹')
  ), true, 3),
  ('jaemin', 'backpack@2026-11-09', jsonb_build_object(
    'name', '서재민', 'age', '29세',
    'job', '테크 회사 B2B 세일즈 담당자',
    'role', '카페 단골. 우산을 빌려준 일로 조금씩 가까워지는 사람. 담백하다',
    'register', '처음부터 끝까지 존댓말. 관계 변화는 반말 전환이 아니라 질문 내용으로 드러난다',
    'speech', '차분한 구어. 짧고 정확하게 말하고 리액션은 작다. 건조한 농담을 툭 던진다',
    'samples', jsonb_build_array('진짜요?', '그건 좀 신기하네요.', '근데 왜 거길 갔어요?', '그럼 내일은 뭐 해요?'),
    'doNot', jsonb_build_array('서울을 설명하는 가이드', '처음부터 적극적인 플러팅', '판매 문구 같은 말투', '학습자가 없으면 하루가 멈추는 사람'),
    'memorySeed', jsonb_build_array('퇴근길에 카페에 들러 메일을 정리한다', '주말엔 클라이밍을 한다', '우산을 두 개 들고 다닌다'),
    'maxSpeechLevel', 'polite',
    'topics', jsonb_build_array('퇴근길 카페', '주말 클라이밍', '요즘 일', '오늘 뭐 했는지')
  ), true, 4);

-- ------------------------------------------------------------------ 표

alter table companion.profiles add column last_region text check (last_region is null or last_region ~ '^[A-Z]{2}$');

-- 장기 메모리. character_id null = 모든 캐릭터가 읽는 공유 프로필 층(PRD §3.9).
create table companion.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id text references companion.characters (id),
  kind text not null check (kind in ('fact', 'event', 'summary')),
  content text not null check (char_length(content) between 1 and 500),
  source_message_id uuid references companion.messages (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index memories_user_idx on companion.memories (user_id, character_id, created_at desc) where deleted_at is null;

create table companion.moderation_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  strikes integer not null default 0,
  window_started_at timestamptz,
  blocked_until timestamptz
);

alter table companion.settings enable row level security;
alter table companion.memories enable row level security;
alter table companion.moderation_state enable row level security;
revoke all on table companion.memories, companion.moderation_state, companion.settings from public, anon, authenticated;
grant select, insert, update, delete on table companion.memories, companion.moderation_state to service_role;
grant select, update on table companion.settings to service_role;

-- ------------------------------------------------------------------ 서버용 (service_role)

-- 턴 뒤 추출한 기억을 넣는다. 같은 원본 메시지에서 두 번 넣지 않고(작업이 두 번 돌아도 결과가 같다), 이미 있는 글도 넣지 않는다.
-- p_items: [{ kind: 'fact' | 'event', content, shared: boolean }]
create function public.companion_add_memories(p_user_id uuid, p_character_id text, p_source_message_id uuid, p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'invalid memories' using errcode = '22023';
  end if;
  if p_source_message_id is not null and exists (
    select 1 from companion.memories where source_message_id = p_source_message_id
  ) then
    return 0;
  end if;
  insert into companion.memories (user_id, character_id, kind, content, source_message_id)
  select p_user_id, case when coalesce(r.shared, false) then null else p_character_id end, r.kind, left(r.content, 500), p_source_message_id
  from jsonb_to_recordset(p_items) as r(kind text, content text, shared boolean)
  where r.kind in ('fact', 'event') and coalesce(btrim(r.content), '') <> ''
    -- 같은 층(공유 · 이 캐릭터)에 같은 글이 이미 있으면 넣지 않는다 — 같은 말을 여러 번 해도 기억은 하나.
    and not exists (
      select 1 from companion.memories m
      where m.user_id = p_user_id and m.deleted_at is null
        and m.character_id is not distinct from (case when coalesce(r.shared, false) then null else p_character_id end)
        and lower(btrim(m.content)) = lower(btrim(r.content))
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 요약할 원문: 마지막 요약 뒤의 정상 메시지 가운데 최근 기록 창(p_keep) 밖의 것. 요약할 만큼(settings.summary_after) 모이지 않았으면 빈 배열.
create function public.companion_summary_source(p_conversation_id uuid, p_keep integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with candidates as (
    select m.role, m.text, m.segments, m.created_at
    from companion.messages m
    join companion.conversations c on c.id = m.conversation_id
    where m.conversation_id = p_conversation_id and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
      and (c.summarized_until is null or m.created_at > c.summarized_until)
    order by m.created_at desc
    offset greatest(p_keep, 0)
  )
  select case when count(*) >= (select summary_after from companion.settings) then jsonb_build_object(
    'summary', (select rolling_summary from companion.conversations where id = p_conversation_id),
    'until', max(created_at),
    'messages', jsonb_agg(jsonb_build_object('role', role, 'text', text, 'segments', segments) order by created_at)
  ) else null end
  from candidates
$$;

create function public.companion_save_summary(p_conversation_id uuid, p_summary text, p_until timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  update companion.conversations
  set rolling_summary = left(p_summary, 4000), summarized_until = p_until
  where id = p_conversation_id and (summarized_until is null or summarized_until < p_until);
$$;

-- 선톡 후보: 마지막 메시지 뒤 공백이 settings.proactive_gap을 넘고, 오늘 받은 선톡이 상한 미만이고, 선톡이 허용된 연령 · 지역인 대화.
-- 미국 12 ~ 17세와 나이 모름은 보내지 않는다(PRD §3.8 · §3.12 — 나이 모름은 미성년자 기본값).
create function public.companion_proactive_candidates(p_now timestamptz, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('userId', x.user_id, 'characterId', x.character_id, 'conversationId', x.id)), '[]'::jsonb)
  from (
    select c.user_id, c.character_id, c.id
    from companion.conversations c
    cross join companion.settings s
    left join companion.profiles p on p.user_id = c.user_id
    where c.kind = 'companion' and c.last_message_at is not null
      and c.last_message_at < p_now - s.proactive_gap
      and (
        companion.age_band(p.birth_year, p_now) = 'adult'
        -- 미성년자는 미국이 아닌 것을 아는 경우만. 지역을 모르면 미국일 수 있다고 본다.
        or (companion.age_band(p.birth_year, p_now) = 'minor' and p.last_region is not null and p.last_region <> 'US')
      )
      and (
        select count(*) from companion.messages m
        where m.user_id = c.user_id and m.origin = 'proactive' and m.created_at >= date_trunc('day', p_now)
      ) < s.proactive_daily_cap
    order by c.last_message_at
    limit greatest(1, least(coalesce(p_limit, 20), 200))
  ) x
$$;

-- 선톡 저장. 크레딧을 차감하지 않는다(PRD §3.10 제안).
create function public.companion_save_proactive(p_user_id uuid, p_character_id text, p_message_id uuid, p_segments jsonb, p_meta jsonb, p_now timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation uuid;
begin
  select id into v_conversation from companion.conversations
  where user_id = p_user_id and character_id = p_character_id and kind = 'companion';
  if v_conversation is null then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;
  insert into companion.messages (id, conversation_id, user_id, role, origin, status, segments, meta, created_at)
  values (p_message_id, v_conversation, p_user_id, 'assistant', 'proactive', 'complete', p_segments, coalesce(p_meta, '{}'::jsonb), clock_timestamp());
  update companion.conversations set last_message_at = p_now where id = v_conversation;
  return p_message_id;
end;
$$;

-- 선톡을 만들 맥락. 선톡 허용(연령 · 지역 규칙)과 오늘 상한 도달 여부를 함께 돌려준다 — 플레이그라운드는 상한 · 공백만 건너뛸 수 있다.
create function public.companion_proactive_context(p_user_id uuid, p_character_id text, p_history_limit integer, p_now timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'persona', ch.persona,
    'speechLevel', coalesce(r.speech_level, 'polite'),
    'summary', c.rolling_summary,
    'l1', p.l1,
    'ageBand', companion.age_band(p.birth_year, p_now),
    'hasConversation', c.id is not null,
    'allowed', companion.age_band(p.birth_year, p_now) = 'adult'
      or (companion.age_band(p.birth_year, p_now) = 'minor' and p.last_region is not null and p.last_region <> 'US'),
    'capReached', (
      select count(*) from companion.messages m
      where m.user_id = p_user_id and m.origin = 'proactive' and m.created_at >= date_trunc('day', p_now)
    ) >= s.proactive_daily_cap,
    'memories', coalesce((
      select jsonb_agg(content order by created_at desc) from (
        select content, created_at from companion.memories
        where user_id = p_user_id and deleted_at is null and (character_id = p_character_id or character_id is null)
        order by created_at desc limit s.memory_prompt_limit
      ) mm
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('role', h.role, 'text', h.text, 'segments', h.segments) order by h.created_at)
      from (
        select m.role, m.text, m.segments, m.created_at from companion.messages m
        where m.conversation_id = c.id and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
        order by m.created_at desc limit p_history_limit
      ) h
    ), '[]'::jsonb)
  )
  from companion.characters ch
  cross join companion.settings s
  left join companion.conversations c on c.user_id = p_user_id and c.character_id = ch.id and c.kind = 'companion'
  left join companion.relationships r on r.user_id = p_user_id and r.character_id = ch.id
  left join companion.profiles p on p.user_id = p_user_id
  where ch.id = p_character_id
$$;

-- 시험 계정 목록(M1)에 생년 · 지역 · 피드백 방식을 더한다 — 플레이그라운드가 지금 값을 보여 준다.
create or replace function public.companion_inspect_testers()
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
    'birthYear', p.birth_year,
    'l1', p.l1,
    'region', p.last_region,
    'feedbackMode', p.feedback_mode
  ) order by u.email), '[]'::jsonb)
  from auth.users u
  left join companion.profiles p on p.user_id = u.id
  where u.raw_app_meta_data->>'duru_tester' = 'true'
$$;

-- ------------------------------------------------------------------ 앱용 (authenticated) — 기억 보기 · 고치기 · 지우기(무료, PRD §3.9)

create function public.companion_list_memories(p_character_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id, 'characterId', character_id, 'kind', kind, 'content', content,
      'createdAt', to_char(created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ) order by created_at desc)
    from companion.memories
    where user_id = auth.uid() and deleted_at is null and character_id is not distinct from p_character_id
  ), '[]'::jsonb);
end;
$$;

create function public.companion_update_memory(p_memory_id uuid, p_content text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_content is null or char_length(btrim(p_content)) not between 1 and 500 then
    raise exception 'invalid memory' using errcode = '22023';
  end if;
  update companion.memories set content = btrim(p_content)
  where id = p_memory_id and user_id = auth.uid() and deleted_at is null;
  if not found then
    raise exception 'memory not found' using errcode = 'P0002';
  end if;
end;
$$;

create function public.companion_delete_memory(p_memory_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  update companion.memories set deleted_at = now()
  where id = p_memory_id and user_id = auth.uid() and deleted_at is null;
  if not found then
    raise exception 'memory not found' using errcode = 'P0002';
  end if;
end;
$$;

-- ------------------------------------------------------------------ 운영 (service_role)

create function public.companion_inspect_memory(p_user_id uuid, p_character_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'memories', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'characterId', character_id, 'kind', kind, 'content', content,
        'deleted', deleted_at is not null, 'createdAt', created_at) order by created_at desc)
      from companion.memories
      where user_id = p_user_id and (character_id = p_character_id or character_id is null)
    ), '[]'::jsonb),
    'summary', (select rolling_summary from companion.conversations
      where user_id = p_user_id and character_id = p_character_id and kind = 'companion'),
    'relationship', (select jsonb_build_object('intimacy', intimacy, 'speechLevel', speech_level)
      from companion.relationships where user_id = p_user_id and character_id = p_character_id),
    'moderation', (select jsonb_build_object('strikes', strikes, 'blockedUntil', blocked_until)
      from companion.moderation_state where user_id = p_user_id)
  )
$$;

-- 플레이그라운드에서 시험 계정의 연령 · 모국어 · 피드백 방식 · 지역을 바꾼다. null 인수는 그 열을 바꾸지 않고, p_clear_age면 생년을, p_region ''이면 지역을 지운다.
create function public.companion_operator_set_profile(
  p_user_id uuid, p_birth_year integer, p_clear_age boolean, p_l1 text, p_feedback_mode text, p_region text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from auth.users where id = p_user_id and raw_app_meta_data->>'duru_tester' = 'true') then
    raise exception 'not a tester' using errcode = 'P0002';
  end if;
  insert into companion.profiles (user_id) values (p_user_id) on conflict do nothing;
  update companion.profiles set
    birth_year = case when p_clear_age then null else coalesce(p_birth_year::smallint, birth_year) end,
    age_source = case when p_clear_age then null when p_birth_year is not null then 'self' else age_source end,
    l1 = coalesce(p_l1, l1),
    feedback_mode = coalesce(p_feedback_mode, feedback_mode),
    -- 빈 문자열이면 지역을 지운다(null은 그대로 둔다).
    last_region = case when p_region = '' then null else coalesce(p_region, last_region) end,
    updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- 플레이그라운드: 시험 계정의 그 캐릭터 대화 · 관계와 계정의 공유 기억 · 제재 · 고지 · 체험 사용량을 처음으로 되돌린다.
-- 공유 기억은 모든 캐릭터가 읽어서 함께 지운다. 크레딧 지갑 · 원장은 건드리지 않는다(체험 사용량은 M4 마이그레이션 뒤에만 있다).
create function public.companion_operator_reset(p_user_id uuid, p_character_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from auth.users where id = p_user_id and raw_app_meta_data->>'duru_tester' = 'true') then
    raise exception 'not a tester' using errcode = 'P0002';
  end if;
  delete from companion.conversations where user_id = p_user_id and character_id = p_character_id;
  delete from companion.relationships where user_id = p_user_id and character_id = p_character_id;
  delete from companion.memories where user_id = p_user_id and (character_id = p_character_id or character_id is null);
  delete from companion.moderation_state where user_id = p_user_id;
  delete from companion.notice_state where user_id = p_user_id;
end;
$$;

revoke all on function public.companion_add_memories(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.companion_summary_source(uuid, integer) from public, anon, authenticated;
revoke all on function public.companion_save_summary(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_proactive_candidates(timestamptz, integer) from public, anon, authenticated;
revoke all on function public.companion_save_proactive(uuid, text, uuid, jsonb, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_proactive_context(uuid, text, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.companion_inspect_memory(uuid, text) from public, anon, authenticated;
revoke all on function public.companion_operator_set_profile(uuid, integer, boolean, text, text, text) from public, anon, authenticated;
revoke all on function public.companion_operator_reset(uuid, text) from public, anon, authenticated;
grant execute on function public.companion_add_memories(uuid, text, uuid, jsonb) to service_role;
grant execute on function public.companion_summary_source(uuid, integer) to service_role;
grant execute on function public.companion_save_summary(uuid, text, timestamptz) to service_role;
grant execute on function public.companion_proactive_candidates(timestamptz, integer) to service_role;
grant execute on function public.companion_save_proactive(uuid, text, uuid, jsonb, jsonb, timestamptz) to service_role;
grant execute on function public.companion_proactive_context(uuid, text, integer, timestamptz) to service_role;
grant execute on function public.companion_inspect_memory(uuid, text) to service_role;
grant execute on function public.companion_operator_set_profile(uuid, integer, boolean, text, text, text) to service_role;
grant execute on function public.companion_operator_reset(uuid, text) to service_role;

revoke all on function public.companion_list_memories(text) from public, anon;
revoke all on function public.companion_update_memory(uuid, text) from public, anon;
revoke all on function public.companion_delete_memory(uuid) from public, anon;
grant execute on function public.companion_list_memories(text) to authenticated;
grant execute on function public.companion_update_memory(uuid, text) to authenticated;
grant execute on function public.companion_delete_memory(uuid) to authenticated;
