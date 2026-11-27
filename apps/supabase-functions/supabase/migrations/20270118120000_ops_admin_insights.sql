-- 운영 도구 판정 · 기억 · 스토리 조회 1차(ops-dashboard `docs/admin-insights.md` · `docs/admin-contract.md` §G-A). 20270117 뒤에 적용한다.
-- 공통 규칙(`p_actor` · 열람 기록 · `service_role`만 · 짧은 오류 코드)은 20261212 그대로다.
--
-- 1. 리비전: `companion.moderation_events.rev` — 판정 때의 지시문 해시 8자리. 함수(`chat-send` 등)가 RPC 요청 헤더 `x-guardrail-rev`에
--    싣고(`guardrail-rev.ts`), 칸 기본값이 PostgREST의 `request.headers`에서 읽는다. 턴 저장 RPC를 다시 정의하지 않는다.
--    옛 줄 · 헤더 없는 호출은 null. 모양이 틀린 헤더도 null(저장은 막지 않는다).
-- 2. 표: `ops.guardrail_revs`(리비전 이름 · 메모) · `ops.moderation_reviews`(판정 하나에 검토 하나).
-- 3. RPC: `ops_moderation_summary` · `ops_moderation_feed` · `ops_review_moderation` · `ops_set_guardrail_rev` · `ops_user_memories` ·
--    `ops_user_stories`.
--
-- 다시 적용해도 같은 결과다.

-- ------------------------------------------------------------------ 1. 리비전

-- PostgREST가 요청마다 `request.headers`(JSON)를 둔다. 없거나 깨졌거나 모양이 틀리면 null.
create or replace function companion.request_guardrail_rev()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v text;
begin
  v := nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-guardrail-rev';
  return case when v ~ '^[0-9a-f]{8}$' then v end;
exception when others then
  return null;
end;
$$;

-- 칸을 먼저 더하고 기본값은 따로 — 옛 줄은 null로 남고 표를 다시 쓰지 않는다.
alter table companion.moderation_events add column if not exists rev text;
alter table companion.moderation_events drop constraint if exists moderation_events_rev_check;
alter table companion.moderation_events add constraint moderation_events_rev_check check (rev is null or rev ~ '^[0-9a-f]{8}$');
alter table companion.moderation_events alter column rev set default companion.request_guardrail_rev();

-- ------------------------------------------------------------------ 2. 표

create table if not exists ops.guardrail_revs (
  rev text primary key check (rev ~ '^[0-9a-f]{8}$'),
  label text check (label is null or char_length(label) between 1 and 80),
  note text check (note is null or char_length(note) <= 500),
  updated_by text not null,
  updated_at timestamptz not null default now()
);

create table if not exists ops.moderation_reviews (
  event_id uuid primary key references companion.moderation_events (id) on delete cascade,
  verdict text not null check (verdict in ('correct', 'false_positive', 'missed', 'unsure')),
  expected_category text check (expected_category is null or expected_category ~ '^[a-z_]{1,64}$'),
  note text check (note is null or char_length(note) <= 200),
  actor text not null,
  at timestamptz not null default now()
);

alter table ops.guardrail_revs enable row level security;
alter table ops.moderation_reviews enable row level security;
revoke all on table ops.guardrail_revs, ops.moderation_reviews from public, anon, authenticated;

-- ------------------------------------------------------------------ 내부 도우미

-- 판정 한 줄의 차원 — 사용자 메시지 · 캐릭터 답 · 캐릭터 · 연령대 · 로맨스 선(답 meta). 판정이 답에 달려 있으면 `reply_to`로 사용자 메시지를,
-- 사용자 메시지에 달려 있으면 같은 대화의 그 메시지 답(가장 늦은 것)을 찾는다(§F-A와 같은 규칙, 대화 색인을 탄다).
create or replace function ops.moderation_scope(p_from timestamptz, p_to timestamptz)
returns table (
  id uuid, at timestamptz, user_id uuid, stage text, category text, action text, rev text,
  user_message_id uuid, reply_id uuid, conversation_id uuid, character_id text, age_band text, romance_line text
)
language sql
stable
set search_path = ''
as $$
  select e.id, e.created_at, e.user_id, e.layer, e.category, e.action, e.rev,
    case when m.role = 'assistant' then m.reply_to else m.id end,
    a.id, m.conversation_id, c.character_id, a.meta->>'ageBand', a.meta->>'romanceLine'
  from companion.moderation_events e
  left join companion.messages m on m.id = e.message_id
  left join companion.conversations c on c.id = m.conversation_id
  left join lateral (
    select x.id, x.meta from companion.messages x
    where (m.role = 'assistant' and x.id = m.id)
      or (m.role = 'user' and x.conversation_id = m.conversation_id and x.created_at >= m.created_at
        and x.reply_to = m.id and x.role = 'assistant')
    order by x.created_at desc
    limit 1
  ) a on true
  where e.created_at >= p_from and e.created_at < p_to
$$;

-- 거르기 값 검사(오류는 짧은 코드).
create or replace function ops.check_moderation_filters(
  p_from timestamptz, p_to timestamptz, p_max_days integer, p_stage text, p_age text, p_line text
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_from >= p_to or p_to - p_from > make_interval(days => p_max_days) then
    raise exception 'invalid_range' using errcode = '22023';
  end if;
  if p_stage is not null and p_stage not in ('input', 'output_sync', 'output_async') then
    raise exception 'invalid_stage' using errcode = '22023';
  end if;
  if p_age is not null and p_age not in ('adult', 'minor', 'unknown') then
    raise exception 'invalid_age' using errcode = '22023';
  end if;
  if p_line is not null and p_line not in ('none', 'hug', 'kiss', 'close', 'open') then
    raise exception 'invalid_line' using errcode = '22023';
  end if;
end;
$$;

-- ------------------------------------------------------------------ 3. RPC — 판정

-- 판정 현황. `cells` · `daily`는 allow가 아닌 판정, `tracked`는 기록용 허용(romance · sexual), `per1k`는 같은 거르기의 입력 검사 1천 건당.
create or replace function public.ops_moderation_summary(
  p_actor text, p_from timestamptz, p_to timestamptz,
  p_stage text default null, p_age text default null, p_line text default null, p_character text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_result jsonb;
begin
  perform ops.check_moderation_filters(p_from, p_to, 90, p_stage, p_age, p_line);
  set local statement_timeout = '8s';

  with scope as materialized (
    select * from ops.moderation_scope(p_from, p_to) s
    where (p_age is null or s.age_band = p_age)
      and (p_line is null or s.romance_line = p_line)
      and (p_character is null or s.character_id = p_character)
  ),
  totals as (select count(*) filter (where stage = 'input') inputs from scope)
  select jsonb_build_object(
    'inputs', (select inputs from totals),
    'cells', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'stage', stage, 'blocks', n,
        'per1k', case when tt.inputs > 0 then round(n * 1000.0 / tt.inputs, 2) end) order by n desc, category, stage)
      from (select category, stage, count(*) n from scope
        where action <> 'allow' and (p_stage is null or stage = p_stage) group by 1, 2) t cross join totals tt), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', on_day, 'category', category, 'blocks', n) order by on_day, category)
      from (select (at at time zone 'Asia/Seoul')::date on_day, category, count(*) n from scope
        where action <> 'allow' and (p_stage is null or stage = p_stage) group by 1, 2) t), '[]'::jsonb),
    'tracked', coalesce((
      select jsonb_agg(jsonb_build_object('line', romance_line, 'characterId', character_id, 'category', category, 'count', n)
        order by n desc)
      from (select romance_line, character_id, category, count(*) n from scope
        where action = 'allow' and category in ('romance', 'sexual') and (p_stage is null or stage = p_stage)
        group by 1, 2, 3) t), '[]'::jsonb),
    'revs', coalesce((
      select jsonb_agg(jsonb_build_object('rev', t.rev, 'label', g.label, 'note', g.note, 'firstAt', t.first_at,
        'lastAt', t.last_at, 'events', t.events, 'blocks', t.blocks, 'reviewed', t.reviewed,
        'falsePositives', t.false_positives) order by t.first_at)
      from (
        select sc.rev, min(sc.at) first_at, max(sc.at) last_at, count(*) events,
          count(*) filter (where sc.action <> 'allow') blocks,
          count(r.event_id) reviewed, count(*) filter (where r.verdict = 'false_positive') false_positives
        from scope sc left join ops.moderation_reviews r on r.event_id = sc.id
        where sc.rev is not null group by sc.rev
      ) t left join ops.guardrail_revs g on g.rev = t.rev), '[]'::jsonb),
    'strikes', coalesce((
      select jsonb_agg(jsonb_build_object('user', ops.user_row(ms.user_id), 'strikes', ms.strikes,
        'windowStartedAt', ms.window_started_at) order by ms.strikes desc, ms.window_started_at desc)
      from companion.moderation_state ms cross join companion.settings st
      where ms.strikes >= greatest(st.strike_limit - 1, 1)
        and ms.window_started_at >= now() - st.strike_window), '[]'::jsonb)
  ) into v_result;

  perform ops.log(v_actor, 'view', 'moderation_summary', null, jsonb_strip_nulls(jsonb_build_object(
    'from', p_from, 'to', p_to, 'stage', p_stage, 'age', p_age, 'line', p_line, 'character', p_character)));
  return v_result;
end;
$$;

-- 판정 목록 한 쪽(최신순). `p_action` null = allow가 아닌 것 전부, `tracked` = 기록용 허용(romance · sexual).
create or replace function public.ops_moderation_feed(
  p_actor text, p_from timestamptz, p_to timestamptz,
  p_category text default null, p_stage text default null, p_action text default null, p_character text default null,
  p_age text default null, p_line text default null, p_rev text default null, p_review text default null,
  p_user uuid default null, p_limit integer default 50, p_before timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_cut timestamptz;
  v_items jsonb;
  v_more boolean;
begin
  perform ops.check_moderation_filters(p_from, p_to, 90, p_stage, p_age, p_line);
  if p_action is not null and p_action not in ('block', 'crisis', 'hide', 'tracked') then
    raise exception 'invalid_action' using errcode = '22023';
  end if;
  if p_review is not null and p_review not in ('none', 'correct', 'false_positive', 'missed', 'unsure') then
    raise exception 'invalid_review' using errcode = '22023';
  end if;
  if p_rev is not null and p_rev !~ '^[0-9a-f]{8}$' then
    raise exception 'invalid_rev' using errcode = '22023';
  end if;
  if p_limit is null or p_limit not between 1 and 200 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;
  set local statement_timeout = '8s';

  with scope as materialized (
    select s.*, r.verdict, r.expected_category, r.note, r.actor reviewer, r.at reviewed_at
    from ops.moderation_scope(p_from, least(p_to, coalesce(p_before, p_to))) s
    left join ops.moderation_reviews r on r.event_id = s.id
    where (p_user is null or s.user_id = p_user)
      and (p_category is null or s.category = p_category)
      and (p_stage is null or s.stage = p_stage)
      and case
        when p_action is null then s.action <> 'allow'
        when p_action = 'tracked' then s.action = 'allow' and s.category in ('romance', 'sexual')
        else s.action = p_action end
      and (p_character is null or s.character_id = p_character)
      and (p_age is null or s.age_band = p_age)
      and (p_line is null or s.romance_line = p_line)
      and (p_rev is null or s.rev = p_rev)
      and case
        when p_review is null then true
        when p_review = 'none' then r.event_id is null
        else r.verdict = p_review end
  ),
  -- 쪽 끝 시각. 이 시각까지(같은 시각 포함) 넣는다(§F-A와 같다).
  cut as (select min(at) at from (select at from scope order by at desc limit p_limit) t)
  select (select at from cut),
    exists (select 1 from scope, cut where scope.at < cut.at),
    coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id, 'at', s.at, 'stage', s.stage, 'category', s.category, 'action', s.action, 'rev', s.rev,
      'ageBand', s.age_band, 'romanceLine', s.romance_line, 'characterId', s.character_id,
      'user', jsonb_build_object('id', u.id, 'email', u.email, 'name', lp.name,
        'tester', coalesce(u.raw_app_meta_data->>'duru_tester' = 'true', false)),
      'previous', case when pv.id is not null then jsonb_build_object('id', pv.id, 'segments', pv.segments, 'at', pv.created_at) end,
      'message', case when um.id is not null then jsonb_build_object('id', um.id, 'text', left(um.text, 2000),
        'status', um.status, 'inputSource', um.meta->>'inputSource', 'at', um.created_at) end,
      'reply', case when am.id is not null then jsonb_build_object('id', am.id, 'status', am.status, 'hidden', am.hidden,
        'segments', am.segments,
        'refusal', case when am.meta->>'refusal' = 'true' then jsonb_build_object(
          'stage', am.meta->>'refusalStage', 'category', am.meta->>'refusalCategory') end,
        'recovered', am.meta->'guardrailRecovered',
        'at', am.created_at) end,
      'strikes', ms.strikes,
      'review', case when s.verdict is not null then jsonb_build_object('verdict', s.verdict,
        'expectedCategory', s.expected_category, 'note', s.note, 'actor', s.reviewer, 'at', s.reviewed_at) end)
    order by s.at desc, s.id), '[]'::jsonb)
  into v_cut, v_more, v_items
  from scope s
  join auth.users u on u.id = s.user_id
  left join public.learner_profiles lp on lp.user_id = s.user_id
  left join companion.moderation_state ms on ms.user_id = s.user_id
  left join companion.messages um on um.id = s.user_message_id
  left join companion.messages am on am.id = s.reply_id
  left join lateral (
    select x.id, x.segments, x.created_at from companion.messages x
    where x.conversation_id = um.conversation_id and x.created_at < um.created_at and x.role = 'assistant'
    order by x.created_at desc
    limit 1
  ) pv on true
  where s.at >= (select at from cut);

  v_more := coalesce(v_more, false);

  perform ops.log(v_actor, 'view', 'moderation_feed', p_user, jsonb_strip_nulls(jsonb_build_object(
    'from', p_from, 'to', p_to, 'category', p_category, 'stage', p_stage, 'action', p_action, 'character', p_character,
    'age', p_age, 'line', p_line, 'rev', p_rev, 'review', p_review, 'limit', p_limit, 'before', p_before)));
  return jsonb_build_object('items', v_items, 'hasMore', v_more);
end;
$$;

-- 검토 하나 — 다시 고르면 덮는다, `p_verdict` null이면 지운다. 바뀌기 전 값은 기록(detail.before)에.
create or replace function public.ops_review_moderation(
  p_actor text, p_event uuid, p_verdict text, p_expected_category text default null, p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_before jsonb;
  v_review ops.moderation_reviews;
  v_user uuid;
begin
  select user_id into v_user from companion.moderation_events where id = p_event;
  if v_user is null then
    raise exception 'not_found';
  end if;
  if p_verdict is not null and p_verdict not in ('correct', 'false_positive', 'missed', 'unsure') then
    raise exception 'invalid_verdict' using errcode = '22023';
  end if;
  if p_expected_category is not null and p_expected_category !~ '^[a-z_]{1,64}$' then
    raise exception 'invalid_category' using errcode = '22023';
  end if;
  if p_note is not null and char_length(p_note) > 200 then
    raise exception 'invalid_note' using errcode = '22023';
  end if;

  select to_jsonb(r) - 'event_id' into v_before from ops.moderation_reviews r where r.event_id = p_event;
  if p_verdict is null then
    delete from ops.moderation_reviews where event_id = p_event;
  else
    insert into ops.moderation_reviews as t (event_id, verdict, expected_category, note, actor, at)
    values (p_event, p_verdict, p_expected_category, nullif(btrim(p_note), ''), v_actor, now())
    on conflict (event_id) do update set verdict = excluded.verdict, expected_category = excluded.expected_category,
      note = excluded.note, actor = excluded.actor, at = excluded.at
    returning * into v_review;
  end if;

  perform ops.log(v_actor, 'write', 'review_moderation', v_user, jsonb_strip_nulls(jsonb_build_object(
    'event', p_event, 'verdict', p_verdict, 'expectedCategory', p_expected_category, 'before', v_before)));
  return jsonb_build_object('ok', true, 'review', case when v_review.event_id is not null then jsonb_build_object(
    'verdict', v_review.verdict, 'expectedCategory', v_review.expected_category, 'note', v_review.note,
    'actor', v_review.actor, 'at', v_review.at) end);
end;
$$;

-- 리비전 이름 · 메모. 이름 · 메모가 둘 다 비면 그 줄을 지운다.
create or replace function public.ops_set_guardrail_rev(p_actor text, p_rev text, p_label text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_label text := nullif(btrim(p_label), '');
  v_note text := nullif(btrim(p_note), '');
  v_row ops.guardrail_revs;
begin
  if p_rev is null or p_rev !~ '^[0-9a-f]{8}$' then
    raise exception 'invalid_rev' using errcode = '22023';
  end if;
  if v_label is not null and char_length(v_label) > 80 then
    raise exception 'invalid_label' using errcode = '22023';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'invalid_note' using errcode = '22023';
  end if;

  if v_label is null and v_note is null then
    delete from ops.guardrail_revs where rev = p_rev;
  else
    insert into ops.guardrail_revs as t (rev, label, note, updated_by, updated_at)
    values (p_rev, v_label, v_note, v_actor, now())
    on conflict (rev) do update set label = excluded.label, note = excluded.note,
      updated_by = excluded.updated_by, updated_at = excluded.updated_at
    returning * into v_row;
  end if;

  perform ops.log(v_actor, 'write', 'set_guardrail_rev', null, jsonb_strip_nulls(jsonb_build_object(
    'rev', p_rev, 'label', v_label, 'note', v_note)));
  return jsonb_build_object('ok', true, 'rev', jsonb_build_object('rev', p_rev, 'label', v_row.label, 'note', v_row.note));
end;
$$;

-- ------------------------------------------------------------------ 3. RPC — 기억 · 스토리

-- 한 사용자의 기억 전부(캐릭터 가리지 않음) — 출처 메시지 · 지운 까닭. ADR-0210 뒤 공유 층(character_id null)은 옮겨져 거의 없다.
create or replace function public.ops_user_memories(p_actor text, p_user uuid, p_include_deleted boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_result jsonb;
begin
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;

  select jsonb_build_object(
    'memories', coalesce((
      select jsonb_agg(jsonb_build_object('id', mm.id, 'characterId', mm.character_id, 'kind', mm.kind, 'text', mm.content,
        'createdAt', mm.created_at, 'updatedAt', mm.updated_at, 'deletedAt', mm.deleted_at, 'deletedReason', mm.deleted_reason,
        'source', case when src.id is not null then jsonb_build_object('messageId', src.id, 'text', left(src.text, 300),
          'inputSource', src.meta->>'inputSource', 'at', src.created_at) end)
        order by mm.character_id nulls first, coalesce(mm.updated_at, mm.created_at) desc)
      from companion.memories mm
      left join companion.messages src on src.id = mm.source_message_id
      where mm.user_id = p_user and (coalesce(p_include_deleted, false) or mm.deleted_at is null)), '[]'::jsonb),
    'relationships', coalesce((
      select jsonb_agg(jsonb_build_object('characterId', r.character_id, 'intimacy', r.intimacy, 'speechLevel', r.speech_level)
        order by r.intimacy desc, r.character_id)
      from companion.relationships r where r.user_id = p_user), '[]'::jsonb)
  ) into v_result;

  perform ops.log(v_actor, 'view', 'user_memories', p_user, jsonb_build_object('includeDeleted', coalesce(p_include_deleted, false)));
  return v_result;
end;
$$;

-- 한 사용자의 스토리 — 내 스토리 한 쪽(최신순) + 거절된 사진 · 친구 스토리 답장 · 지난 스토리 열람(각 최근 50).
-- 거절된 사진은 분류 · 상태만 — 격리 버킷 경로를 내보내지 않는다(기획 I9).
create or replace function public.ops_user_stories(
  p_actor text, p_user uuid, p_limit integer default 30, p_before timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_stories jsonb;
  v_cut timestamptz;
  v_more boolean;
  v_result jsonb;
begin
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if p_limit is null or p_limit not between 1 and 100 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  select min(posted_at) into v_cut from (
    select posted_at from companion.my_stories
    where user_id = p_user and (p_before is null or posted_at < p_before)
    order by posted_at desc limit p_limit
  ) t;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id, 'kind', s.kind,
      'status', case when s.status = 'live' and s.expires_at <= now() then 'expired' else s.status end,
      'createdAt', s.posted_at, 'expiresAt', s.expires_at, 'background', s.background,
      'ko', s.ko, 'roman', s.roman, 'meaning', s.meaning, 'lineOriginal', s.line_original,
      'overlays', s.overlays, 'scene', s.scene, 'imagePath', s.image_path,
      'seen', (select count(*) from companion.my_story_seen x where x.story_id = s.id),
      'reactions', coalesce((select jsonb_agg(jsonb_build_object('characterId', r.character_id, 'rank', r.rank, 'angle', r.angle,
          'status', r.status, 'messageId', r.message_id, 'dueAt', r.due_at, 'doneAt', r.done_at) order by r.rank)
        from companion.my_story_reactions r where r.story_id = s.id), '[]'::jsonb),
      'replies', (select count(*) from companion.my_story_replies x where x.my_story_id = s.id),
      'quiz', (select jsonb_build_object('word', q.word, 'result', q.result, 'characterId', q.character_id)
        from companion.my_story_quizzes q where q.story_id = s.id order by q.created_at desc limit 1))
    order by s.posted_at desc, s.id), '[]'::jsonb)
  into v_stories
  from companion.my_stories s
  where s.user_id = p_user and s.posted_at >= v_cut and (p_before is null or s.posted_at < p_before);

  v_more := v_cut is not null and exists (
    select 1 from companion.my_stories where user_id = p_user and posted_at < v_cut
  );

  select jsonb_build_object(
    'stories', v_stories,
    'hasMore', v_more,
    'rejections', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'category', category, 'createdAt', created_at,
        'reviewRequestedAt', review_requested_at, 'reviewResult', review_result, 'reviewedAt', reviewed_at) order by created_at desc)
      from (select * from companion.my_story_rejections where user_id = p_user order by created_at desc limit 50) t), '[]'::jsonb),
    'friendReplies', coalesce((
      select jsonb_agg(jsonb_build_object('storyId', t.story_id, 'characterId', t.character_id, 'free', t.free,
        'messageId', m.id, 'at', t.created_at) order by t.created_at desc)
      from (select * from companion.story_replies where user_id = p_user order by created_at desc limit 50) t
      left join companion.messages m on m.user_id = t.user_id and m.client_message_id = t.client_message_id), '[]'::jsonb),
    'pastOpens', coalesce((
      select jsonb_agg(jsonb_build_object('characterId', character_id, 'openedAt', opened_at, 'expiresAt', expires_at,
        'paidWith', paid_with, 'price', price) order by opened_at desc)
      from (select * from companion.past_story_opens where user_id = p_user order by opened_at desc limit 50) t), '[]'::jsonb)
  ) into v_result;

  perform ops.log(v_actor, 'view', 'user_stories', p_user, jsonb_strip_nulls(jsonb_build_object(
    'limit', p_limit, 'before', p_before)));
  return v_result;
end;
$$;

-- ------------------------------------------------------------------ 권한

revoke all on function companion.request_guardrail_rev() from public, anon, authenticated;
revoke all on function ops.moderation_scope(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function ops.check_moderation_filters(timestamptz, timestamptz, integer, text, text, text) from public, anon, authenticated;

revoke all on function public.ops_moderation_summary(text, timestamptz, timestamptz, text, text, text, text) from public, anon, authenticated;
grant execute on function public.ops_moderation_summary(text, timestamptz, timestamptz, text, text, text, text) to service_role;
revoke all on function public.ops_moderation_feed(text, timestamptz, timestamptz, text, text, text, text, text, text, text, text, uuid, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.ops_moderation_feed(text, timestamptz, timestamptz, text, text, text, text, text, text, text, text, uuid, integer, timestamptz) to service_role;
revoke all on function public.ops_review_moderation(text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.ops_review_moderation(text, uuid, text, text, text) to service_role;
revoke all on function public.ops_set_guardrail_rev(text, text, text, text) from public, anon, authenticated;
grant execute on function public.ops_set_guardrail_rev(text, text, text, text) to service_role;
revoke all on function public.ops_user_memories(text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.ops_user_memories(text, uuid, boolean) to service_role;
revoke all on function public.ops_user_stories(text, uuid, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.ops_user_stories(text, uuid, integer, timestamptz) to service_role;
