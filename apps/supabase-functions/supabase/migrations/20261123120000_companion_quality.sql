-- AI 컴패니언 — 기억 · 요약 · 번역 · 선톡 품질 보완(2026-11-10 개선 목록 1 ~ 6).
--
--   1. 답 없는 선톡 줄이기: 유저가 마지막으로 말한 뒤 그 대화에 쌓인 선톡 수(`unanswered`)를 센다.
--     · `settings.proactive_unanswered_limit`(기본 2, 0이면 끔) — 이만큼 쌓이면 더 보내지 않는다(`unanswered_limit`).
--     · `settings.proactive_backoff`(기본 2, 1이면 끔) — 답 없는 선톡이 n개면 공백을 `gap × backoff^n`으로 늘린다(`backoff`).
--     · 유저가 한 번 말하면 0으로 돌아간다. 판정은 `companion.proactive_conversation_skip_reason`(기존 유저 판정 + 위 둘)이 하고, 후보와
--       맥락이 같은 판정을 쓴다. 플레이그라운드 `force`는 여전히 빈도 판정을 건너뛰지만 맥락의 `skipReason`으로 막혔을 까닭을 알려 준다.
--   2. 기억 고치기: `companion_memory_source`가 기존 기억(id · 글 · 공유 · 유저가 고침)을 `existing`으로 같이 주고, 추출 모델이 더하기 ·
--     고치기 · 잊기를 고른다. `companion_apply_memory_ops`가 적용한다 — 고치기는 옛 글을 `memories.history`에 남기고(`updated_at`),
--     잊기는 소프트 삭제(`deleted_reason` forgotten). 유저가 고친 기억은 고치지도 잊지도 않는다(`protected`로 센다). 상한 · 밀어내기는
--     그대로이고, 밀어낸 기억은 `deleted_reason` evicted. `companion_inspect_memory`가 고친 때 · 옛 글 · 지운 까닭을 보여 준다.
--   4. 선톡 맥락: `companion_proactive_context`가 답 없는 선톡 수 · 유저의 마지막 말 시각 · 현지 시각(시간대를 알 때) · 최근 선톡 글 셋 ·
--     칩 스위치 · 표시 수 · 최근 칩 셋을 더 준다. 선톡에도 칩을 붙여 저장한다(`companion_save_proactive`의 `p_suggestions`). 칩 지표는
--     선톡 메시지도 센다.
--   6. 쉬는 대화의 기억 마저 뽑기: `settings.memory_flush_idle`(기본 30분) 넘게 조용하고 아직 뽑지 않은 유저 메시지가 있는 대화를
--     `companion_memory_flush_candidates`가 고르고, `companion_memory_source(…, p_flush => true)`는 묶음이 차지 않아도 원문을 준다.
--     예약 작업(`companion-proactive`의 `{ mode: "memory_flush" }`)이 부른다.
--   3. 요약: `companion_summary_source`도 유저 메시지의 `inputSource`를 준다(칩을 그대로 고른 말은 요약에서도 유저 사실이 아니다).
--   (5. 번역은 함수 쪽만 바뀐다.)
--
-- 기존 컴패니언 마이그레이션(20261108 ~ 20261122) 뒤에 적용한다. 다시 적용해도 같은 결과다.

alter table companion.settings
  add column if not exists proactive_unanswered_limit integer not null default 2,
  add column if not exists proactive_backoff numeric not null default 2,
  add column if not exists memory_flush_idle interval not null default interval '30 minutes';
alter table companion.settings drop constraint if exists settings_proactive_unanswered_limit_check;
alter table companion.settings
  add constraint settings_proactive_unanswered_limit_check check (proactive_unanswered_limit >= 0);
alter table companion.settings drop constraint if exists settings_proactive_backoff_check;
alter table companion.settings add constraint settings_proactive_backoff_check check (proactive_backoff between 1 and 10);

alter table companion.memories
  add column if not exists updated_at timestamptz,
  add column if not exists history jsonb not null default '[]'::jsonb,
  add column if not exists deleted_reason text;
alter table companion.memories drop constraint if exists memories_deleted_reason_check;
alter table companion.memories
  add constraint memories_deleted_reason_check check (deleted_reason is null or deleted_reason in ('evicted', 'forgotten'));

-- ------------------------------------------------------------------ 1. 답 없는 선톡

-- 유저가 이 대화에서 마지막으로 말한 뒤의 선톡 수(유저가 한 번도 말하지 않았으면 대화의 선톡 전부).
create or replace function companion.proactive_unanswered(p_conversation_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer from companion.messages m
  where m.conversation_id = p_conversation_id and m.origin = 'proactive' and not m.hidden
    and m.created_at > coalesce((
      select max(u.created_at) from companion.messages u where u.conversation_id = p_conversation_id and u.role = 'user'
    ), '-infinity'::timestamptz)
$$;
revoke all on function companion.proactive_unanswered(uuid) from public;

-- 유저 판정(`companion.proactive_skip_reason`)에 이 대화의 답 없는 선톡 규칙을 더한 것. 보내도 되면 null.
create or replace function companion.proactive_conversation_skip_reason(
  p_user_id uuid,
  p_conversation_id uuid,
  p_last_message_at timestamptz,
  p_now timestamptz
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  v_reason text;
  v_unanswered integer;
  v_pref text;
  v_gap interval;
begin
  v_reason := companion.proactive_skip_reason(p_user_id, p_last_message_at, p_now);
  if v_reason is not null or p_conversation_id is null then
    return v_reason;
  end if;
  select * into s from companion.settings;
  v_unanswered := companion.proactive_unanswered(p_conversation_id);
  if s.proactive_unanswered_limit > 0 and v_unanswered >= s.proactive_unanswered_limit then
    return 'unanswered_limit';
  end if;
  if v_unanswered > 0 and s.proactive_backoff > 1 then
    select p.proactive_pref into v_pref from companion.profiles p where p.user_id = p_user_id;
    v_gap := case coalesce(v_pref, 'daily1') when 'daily2' then s.proactive_gap_daily2 else s.proactive_gap end;
    if p_last_message_at > p_now - v_gap * power(s.proactive_backoff, v_unanswered)::double precision then
      return 'backoff';
    end if;
  end if;
  return null;
end;
$$;
revoke all on function companion.proactive_conversation_skip_reason(uuid, uuid, timestamptz, timestamptz) from public;

create or replace function public.companion_proactive_candidates(p_now timestamptz, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('userId', x.user_id, 'characterId', x.character_id, 'conversationId', x.id)
    order by x.last_message_at), '[]'::jsonb)
  from (
    select y.* from (
      select distinct on (c.user_id) c.user_id, c.character_id, c.id, c.last_message_at
      from companion.conversations c
      left join companion.profiles p on p.user_id = c.user_id
      where c.kind = 'companion' and c.last_message_at is not null
        -- 유저가 한 번도 말하지 않은 대화(첫 인사만 있음)에는 선톡하지 않는다.
        and exists (select 1 from companion.messages m where m.conversation_id = c.id and m.role = 'user')
        and (
          companion.age_band(p.birth_year, p_now) = 'adult'
          or (companion.age_band(p.birth_year, p_now) = 'minor' and p.last_region is not null and p.last_region <> 'US')
        )
        and companion.proactive_conversation_skip_reason(c.user_id, c.id, c.last_message_at, p_now) is null
      order by c.user_id, c.last_message_at
    ) y
    order by y.last_message_at
    limit greatest(1, least(coalesce(p_limit, 20), 200))
  ) x
$$;

-- 20261122 판 + 답 없는 선톡 수 · 대화 판정 · 유저의 마지막 말 시각 · 현지 시각 · 최근 선톡 글 · 칩 설정 · 최근 칩 셋.
create or replace function public.companion_proactive_context(p_user_id uuid, p_character_id text, p_history_limit integer, p_now timestamptz)
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
    'hasUserMessage', c.id is not null and exists (
      select 1 from companion.messages m where m.conversation_id = c.id and m.role = 'user'
    ),
    'allowed', companion.age_band(p.birth_year, p_now) = 'adult'
      or (companion.age_band(p.birth_year, p_now) = 'minor' and p.last_region is not null and p.last_region <> 'US'),
    'skipReason', companion.proactive_conversation_skip_reason(p_user_id, c.id, c.last_message_at, p_now),
    'capReached', companion.proactive_conversation_skip_reason(p_user_id, c.id, c.last_message_at, p_now) is not null,
    'unanswered', case when c.id is null then 0 else companion.proactive_unanswered(c.id) end,
    'lastUserMessageAt', (
      select max(m.created_at) from companion.messages m where m.conversation_id = c.id and m.role = 'user'
    ),
    'localHour', case when coalesce(p.timezone, companion.default_timezone(p.last_region)) is null then null
      else extract(hour from p_now at time zone coalesce(p.timezone, companion.default_timezone(p.last_region)))::integer end,
    'recentProactive', coalesce((
      select jsonb_agg(x.text order by x.created_at) from (
        select m.created_at, (
          select string_agg(seg->>'text', ' ' order by ord) from jsonb_array_elements(m.segments) with ordinality as t(seg, ord)
          where seg->>'kind' = 'speech'
        ) as text
        from companion.messages m
        where m.conversation_id = c.id and m.origin = 'proactive' and not m.hidden
        order by m.created_at desc limit 3
      ) x where x.text is not null
    ), '[]'::jsonb),
    'replySuggestions', coalesce(p.reply_suggestions, true),
    'suggestionsEnabled', s.suggestions_enabled,
    'suggestionDisplayMax', s.suggestion_display_max,
    'recentChoiceSets', case when c.id is null then '[]'::jsonb else companion.choice_sets(c.id, 5) end,
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

-- 선톡 저장 + 칩(`{version, items, candidates, model, createdAt, ms, playground?}` 또는 null). 크레딧을 차감하지 않는다.
drop function if exists public.companion_save_proactive(uuid, text, uuid, jsonb, jsonb, timestamptz);
create or replace function public.companion_save_proactive(
  p_user_id uuid,
  p_character_id text,
  p_message_id uuid,
  p_segments jsonb,
  p_meta jsonb,
  p_now timestamptz,
  p_suggestions jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation uuid;
begin
  if p_suggestions is not null and (
    jsonb_typeof(p_suggestions) <> 'object' or jsonb_typeof(p_suggestions->'items') is distinct from 'array'
  ) then
    raise exception 'invalid suggestions' using errcode = '22023';
  end if;
  select id into v_conversation from companion.conversations
  where user_id = p_user_id and character_id = p_character_id and kind = 'companion';
  if v_conversation is null then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;
  insert into companion.messages (id, conversation_id, user_id, role, origin, status, segments, meta, suggestions, created_at)
  values (
    p_message_id, v_conversation, p_user_id, 'assistant', 'proactive', 'complete', p_segments, coalesce(p_meta, '{}'::jsonb),
    p_suggestions, clock_timestamp()
  );
  update companion.conversations set last_message_at = p_now where id = v_conversation;
  return p_message_id;
end;
$$;
revoke all on function public.companion_save_proactive(uuid, text, uuid, jsonb, jsonb, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.companion_save_proactive(uuid, text, uuid, jsonb, jsonb, timestamptz, jsonb) to service_role;

-- ------------------------------------------------------------------ 2. 기억 고치기 · 6. 쉬는 대화의 기억

-- 기억을 뽑을 원문(20261122 판)과 기존 기억. p_min_user: 묶음이 되는 유저 메시지 수(보통 settings.memory_every, 마저 뽑기는 1).
create or replace function companion.memory_batch(p_conversation_id uuid, p_limit integer, p_min_user integer)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with candidates as (
    select m.id, m.role, m.text, m.segments, m.created_at, m.meta->>'inputSource' as input_source
    from companion.messages m
    join companion.conversations c on c.id = m.conversation_id
    where m.conversation_id = p_conversation_id and m.role in ('user', 'assistant') and m.status = 'complete' and not m.hidden
      and (c.memory_extracted_until is null or m.created_at > c.memory_extracted_until)
    order by m.created_at desc
    limit greatest(least(p_limit, 200), 1)
  )
  select case when count(*) filter (where role = 'user') >= greatest(p_min_user, 1) then jsonb_build_object(
    'until', max(created_at),
    'sourceMessageId', (select id from candidates where role = 'user' order by created_at desc limit 1),
    'messages', jsonb_agg(jsonb_build_object('role', role, 'text', text, 'segments', segments, 'inputSource', input_source) order by created_at),
    'existing', (
      select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'content', e.content,
        'shared', e.character_id is null, 'userEdited', e.user_edited) order by e.created_at), '[]'::jsonb)
      from (
        select mm.* from companion.memories mm
        join companion.conversations c on c.id = p_conversation_id
        where mm.user_id = c.user_id and mm.deleted_at is null and (mm.character_id = c.character_id or mm.character_id is null)
        order by mm.created_at desc limit 100
      ) e
    )
  ) else null end
  from candidates
$$;
revoke all on function companion.memory_batch(uuid, integer, integer) from public;

create or replace function public.companion_memory_source(p_conversation_id uuid, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select companion.memory_batch(p_conversation_id, p_limit, (select memory_every from companion.settings))
$$;

-- 마저 뽑기(p_flush 참): 아직 뽑지 않은 유저 메시지가 하나라도 있으면 원문을 준다.
create or replace function public.companion_memory_source(p_conversation_id uuid, p_limit integer, p_flush boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select companion.memory_batch(p_conversation_id, p_limit,
    case when p_flush then 1 else (select memory_every from companion.settings) end)
$$;
revoke all on function public.companion_memory_source(uuid, integer, boolean) from public, anon, authenticated;
grant execute on function public.companion_memory_source(uuid, integer, boolean) to service_role;

-- 추출 모델이 고른 기억 작업을 적용한다. 같은 원본 메시지로 두 번 적용하지 않는다(작업이 두 번 돌아도 결과가 같다).
-- p_ops: [{ op: 'add', kind: 'fact' | 'event', content, shared, reason? } | { op: 'update', id, content, reason? } | { op: 'forget', id, reason? }].
-- 고치기 · 잊기는 이 유저 · 이 캐릭터(또는 공유) 층의 지우지 않은 기억만, 유저가 고친 기억은 건드리지 않는다(protected).
-- 잊기 · 고치기를 먼저 하고 더하기를 나중에 한다(잊은 자리가 상한에 들어간다). 더하기는 20261117 규칙 그대로다.
-- 반환: { added, updated, forgotten, evicted, skipped, protected, ignored, full }.
create or replace function public.companion_apply_memory_ops(p_user_id uuid, p_character_id text, p_source_message_id uuid, p_ops jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  r record;
  v_memory companion.memories;
  v_content text;
  v_layer text;
  v_cap integer;
  v_count integer;
  v_victim uuid;
  v_added integer := 0;
  v_updated integer := 0;
  v_forgotten integer := 0;
  v_evicted integer := 0;
  v_skipped integer := 0;
  v_protected integer := 0;
  v_ignored integer := 0;
begin
  if jsonb_typeof(p_ops) is distinct from 'array' then
    raise exception 'invalid memory ops' using errcode = '22023';
  end if;
  if p_source_message_id is not null and exists (
    select 1 from companion.memories m
    where m.user_id = p_user_id and (m.source_message_id = p_source_message_id
      or m.history @> jsonb_build_array(jsonb_build_object('sourceMessageId', p_source_message_id)))
  ) then
    return jsonb_build_object('added', 0, 'updated', 0, 'forgotten', 0, 'evicted', 0, 'skipped', 0, 'protected', 0,
      'ignored', 0, 'full', false, 'duplicate', true);
  end if;
  select * into s from companion.settings;

  for r in
    select e.item, e.n from jsonb_array_elements(p_ops) with ordinality as e(item, n)
    where jsonb_typeof(e.item) = 'object' and e.item->>'op' in ('update', 'forget')
    order by e.n
  loop
    v_memory := null;
    if coalesce(r.item->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select * into v_memory from companion.memories m
      where m.id = (r.item->>'id')::uuid and m.user_id = p_user_id and m.deleted_at is null
        and (m.character_id = p_character_id or m.character_id is null)
      for update;
    end if;
    if v_memory.id is null then
      v_ignored := v_ignored + 1;
      continue;
    end if;
    if v_memory.user_edited then
      v_protected := v_protected + 1;
      continue;
    end if;
    if r.item->>'op' = 'update' then
      v_content := left(btrim(coalesce(r.item->>'content', '')), 500);
      if v_content = '' or lower(v_content) = lower(btrim(v_memory.content)) then
        v_ignored := v_ignored + 1;
        continue;
      end if;
      update companion.memories set content = v_content, updated_at = now(),
        history = history || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('op', 'update', 'content', v_memory.content,
          'reason', left(r.item->>'reason', 200), 'at', now(), 'sourceMessageId', p_source_message_id)))
      where id = v_memory.id;
      v_updated := v_updated + 1;
    else
      update companion.memories set deleted_at = now(), deleted_reason = 'forgotten',
        history = history || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('op', 'forget',
          'reason', left(r.item->>'reason', 200), 'at', now(), 'sourceMessageId', p_source_message_id)))
      where id = v_memory.id;
      v_forgotten := v_forgotten + 1;
    end if;
  end loop;

  for r in
    select e.item->>'kind' as kind, left(btrim(e.item->>'content'), 500) as content,
      coalesce((e.item->>'shared')::boolean, false) as shared
    from jsonb_array_elements(p_ops) with ordinality as e(item, n)
    where jsonb_typeof(e.item) = 'object' and e.item->>'op' = 'add' and e.item->>'kind' in ('fact', 'event')
      and coalesce(btrim(e.item->>'content'), '') <> ''
    order by e.n
  loop
    v_layer := case when r.shared then null else p_character_id end;
    v_cap := case when r.shared then s.shared_memory_cap else s.memory_cap end;
    perform pg_advisory_xact_lock(hashtextextended('companion.memories:' || p_user_id::text || ':' || coalesce(v_layer, ''), 0));
    continue when exists (
      select 1 from companion.memories m
      where m.user_id = p_user_id and m.deleted_at is null and m.character_id is not distinct from v_layer
        and lower(btrim(m.content)) = lower(r.content)
    );
    select count(*) into v_count from companion.memories m
    where m.user_id = p_user_id and m.deleted_at is null and m.character_id is not distinct from v_layer;
    while v_count >= v_cap loop
      select m.id into v_victim from companion.memories m
      where m.user_id = p_user_id and m.deleted_at is null and m.character_id is not distinct from v_layer and not m.user_edited
      order by m.created_at, m.id
      limit 1;
      exit when v_victim is null;
      update companion.memories set deleted_at = now(), deleted_reason = 'evicted' where id = v_victim;
      v_evicted := v_evicted + 1;
      v_count := v_count - 1;
      v_victim := null;
    end loop;
    if v_count >= v_cap then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    insert into companion.memories (user_id, character_id, kind, content, source_message_id)
    values (p_user_id, v_layer, r.kind, r.content, p_source_message_id);
    v_added := v_added + 1;
  end loop;
  return jsonb_build_object('added', v_added, 'updated', v_updated, 'forgotten', v_forgotten, 'evicted', v_evicted,
    'skipped', v_skipped, 'protected', v_protected, 'ignored', v_ignored, 'full', v_skipped > 0);
end;
$$;
revoke all on function public.companion_apply_memory_ops(uuid, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.companion_apply_memory_ops(uuid, text, uuid, jsonb) to service_role;

-- 쉬는 대화: 마지막 메시지 뒤 settings.memory_flush_idle이 지났고 아직 기억을 뽑지 않은 유저 메시지가 있는 대화(오래 조용한 것부터).
-- 장기 메모리를 끈 판정(미국 12 ~ 15세 · 미국 나이 모름 — turn gate와 같은 식)이면 `memoryEnabled` 거짓 — 부르는 쪽이 표시만 옮긴다.
create or replace function public.companion_memory_flush_candidates(p_now timestamptz, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('userId', x.user_id, 'characterId', x.character_id, 'conversationId', x.id,
    'memoryEnabled', x.memory_enabled, 'minor', x.band <> 'adult') order by x.last_message_at), '[]'::jsonb)
  from (
    select c.user_id, c.character_id, c.id, c.last_message_at, companion.age_band(p.birth_year, p_now) as band,
      not (coalesce(p.last_region, '') = 'US' and (
        companion.age_band(p.birth_year, p_now) = 'unknown'
        or (companion.age_band(p.birth_year, p_now) = 'minor' and extract(year from p_now)::integer - p.birth_year <= 15)
      )) as memory_enabled
    from companion.conversations c
    cross join companion.settings s
    left join companion.profiles p on p.user_id = c.user_id
    where c.kind = 'companion' and c.last_message_at is not null and c.last_message_at < p_now - s.memory_flush_idle
      and exists (
        select 1 from companion.messages m
        where m.conversation_id = c.id and m.role = 'user' and m.status = 'complete' and not m.hidden
          and (c.memory_extracted_until is null or m.created_at > c.memory_extracted_until)
      )
    order by c.last_message_at
    limit greatest(1, least(coalesce(p_limit, 20), 200))
  ) x
$$;
revoke all on function public.companion_memory_flush_candidates(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.companion_memory_flush_candidates(timestamptz, integer) to service_role;

-- ------------------------------------------------------------------ 3. 요약 — 칩을 그대로 고른 말 표시

-- 20261111 판 + 메시지마다 `inputSource`(칩을 그대로 고른 유저 말은 요약에서도 유저 사실로 적지 않는다).
create or replace function public.companion_summary_source(p_conversation_id uuid, p_keep integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with candidates as (
    select m.role, m.text, m.segments, m.created_at, m.meta->>'inputSource' as input_source
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
    'messages', jsonb_agg(jsonb_build_object('role', role, 'text', text, 'segments', segments, 'inputSource', input_source) order by created_at)
  ) else null end
  from candidates
$$;

-- 운영 조회(20261117 판) + 고친 때 · 옛 글(history) · 지운 까닭 · 지운 때.
create or replace function public.companion_inspect_memory(p_user_id uuid, p_character_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'memories', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'characterId', character_id, 'kind', kind, 'content', content,
        'userEdited', user_edited, 'deleted', deleted_at is not null, 'createdAt', created_at,
        'updatedAt', updated_at, 'deletedAt', deleted_at, 'deletedReason', deleted_reason, 'history', history)
        order by created_at desc)
      from companion.memories
      where user_id = p_user_id and (character_id = p_character_id or character_id is null)
    ), '[]'::jsonb),
    'capacity', jsonb_build_object(
      'character', companion.memory_layer_status(p_user_id, p_character_id),
      'shared', companion.memory_layer_status(p_user_id, null)
    ),
    'summary', (select rolling_summary from companion.conversations
      where user_id = p_user_id and character_id = p_character_id and kind = 'companion'),
    'relationship', (select jsonb_build_object('intimacy', intimacy, 'speechLevel', speech_level)
      from companion.relationships where user_id = p_user_id and character_id = p_character_id),
    'moderation', (select jsonb_build_object('strikes', strikes, 'blockedUntil', blocked_until)
      from companion.moderation_state where user_id = p_user_id)
  )
$$;

-- ------------------------------------------------------------------ 지표 — 선톡 칩도 센다

-- p_since 뒤의 칩 대상 캐릭터 메시지(보통 답 · 첫 인사 · 선톡 가운데 스위치가 켜져 칩을 만들려 한 것 — meta.suggestions가 있음).
-- p_playground: null이면 전부, 참이면 플레이그라운드만, 거짓이면 실제 유저만.
create or replace function public.companion_suggestion_stats(p_since timestamptz, p_playground boolean default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with eligible as (
    select m.id, m.meta, m.suggestions,
      case when jsonb_typeof(m.suggestions->'items') = 'array' then jsonb_array_length(m.suggestions->'items') else 0 end as shown
    from companion.messages m
    where m.role = 'assistant' and m.origin in ('turn', 'greeting', 'proactive') and m.created_at >= p_since
      and m.meta ? 'suggestions'
      and (p_playground is null or coalesce((m.meta->>'playground')::boolean, false) = p_playground)
  ),
  answered as (
    select * from eligible where shown > 0 and suggestions ? 'outcome'
  )
  select jsonb_build_object(
    'since', p_since,
    'eligible', (select count(*) from eligible),
    'shown', (select count(*) from eligible where shown > 0),
    'byCount', jsonb_build_object(
      '1', (select count(*) from eligible where shown = 1),
      '2', (select count(*) from eligible where shown = 2),
      '3', (select count(*) from eligible where shown = 3),
      'noValid', (select count(*) from eligible where shown = 0 and meta->>'suggestions' = 'no_valid_candidates'),
      'failed', (select count(*) from eligible where shown = 0 and coalesce(meta->>'suggestions', '') <> 'no_valid_candidates')
    ),
    'answered', (select count(*) from answered),
    'chosen', (select count(*) from answered where suggestions->>'outcome' = 'chosen'),
    'ignored', (select count(*) from answered where suggestions->>'outcome' = 'ignored'),
    'intents', coalesce((
      select jsonb_object_agg(intent, n) from (
        select item->>'intent' as intent, count(*) as n
        from eligible cross join lateral jsonb_array_elements(
          case when jsonb_typeof(suggestions->'items') = 'array' then suggestions->'items' else '[]'::jsonb end
        ) item
        group by 1
      ) i where intent is not null
    ), '{}'::jsonb),
    'chosenIntents', coalesce((
      select jsonb_object_agg(intent, n) from (
        select suggestions->'items'->((suggestions->>'outcomeIndex')::integer)->>'intent' as intent, count(*) as n
        from answered where suggestions->>'outcome' = 'chosen' and suggestions ? 'outcomeIndex'
        group by 1
      ) i where intent is not null
    ), '{}'::jsonb),
    'dropReasons', coalesce((
      select jsonb_object_agg(reason, n) from (
        select candidate->>'reason' as reason, count(*) as n
        from eligible cross join lateral jsonb_array_elements(
          case when jsonb_typeof(suggestions->'candidates') = 'array' then suggestions->'candidates' else '[]'::jsonb end
        ) candidate
        where candidate->>'reason' is not null
        group by 1
      ) r
    ), '{}'::jsonb),
    'latencyMs', (
      select jsonb_build_object(
        'p50', percentile_cont(0.5) within group (order by (meta->>'suggestionsMs')::numeric),
        'p95', percentile_cont(0.95) within group (order by (meta->>'suggestionsMs')::numeric),
        'n', count(*)
      )
      from eligible where jsonb_typeof(meta->'suggestionsMs') = 'number'
    ),
    'tokens', (
      select jsonb_build_object(
        'model', max(meta->'usage'->'suggestions'->>'model'),
        'calls', coalesce(sum((meta->'usage'->'suggestions'->>'calls')::numeric), 0),
        'inputTokens', coalesce(sum((meta->'usage'->'suggestions'->>'inputTokens')::numeric), 0),
        'cacheReadTokens', coalesce(sum((meta->'usage'->'suggestions'->>'cacheReadTokens')::numeric), 0),
        'cacheWriteTokens', coalesce(sum((meta->'usage'->'suggestions'->>'cacheWriteTokens')::numeric), 0),
        'outputTokens', coalesce(sum((meta->'usage'->'suggestions'->>'outputTokens')::numeric), 0)
      )
      from eligible where jsonb_typeof(meta->'usage'->'suggestions') = 'object'
    )
  )
$$;
revoke all on function public.companion_suggestion_stats(timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.companion_suggestion_stats(timestamptz, boolean) to service_role;
