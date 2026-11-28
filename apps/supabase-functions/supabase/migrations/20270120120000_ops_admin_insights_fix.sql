-- 운영 도구 판정 현황 · 목록 고침(20270118 `ops_admin_insights` 위에 쌓는다). 20270119 뒤에 적용한다.
-- 바꾸는 것은 `ops.moderation_scope` · `ops_moderation_summary` · `ops_moderation_feed` 셋과 인덱스 하나다. 표 · 리비전 칸 기본값 · 다른 RPC는 그대로다.
--
-- 1. 제한 시간: 본문의 `set local statement_timeout`은 이미 시작한 호출에 걸리지 않는다(PostgREST 뒤에서 9.5초 걸리게 한 호출이 끝까지 돌았다).
--    함수 설정 `set statement_timeout = '8s'`로 옮긴다 — PostgREST가 함수 설정을 호출 전에 트랜잭션에 올려 그 호출에 건다(같은 호출이 8초에
--    57014로 끊긴다). 본문의 `set local`은 뺀다 — 듣지 않으면서 같은 트랜잭션의 다음 문에만 걸렸다.
-- 2. 그 턴의 답 찾기: 판정마다 그 메시지 뒤의 대화 전부를 읽던 것을 **뒤 30분 창**으로 끊는다(`messages_conversation_idx`). 답은 턴을 처리한
--    요청 안에서 저장되므로 보통 턴에서는 같은 답이다. 그리고 필요한 판정만 턴을 읽는다 — 목록은 목록에 나올 수 있는 판정(allow가 아닌 것 ·
--    기록용 허용)만, 현황은 연령대 · 선 · 캐릭터로 거를 때만 전부(아니면 기록용 허용만).
-- 3. 리비전 없는 줄: 현황에 `unrevisioned {events, blocks, reviewed, falsePositives}`, 목록의 `p_rev = 'none'`.
-- 4. 현황 `revs`: `firstAt` · `lastAt`은 그 리비전을 처음 · 마지막 본 때(기간 · 거르기와 상관없이 전체) — 기간으로 자르면 기간 첫날에 가짜 「바뀐 날」이 생긴다.
--    수(`events` · `blocks` · `reviewed` · `falsePositives`)는 기간 + 모든 거르기(단계 포함)를 따른다 — 분류 × 단계 칸과 같은 기준.
--    기간 안에 보인 리비전은 거르기에 맞는 줄이 없어도 0으로 나온다. 순서는 그대로(처음 본 때 이른 순).
-- 5. 목록 `previous`: 입력 검사가 실제로 맥락으로 받은 것만 — 완료 · 숨기지 않음 · 조각 있음.
--
-- 다시 적용해도 같은 결과다. 20270118을 이 파일 뒤에 다시 적용하면 옛 판으로 돌아가니 그때는 이 파일도 다시 적용한다.

-- ------------------------------------------------------------------ 인덱스

-- 리비전을 처음 · 마지막 본 때(4). 리비전 없는 옛 줄은 넣지 않아 지금은 거의 비어 있다. 표를 다시 쓰지 않는다.
create index if not exists moderation_events_rev_idx on companion.moderation_events (rev, created_at) where rev is not null;

-- ------------------------------------------------------------------ 내부 도우미

-- 판정 한 줄의 차원(20270118 판과 같은 칸). 인수 둘이 늘어 옛 꼴을 지운다 — 남겨 두면 옛 RPC가 느린 판을 계속 쓴다.
--   · p_listed: 목록에 나올 수 있는 판정만(allow가 아닌 것 · 기록용 허용).
--   · p_turn: 모든 판정의 턴(메시지 · 대화 · 답)을 읽는다. 아니면 기록용 허용만 읽고 나머지는 턴 칸이 null이다.
-- 답은 판정이 답에 달려 있으면 그 답, 사용자 메시지에 달려 있으면 같은 대화에서 그 메시지 뒤 30분 안의 `reply_to`가 그 메시지인 답 중 가장 늦은 것.
drop function if exists ops.moderation_scope(timestamptz, timestamptz);
create or replace function ops.moderation_scope(p_from timestamptz, p_to timestamptz, p_listed boolean, p_turn boolean)
returns table (
  id uuid, at timestamptz, user_id uuid, stage text, category text, action text, rev text,
  user_message_id uuid, reply_id uuid, conversation_id uuid, character_id text, age_band text, romance_line text
)
language sql
stable
set search_path = ''
as $$
  select e.id, e.created_at, e.user_id, e.layer, e.category, e.action, e.rev,
    t.user_message_id, t.reply_id, t.conversation_id, t.character_id, t.age_band, t.romance_line
  from companion.moderation_events e
  left join lateral (
    select case when m.role = 'assistant' then m.reply_to else m.id end as user_message_id,
      a.id as reply_id, m.conversation_id, c.character_id, a.meta->>'ageBand' as age_band, a.meta->>'romanceLine' as romance_line
    from companion.messages m
    left join companion.conversations c on c.id = m.conversation_id
    left join lateral (
      select x.id, x.meta from (
        select y.id, y.meta, y.created_at from companion.messages y
        where m.role = 'assistant' and y.id = m.id
        union all
        select y.id, y.meta, y.created_at from companion.messages y
        where m.role = 'user' and y.conversation_id = m.conversation_id and y.created_at >= m.created_at
          and y.created_at < m.created_at + interval '30 minutes' and y.reply_to = m.id and y.role = 'assistant'
      ) x
      order by x.created_at desc
      limit 1
    ) a on true
    where m.id = e.message_id and (p_turn or (e.action = 'allow' and e.category in ('romance', 'sexual')))
    offset 0
  ) t on true
  where e.created_at >= p_from and e.created_at < p_to
    and (not p_listed or e.action <> 'allow' or e.category in ('romance', 'sexual'))
$$;

-- ------------------------------------------------------------------ RPC — 판정

-- 판정 현황. `cells` · `daily`는 allow가 아닌 판정, `tracked`는 기록용 허용(romance · sexual), `per1k`는 같은 거르기의 입력 검사 1천 건당.
-- 20270118 판에서 바꾼 것: 제한 시간을 함수 설정으로 · `revs`의 처음/마지막 본 때는 전체, 수는 단계 거르기도 따름 · `unrevisioned`.
create or replace function public.ops_moderation_summary(
  p_actor text, p_from timestamptz, p_to timestamptz,
  p_stage text default null, p_age text default null, p_line text default null, p_character text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '8s'
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_result jsonb;
begin
  perform ops.check_moderation_filters(p_from, p_to, 90, p_stage, p_age, p_line);

  -- period = 기간의 판정 전부(리비전 나열은 거르기와 상관없다), scope = 연령대 · 선 · 캐릭터 거르기에 맞는 것(20270118 판의 scope).
  with period as materialized (
    select s.*,
      (p_age is null or s.age_band = p_age) and (p_line is null or s.romance_line = p_line)
        and (p_character is null or s.character_id = p_character) as turn_ok,
      (p_stage is null or s.stage = p_stage) as stage_ok
    from ops.moderation_scope(p_from, p_to, false, p_age is not null or p_line is not null or p_character is not null) s
  ),
  scope as (select * from period where turn_ok),
  totals as (select count(*) filter (where stage = 'input') inputs from scope)
  select jsonb_build_object(
    'inputs', (select inputs from totals),
    'cells', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'stage', stage, 'blocks', n,
        'per1k', case when tt.inputs > 0 then round(n * 1000.0 / tt.inputs, 2) end) order by n desc, category, stage)
      from (select category, stage, count(*) n from scope
        where action <> 'allow' and stage_ok group by 1, 2) t cross join totals tt), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', on_day, 'category', category, 'blocks', n) order by on_day, category)
      from (select (at at time zone 'Asia/Seoul')::date on_day, category, count(*) n from scope
        where action <> 'allow' and stage_ok group by 1, 2) t), '[]'::jsonb),
    'tracked', coalesce((
      select jsonb_agg(jsonb_build_object('line', romance_line, 'characterId', character_id, 'category', category, 'count', n)
        order by n desc)
      from (select romance_line, character_id, category, count(*) n from scope
        where action = 'allow' and category in ('romance', 'sexual') and stage_ok
        group by 1, 2, 3) t), '[]'::jsonb),
    'revs', coalesce((
      select jsonb_agg(jsonb_build_object('rev', t.rev, 'label', g.label, 'note', g.note, 'firstAt', seen.first_at,
        'lastAt', seen.last_at, 'events', t.events, 'blocks', t.blocks, 'reviewed', t.reviewed,
        'falsePositives', t.false_positives) order by seen.first_at, t.rev)
      from (
        select p.rev, count(*) filter (where p.turn_ok and p.stage_ok) events,
          count(*) filter (where p.turn_ok and p.stage_ok and p.action <> 'allow') blocks,
          count(r.event_id) filter (where p.turn_ok and p.stage_ok) reviewed,
          count(*) filter (where p.turn_ok and p.stage_ok and r.verdict = 'false_positive') false_positives
        from period p left join ops.moderation_reviews r on r.event_id = p.id
        where p.rev is not null group by p.rev
      ) t
      cross join lateral (
        select min(e.created_at) first_at, max(e.created_at) last_at from companion.moderation_events e where e.rev = t.rev
      ) seen
      left join ops.guardrail_revs g on g.rev = t.rev), '[]'::jsonb),
    'unrevisioned', (
      select jsonb_build_object('events', count(*), 'blocks', count(*) filter (where sc.action <> 'allow'),
        'reviewed', count(r.event_id), 'falsePositives', count(*) filter (where r.verdict = 'false_positive'))
      from scope sc left join ops.moderation_reviews r on r.event_id = sc.id
      where sc.rev is null and sc.stage_ok),
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
-- 20270118 판에서 바꾼 것: 제한 시간을 함수 설정으로 · `p_rev = 'none'`(리비전 없는 줄) · `previous`는 입력 검사가 실제로 받은 맥락만 ·
-- 목록에 나올 수 있는 판정만 턴을 읽는다. 인수 · 반환의 키는 그대로다.
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
set statement_timeout = '8s'
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
  if p_rev is not null and p_rev <> 'none' and p_rev !~ '^[0-9a-f]{8}$' then
    raise exception 'invalid_rev' using errcode = '22023';
  end if;
  if p_limit is null or p_limit not between 1 and 200 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  with scope as materialized (
    select s.*, r.verdict, r.expected_category, r.note, r.actor reviewer, r.at reviewed_at
    from ops.moderation_scope(p_from, least(p_to, coalesce(p_before, p_to)), true, true) s
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
      and (p_rev is null or (p_rev = 'none' and s.rev is null) or s.rev = p_rev)
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
  -- 앞 말 = 입력 검사가 맥락으로 받은 것: 턴이 모델에 주는 지난 대화(`companion_begin_turn`의 history — 완료 · 숨기지 않음)의 마지막 캐릭터 답이고
  -- 조각이 있는 것(`chat-send`의 `historyFrom`이 빈 답을 뺀다). 숨긴 답 · 위기 답은 맥락이 아니었다.
  left join lateral (
    select x.id, x.segments, x.created_at from companion.messages x
    where x.conversation_id = um.conversation_id and x.created_at < um.created_at and x.role = 'assistant'
      and x.status = 'complete' and not x.hidden and jsonb_array_length(x.segments) > 0
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

-- ------------------------------------------------------------------ 권한

revoke all on function ops.moderation_scope(timestamptz, timestamptz, boolean, boolean) from public, anon, authenticated;

revoke all on function public.ops_moderation_summary(text, timestamptz, timestamptz, text, text, text, text) from public, anon, authenticated;
grant execute on function public.ops_moderation_summary(text, timestamptz, timestamptz, text, text, text, text) to service_role;
revoke all on function public.ops_moderation_feed(text, timestamptz, timestamptz, text, text, text, text, text, text, text, text, uuid, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.ops_moderation_feed(text, timestamptz, timestamptz, text, text, text, text, text, text, text, text, uuid, integer, timestamptz) to service_role;
