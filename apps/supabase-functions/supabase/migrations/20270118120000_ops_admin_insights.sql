-- 운영 도구 판정 · 기억 · 스토리 조회 1차(ops-dashboard `docs/admin-insights.md` · `docs/admin-contract.md` §G-A).
-- 20261212(ops 스키마 · `ops.actor` · `ops.log` · `ops.user_exists`) · 20261213(`ops.user_row`) 뒤에 적용한다. 공통 규칙(`p_actor` ·
-- 열람/쓰기 기록 · `service_role`만)은 20261212 그대로다.
--
-- 1. 리비전: `companion.moderation_events.rev` — 그 판정이 나온 검사 지시문의 해시 8자리(`chat-send`가 싣는다, ADR-0203 개정 ⟨리비전⟩).
--    옛 줄은 null. 판정을 표에 넣는 함수는 턴 저장 `companion_finish_turn` 하나뿐이다 — 첫 인사 · 선톡 · 이야기 초안의 검사는
--    판정 줄을 남기지 않는다(20261109부터 그대로). `p_moderation` 원소의 `rev`를 그대로 넣고, 없으면 null이다.
--    · 순서: 이 파일을 먼저 올려도(옛 `chat-send`는 `rev`를 보내지 않는다 → null), 함수를 먼저 올려도(옛 저장 함수는 모르는 칸을 버린다) 턴은 저장된다.
-- 2. 표(`ops`, RPC로만): `ops.guardrail_revs`(리비전에 사람이 붙인 이름 · 메모) · `ops.moderation_reviews`(판정 하나에 검토 하나).
-- 3. RPC 여섯: `ops_moderation_summary`(분류 × 단계 · 일별 · 기록용 허용 · 리비전 · 스트라이크) · `ops_moderation_feed`(판정 목록 — 앞 캐릭터 말 ·
--    학습자 메시지 · 그 뒤 답) · `ops_review_moderation` · `ops_set_guardrail_rev` · `ops_user_memories`(전체 기억 + 출처 메시지) ·
--    `ops_user_stories`(내 스토리 · 반응 · 거절 · 친구 스토리 답장 · 지난 스토리 열람).
--    · 연령대 · 로맨스 선은 판정 줄에 없다 — 그 턴의 캐릭터 답 `meta.ageBand` · `meta.romanceLine`에서 읽는다. 답이 없는 턴(실패)은 null이고
--      연령대 · 선으로 거르면 빠진다.
--    · 그 턴의 답은 대화 인덱스(`messages_conversation_idx`)로 찾는다: 같은 대화에서 그 메시지 뒤 30분 안의 답 중 가장 늦은 것.
--      답은 턴을 처리한 요청 안에서 저장되므로 그 창을 넘지 않는다(`reply_to`에는 인덱스가 없다).
--    · 제한 시간: 함수마다 `statement_timeout = '5s'`를 건다. 본문의 `set local`은 이미 시작한 호출에 걸리지 않는다 — PostgREST가 함수 설정을
--      호출 전에 트랜잭션에 올려 준다.
--
-- 다시 적용해도 같은 결과다.

-- ------------------------------------------------------------------ 리비전 칸

alter table companion.moderation_events
  add column if not exists rev text check (rev ~ '^[0-9a-f]{8}$');
-- 리비전마다 처음 · 마지막 본 때를 센다. 옛 줄(null)은 넣지 않아 만들 때 비어 있다.
create index if not exists moderation_events_rev_idx on companion.moderation_events (rev, created_at) where rev is not null;

-- ------------------------------------------------------------------ 턴 끝 — 판정에 리비전

-- 20261204 판에서 판정을 넣는 한 곳만 바꿨다(인수 꼴 그대로 — 권한도 그대로다).
create or replace function public.companion_finish_turn(
  p_user_message_id uuid,
  p_status text,
  p_assistant jsonb,
  p_moderation jsonb,
  p_notices text[],
  p_now timestamptz,
  p_feedback jsonb,
  p_intimacy_delta integer,
  p_topic_state jsonb,
  p_hold_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  v_user companion.messages;
  v_character text;
  v_day date := (p_now at time zone 'utc')::date;
  v_usage companion.usage_daily;
  v_gap_seconds integer;
  v_rel companion.relationships;
  v_max text;
  v_next text;
  v_changed boolean := false;
  v_spent integer := 0;
  v_state companion.moderation_state;
  v_charge boolean := false;
begin
  if p_status not in ('complete', 'blocked', 'crisis', 'failed') then
    raise exception 'invalid turn status' using errcode = '22023';
  end if;
  select * into s from companion.settings;
  update companion.messages set status = p_status
  where id = p_user_message_id and role = 'user'
  returning * into v_user;
  if not found then
    raise exception 'turn not found' using errcode = 'P0002';
  end if;
  select character_id into v_character from companion.conversations where id = v_user.conversation_id;

  insert into companion.messages (conversation_id, user_id, role, origin, status, notice_kind, reply_to, created_at)
  select v_user.conversation_id, v_user.user_id, 'notice', 'turn', 'complete', kind, v_user.id, clock_timestamp()
  from unnest(coalesce(p_notices, array[]::text[])) as kind;

  if p_assistant is not null then
    insert into companion.messages (id, conversation_id, user_id, role, origin, status, segments, meta, reply_to, credits_spent, created_at)
    values (
      (p_assistant->>'id')::uuid, v_user.conversation_id, v_user.user_id, 'assistant',
      coalesce(p_assistant->>'origin', 'turn'), case when p_status = 'crisis' then 'crisis' else 'complete' end,
      coalesce(p_assistant->'segments', '[]'::jsonb), coalesce(p_assistant->'meta', '{}'::jsonb),
      v_user.id, 0, clock_timestamp()
    );
  end if;

  -- 피드백 카드(20261116): 카드 전체를 `card`에, 찾아보기 쉬운 칸(status · kind · items · better)은 옛 열에도.
  if p_status = 'complete' and p_feedback is not null then
    insert into companion.corrections (message_id, status, kind, items, better, l1_to_ko, card)
    values (
      v_user.id, p_feedback->>'status', nullif(p_feedback->>'kind', ''),
      case when jsonb_typeof(p_feedback->'items') = 'array' then p_feedback->'items' end,
      case when jsonb_typeof(p_feedback->'better') = 'object' then p_feedback->'better' end,
      null,
      p_feedback - 'userMessageId'
    )
    on conflict (message_id) do nothing;
  end if;

  -- 리비전(20270118): 원소의 `rev`를 그대로 넣는다. 없거나(옛 `chat-send`) 16진수 8자리가 아니면 null — 표시 하나 때문에 턴 저장이 실패하지 않게.
  insert into companion.moderation_events (user_id, message_id, layer, category, action, rev)
  select v_user.user_id, v_user.id, r.layer, r.category, r.action, case when r.rev ~ '^[0-9a-f]{8}$' then r.rev end
  from jsonb_to_recordset(coalesce(p_moderation, '[]'::jsonb)) as r(layer text, category text, action text, rev text);

  -- 반복 위반: 입력 검사 차단만 센다(캐릭터 답이 걸린 것은 유저 탓이 아니다). 일시 차단은 없다 — 창 안에서 계속 세고,
  -- 상한(`strike_limit`)을 넘은 위반에 캐릭터가 거절 답(경고)을 보냈으면 그 턴의 예약을 확정한다(아래 예약).
  if p_status = 'blocked' and exists (
    select 1 from jsonb_to_recordset(coalesce(p_moderation, '[]'::jsonb)) as r(layer text, action text)
    where r.layer = 'input' and r.action = 'block'
  ) then
    insert into companion.moderation_state (user_id) values (v_user.user_id) on conflict do nothing;
    select * into v_state from companion.moderation_state where user_id = v_user.user_id for update;
    if v_state.window_started_at is null or v_state.window_started_at < p_now - s.strike_window then
      v_state.strikes := 0;
      v_state.window_started_at := p_now;
    end if;
    v_state.strikes := v_state.strikes + 1;
    update companion.moderation_state set strikes = v_state.strikes, window_started_at = v_state.window_started_at
    where user_id = v_user.user_id;
    v_charge := v_state.strikes > s.strike_limit and p_assistant is not null;
  end if;

  if p_notices is not null and cardinality(p_notices) > 0 then
    insert into companion.notice_state (user_id) values (v_user.user_id) on conflict do nothing;
    update companion.notice_state set
      last_ai_disclosure_at = case when 'ai_disclosure' = any (p_notices) then p_now else last_ai_disclosure_at end,
      last_break_reminder_at = case when 'break_reminder' = any (p_notices) then p_now else last_break_reminder_at end,
      minor_notice_at = case when 'minor_notice' = any (p_notices) then p_now else minor_notice_at end
    where user_id = v_user.user_id;
  end if;

  -- 친밀도 → 말투 단계. 정상 턴에서만, 올라가기만(O13 제안), 페르소나의 maxSpeechLevel까지.
  select * into v_rel from companion.relationships where user_id = v_user.user_id and character_id = v_character for update;
  if p_status = 'complete' and v_rel.user_id is not null then
    v_rel.intimacy := greatest(0, v_rel.intimacy + least(greatest(coalesce(p_intimacy_delta, 0), s.intimacy_delta_min), s.intimacy_delta_max));
    v_next := case when v_rel.intimacy >= s.speech_slang_at then 'slang' when v_rel.intimacy >= s.speech_casual_at then 'casual' else 'polite' end;
    select coalesce(persona->>'maxSpeechLevel', 'slang') into v_max from companion.characters where id = v_character;
    if companion.speech_rank(v_next) > companion.speech_rank(v_max) then
      v_next := v_max;
    end if;
    if companion.speech_rank(v_next) > companion.speech_rank(v_rel.speech_level) then
      v_changed := true;
      v_rel.speech_level := v_next;
    end if;
    update companion.relationships set intimacy = v_rel.intimacy, speech_level = v_rel.speech_level, updated_at = now()
    where user_id = v_user.user_id and character_id = v_character;
  end if;

  if p_status = 'complete' and p_topic_state is not null and jsonb_typeof(p_topic_state) = 'object' then
    update companion.conversations set topic_state = p_topic_state where id = v_user.conversation_id;
  end if;

  -- 예약: 답이 간 턴과 상한을 넘은 거절 턴(경고)은 확정, 나머지(회피 · 위기 · 실패)는 해제.
  if p_hold_id is not null then
    if p_status = 'complete' or v_charge then
      perform companion.settle_hold(p_hold_id);
      select amount into v_spent from companion.credit_holds where id = p_hold_id;
      if p_assistant is not null then
        update companion.messages set credits_spent = coalesce(v_spent, 0) where id = (p_assistant->>'id')::uuid;
      end if;
    else
      perform companion.release_hold(p_hold_id);
    end if;
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

  return jsonb_build_object(
    'speechLevel', coalesce(v_rel.speech_level, 'polite'),
    'speechLevelChanged', v_changed,
    'creditsSpent', coalesce(v_spent, 0),
    'balance', (select sub_balance + grant_balance + paid_balance from companion.credit_wallets where user_id = v_user.user_id)
  );
end;
$$;

-- ------------------------------------------------------------------ 표

-- 리비전에 사람이 붙인 이름(「ADR-0203」) · 메모. 처음 · 마지막 본 때는 두지 않는다 — `moderation_events`에서 센다.
create table if not exists ops.guardrail_revs (
  rev text primary key check (rev ~ '^[0-9a-f]{8}$'),
  label text check (char_length(label) between 1 and 80),
  note text check (char_length(note) <= 500),
  updated_by text not null check (char_length(updated_by) between 1 and 200),
  updated_at timestamptz not null default now()
);

-- 판정 하나에 검토 하나. 다시 고르면 덮는다(이력은 `ops.audit_log`). 판정이 지워지면(대화 비우기 · 탈퇴) 같이 지워진다.
create table if not exists ops.moderation_reviews (
  event_id uuid primary key references companion.moderation_events (id) on delete cascade,
  verdict text not null check (verdict in ('correct', 'false_positive', 'missed', 'unsure')),
  expected_category text check (char_length(expected_category) between 1 and 64),
  note text check (char_length(note) <= 200),
  actor text not null check (char_length(actor) between 1 and 200),
  at timestamptz not null default now()
);

alter table ops.guardrail_revs enable row level security;
alter table ops.moderation_reviews enable row level security;
revoke all on table ops.guardrail_revs, ops.moderation_reviews from public, anon, authenticated, service_role;

-- ------------------------------------------------------------------ 내부 도우미 (ops 스키마, 노출 안 됨)

create or replace function ops.check_range(p_from timestamptz, p_to timestamptz, p_max interval)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > p_max then
    raise exception 'invalid_range' using errcode = '22023';
  end if;
end;
$$;

create or replace function ops.review_json(p_review ops.moderation_reviews)
returns jsonb language sql immutable set search_path = '' as $$
  select case when p_review.event_id is not null then jsonb_build_object(
    'verdict', p_review.verdict, 'expectedCategory', p_review.expected_category, 'note', p_review.note,
    'actor', p_review.actor, 'at', p_review.at) end
$$;

revoke all on all functions in schema ops from public, anon, authenticated;

-- ------------------------------------------------------------------ 읽기 RPC (service_role, 열람 기록)

-- 판정 현황. 기간은 [p_from, p_to), 90일까지. daily의 날은 한국 시각(Asia/Seoul) 날짜다 — 운영 도구가 기간 · 날을 한국 날짜로 읽고 보인다.
--   · inputs = 같은 거르기(연령대 · 선 · 캐릭터)의 입력 검사 수 — 단계 거르기와 상관없이 센다(`per1k`의 분모).
--   · cells · daily의 blocks = allow가 아닌 판정(block · crisis · hide). 판정 목록의 기본 거르기와 같아 칸의 수와 목록의 줄 수가 맞는다.
--   · tracked = 허용했지만 기록하는 로맨스 · 성적 긴장(allow + romance · sexual, ADR-0168 D3).
--   · revs = 기간 안에 보인 리비전(거르기와 상관없이 나열 — 일별 그래프의 세로선). 처음 · 마지막 본 때는 기간 밖까지 센 값,
--     나머지 수는 기간 · 거르기 안. 리비전이 없는 옛 줄은 `unrevisioned`에 따로 센다.
--   · strikes = 지금 창 안 스트라이크가 상한 − 1 이상인 사용자(많은 순 50명). 기간 · 거르기와 상관없다.
create or replace function public.ops_moderation_summary(
  p_actor text, p_from timestamptz, p_to timestamptz,
  p_stage text default null, p_age text default null, p_line text default null, p_character text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_stage text := nullif(btrim(p_stage), '');
  v_age text := nullif(btrim(p_age), '');
  v_line text := nullif(btrim(p_line), '');
  v_character text := nullif(btrim(p_character), '');
  -- 턴(대화 · 답 meta)을 읽어야 하는 거르기가 있는가. 없으면 기록용 허용 줄만 턴을 읽는다 — 기간의 판정 전부에 답을 찾지 않게.
  v_turn boolean;
  v_result jsonb;
begin
  perform ops.check_range(p_from, p_to, interval '90 days');
  if v_stage is not null and v_stage not in ('input', 'output_sync', 'output_async') then
    raise exception 'invalid_stage' using errcode = '22023';
  end if;
  v_turn := v_age is not null or v_line is not null or v_character is not null;

  with base as materialized (
    select e.id, e.layer, e.category, e.action, e.rev, e.created_at, t.character_id, t.romance_line,
      (v_age is null or t.age_band = v_age) and (v_line is null or t.romance_line = v_line)
        and (v_character is null or t.character_id = v_character) as turn_ok,
      (v_stage is null or e.layer = v_stage) as stage_ok
    from companion.moderation_events e
    left join lateral (
      select c.character_id, am.meta->>'ageBand' as age_band, am.meta->>'romanceLine' as romance_line
      from companion.messages m
      join companion.conversations c on c.id = m.conversation_id
      left join lateral (
        select x.meta from (
          select a.meta, a.created_at from companion.messages a where m.role = 'assistant' and a.id = m.id
          union all
          select a.meta, a.created_at from companion.messages a
          where m.role = 'user' and a.conversation_id = m.conversation_id and a.reply_to = m.id and a.role = 'assistant'
            and a.created_at >= m.created_at and a.created_at < m.created_at + interval '30 minutes'
        ) x
        where v_age is not null or v_line is not null or (e.action = 'allow' and e.category in ('romance', 'sexual'))
        order by x.created_at desc
        limit 1
      ) am on true
      where m.id = e.message_id and (v_turn or (e.action = 'allow' and e.category in ('romance', 'sexual')))
      offset 0
    ) t on true
    where e.created_at >= p_from and e.created_at < p_to
  ),
  hit as (select * from base where turn_ok and stage_ok),
  inputs as (select count(*) as n from base where turn_ok and layer = 'input')
  select jsonb_build_object(
    'inputs', (select n from inputs),
    'cells', coalesce((
      select jsonb_agg(jsonb_build_object('category', x.category, 'stage', x.layer, 'blocks', x.blocks,
        'per1k', case when i.n > 0 then round(x.blocks * 1000.0 / i.n, 2) end) order by x.blocks desc, x.category, x.layer)
      from (select category, layer, count(*) as blocks from hit where action <> 'allow' group by category, layer) x, inputs i
    ), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', x.day, 'category', x.category, 'blocks', x.blocks) order by x.day, x.category)
      from (
        select (created_at at time zone 'Asia/Seoul')::date as day, category, count(*) as blocks
        from hit where action <> 'allow' group by 1, category
      ) x
    ), '[]'::jsonb),
    'tracked', coalesce((
      select jsonb_agg(jsonb_build_object('line', x.romance_line, 'characterId', x.character_id, 'category', x.category, 'count', x.n)
        order by x.n desc, x.romance_line, x.character_id, x.category)
      from (
        select romance_line, character_id, category, count(*) as n
        from hit where action = 'allow' and category in ('romance', 'sexual') group by romance_line, character_id, category
      ) x
    ), '[]'::jsonb),
    'revs', coalesce((
      select jsonb_agg(jsonb_build_object('rev', x.rev, 'label', g.label, 'note', g.note, 'firstAt', s.first_at, 'lastAt', s.last_at,
        'events', x.events, 'blocks', x.blocks, 'reviewed', x.reviewed, 'falsePositives', x.false_positives)
        order by s.first_at desc, x.rev)
      from (
        select b.rev,
          count(*) filter (where b.turn_ok and b.stage_ok) as events,
          count(*) filter (where b.turn_ok and b.stage_ok and b.action <> 'allow') as blocks,
          count(r.event_id) filter (where b.turn_ok and b.stage_ok) as reviewed,
          count(*) filter (where b.turn_ok and b.stage_ok and r.verdict = 'false_positive') as false_positives
        from base b left join ops.moderation_reviews r on r.event_id = b.id
        where b.rev is not null group by b.rev
      ) x
      left join ops.guardrail_revs g on g.rev = x.rev
      cross join lateral (
        select min(e.created_at) as first_at, max(e.created_at) as last_at from companion.moderation_events e where e.rev = x.rev
      ) s
    ), '[]'::jsonb),
    'unrevisioned', (
      select jsonb_build_object('events', count(*), 'blocks', count(*) filter (where b.action <> 'allow'),
        'reviewed', count(r.event_id), 'falsePositives', count(*) filter (where r.verdict = 'false_positive'))
      from hit b left join ops.moderation_reviews r on r.event_id = b.id
      where b.rev is null
    ),
    'strikes', coalesce((
      select jsonb_agg(jsonb_build_object('user', ops.user_row(x.user_id), 'strikes', x.strikes, 'windowStartedAt', x.window_started_at)
        order by x.strikes desc, x.window_started_at desc, x.user_id)
      from (
        select ms.user_id, ms.strikes, ms.window_started_at
        from companion.moderation_state ms cross join companion.settings s
        where ms.strikes > 0 and ms.strikes >= s.strike_limit - 1 and ms.window_started_at >= now() - s.strike_window
        order by ms.strikes desc, ms.window_started_at desc, ms.user_id
        limit 50
      ) x
    ), '[]'::jsonb)
  ) into v_result;

  perform ops.log(v_actor, 'view', 'moderation_summary', null, jsonb_strip_nulls(jsonb_build_object(
    'from', p_from, 'to', p_to, 'stage', v_stage, 'age', v_age, 'line', v_line, 'character', v_character)));
  return v_result;
end;
$$;

-- 판정 목록 한 쪽. 기간은 [p_from, p_to), 90일까지. items 최신순, hasMore = 이 쪽보다 옛 판정이 기간 안에 더 있다.
--   · p_action: null이면 allow가 아닌 것(block · crisis · hide), `tracked`면 기록용 허용(allow + romance · sexual). 그냥 허용(safe)은 목록에 없다.
--   · p_rev: 8자리면 그 리비전, `none`이면 리비전이 없는 옛 줄. p_review: `none`이면 검토 안 한 것, 아니면 그 검토.
--   · previous = 같은 대화에서 그 사용자 메시지 바로 앞의 캐릭터 답(완료 · 숨기지 않음 · 조각 있음) — 입력 검사가 맥락으로 받는 것과
--     같은 조건이다(`companion_begin_turn`의 history). 그 뒤 답이 숨겨지거나 지워졌으면 그때와 다를 수 있다.
--   · message · reply를 찾는 규칙은 20261215 `ops_user_moderation`과 같다. strikes는 지금 값이다(판정 줄에 그때 값이 없다).
--   · 한 턴의 판정은 같은 시각에 들어간다 — 쪽 끝 시각과 같은 판정은 다 넣는다(그래서 limit보다 많을 수 있다).
create or replace function public.ops_moderation_feed(
  p_actor text, p_from timestamptz, p_to timestamptz,
  p_category text default null, p_stage text default null, p_action text default null,
  p_character text default null, p_age text default null, p_line text default null,
  p_rev text default null, p_review text default null, p_user uuid default null,
  p_limit integer default 50, p_before timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_category text := nullif(btrim(p_category), '');
  v_stage text := nullif(btrim(p_stage), '');
  v_action text := nullif(btrim(p_action), '');
  v_character text := nullif(btrim(p_character), '');
  v_age text := nullif(btrim(p_age), '');
  v_line text := nullif(btrim(p_line), '');
  v_rev text := nullif(btrim(p_rev), '');
  v_review text := nullif(btrim(p_review), '');
  v_upper timestamptz;
  v_ids uuid[];
  v_more boolean;
  v_items jsonb;
begin
  perform ops.check_range(p_from, p_to, interval '90 days');
  if v_stage is not null and v_stage not in ('input', 'output_sync', 'output_async') then
    raise exception 'invalid_stage' using errcode = '22023';
  end if;
  if v_action is not null and v_action not in ('block', 'crisis', 'hide', 'tracked') then
    raise exception 'invalid_action' using errcode = '22023';
  end if;
  if v_rev is not null and v_rev <> 'none' and v_rev !~ '^[0-9a-f]{8}$' then
    raise exception 'invalid_rev' using errcode = '22023';
  end if;
  if v_review is not null and v_review not in ('none', 'correct', 'false_positive', 'missed', 'unsure') then
    raise exception 'invalid_review' using errcode = '22023';
  end if;
  if p_limit is null or p_limit not between 1 and 200 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;
  if p_user is not null and not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  v_upper := least(p_to, coalesce(p_before, p_to));

  -- 거르기에 맞는 판정(id · 시각만). 대화 · 답은 캐릭터 · 연령대 · 선으로 거를 때만 읽는다.
  with f as materialized (
    select e.id, e.created_at
    from companion.moderation_events e
    left join ops.moderation_reviews r on r.event_id = e.id
    left join lateral (
      select c.character_id, am.meta->>'ageBand' as age_band, am.meta->>'romanceLine' as romance_line
      from companion.messages m
      join companion.conversations c on c.id = m.conversation_id
      left join lateral (
        select x.meta from (
          select a.meta, a.created_at from companion.messages a where m.role = 'assistant' and a.id = m.id
          union all
          select a.meta, a.created_at from companion.messages a
          where m.role = 'user' and a.conversation_id = m.conversation_id and a.reply_to = m.id and a.role = 'assistant'
            and a.created_at >= m.created_at and a.created_at < m.created_at + interval '30 minutes'
        ) x
        where v_age is not null or v_line is not null
        order by x.created_at desc
        limit 1
      ) am on true
      where m.id = e.message_id and (v_character is not null or v_age is not null or v_line is not null)
      offset 0
    ) t on true
    where e.created_at >= p_from and e.created_at < v_upper
      and case
        when v_action is null then e.action <> 'allow'
        when v_action = 'tracked' then e.action = 'allow' and e.category in ('romance', 'sexual')
        else e.action = v_action end
      and (v_category is null or e.category = v_category)
      and (v_stage is null or e.layer = v_stage)
      and (v_rev is null or (v_rev = 'none' and e.rev is null) or e.rev = v_rev)
      and (p_user is null or e.user_id = p_user)
      and (v_review is null or (v_review = 'none' and r.event_id is null) or r.verdict = v_review)
      and (v_character is null or t.character_id = v_character)
      and (v_age is null or t.age_band = v_age)
      and (v_line is null or t.romance_line = v_line)
  ),
  -- 쪽 끝 시각. 이 시각까지(같은 시각 포함) 넣는다.
  cut as (select min(x.created_at) as at from (select created_at from f order by created_at desc limit p_limit) x)
  select coalesce(array(select f.id from f, cut where f.created_at >= cut.at), '{}'::uuid[]),
    exists (select 1 from f, cut where f.created_at < cut.at)
  into v_ids, v_more;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'at', e.created_at, 'stage', e.layer, 'category', e.category, 'action', e.action, 'rev', e.rev,
      'ageBand', am.meta->>'ageBand', 'romanceLine', am.meta->>'romanceLine', 'characterId', c.character_id,
      'user', jsonb_build_object('id', u.id, 'email', u.email, 'name', lp.name,
        'tester', coalesce(u.raw_app_meta_data->>'duru_tester' = 'true', false)),
      'previous', case when pm.id is not null then jsonb_build_object('id', pm.id, 'segments', pm.segments, 'at', pm.created_at) end,
      'message', case when um.id is not null then jsonb_build_object(
        'id', um.id, 'text', left(um.text, 2000), 'status', um.status, 'inputSource', um.meta->>'inputSource', 'at', um.created_at) end,
      'reply', case when am.id is not null then jsonb_build_object(
        'id', am.id, 'status', am.status, 'hidden', am.hidden, 'segments', am.segments,
        'refusal', case when am.meta ? 'refusalStage' then jsonb_build_object(
          'stage', am.meta->>'refusalStage', 'category', am.meta->>'refusalCategory') end,
        'recovered', case when jsonb_typeof(am.meta->'guardrailRecovered') = 'object' then jsonb_build_object(
          'category', am.meta->'guardrailRecovered'->>'category', 'draft', am.meta->'guardrailRecovered'->>'draft') end,
        'at', am.created_at) end,
      'strikes', ms.strikes,
      'review', ops.review_json(r))
    order by e.created_at desc, e.id), '[]'::jsonb)
  into v_items
  from companion.moderation_events e
  join auth.users u on u.id = e.user_id
  left join public.learner_profiles lp on lp.user_id = e.user_id
  left join companion.moderation_state ms on ms.user_id = e.user_id
  left join ops.moderation_reviews r on r.event_id = e.id
  left join companion.messages m on m.id = e.message_id
  left join companion.conversations c on c.id = m.conversation_id
  left join companion.messages um on um.id = case when m.role = 'assistant' then m.reply_to else m.id end and um.role = 'user'
  left join lateral (
    select x.* from (
      select a.id, a.status, a.hidden, a.segments, a.meta, a.created_at
      from companion.messages a where m.role = 'assistant' and a.id = m.id
      union all
      select a.id, a.status, a.hidden, a.segments, a.meta, a.created_at
      from companion.messages a
      where m.role = 'user' and a.conversation_id = m.conversation_id and a.reply_to = m.id and a.role = 'assistant'
        and a.created_at >= m.created_at and a.created_at < m.created_at + interval '30 minutes'
    ) x
    order by x.created_at desc
    limit 1
  ) am on true
  left join lateral (
    select p.id, p.segments, p.created_at
    from companion.messages p
    where p.conversation_id = um.conversation_id and p.created_at < um.created_at
      and p.role = 'assistant' and p.status = 'complete' and not p.hidden and jsonb_array_length(p.segments) > 0
    order by p.created_at desc
    limit 1
  ) pm on true
  where e.id = any (v_ids);

  perform ops.log(v_actor, 'view', 'moderation_feed', p_user, jsonb_strip_nulls(jsonb_build_object(
    'from', p_from, 'to', p_to, 'category', v_category, 'stage', v_stage, 'action', v_action, 'character', v_character,
    'age', v_age, 'line', v_line, 'rev', v_rev, 'review', v_review, 'user', p_user, 'limit', p_limit, 'before', p_before)));
  return jsonb_build_object('items', v_items, 'hasMore', v_more);
end;
$$;

-- 한 사용자의 전체 기억(캐릭터를 고르지 않는다) + 캐릭터마다의 관계. 최신순, 지운 것은 `p_include_deleted`일 때만.
--   · characterId null = 모든 캐릭터가 읽던 공유 기억(20270114130000 전의 것). updatedAt은 고친 적이 없으면 null이다.
--   · source = 그 기억을 뽑은 묶음의 마지막 사용자 메시지(`source_message_id`) — 글 300자, 칩을 그대로 고른 말이면 inputSource `suggestion`.
--     대화를 비워 메시지가 없으면 null.
create or replace function public.ops_user_memories(p_actor text, p_user uuid, p_include_deleted boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_deleted boolean := coalesce(p_include_deleted, false);
  v_result jsonb;
begin
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  select jsonb_build_object(
    'memories', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', mm.id, 'characterId', mm.character_id, 'kind', mm.kind, 'text', mm.content,
          'createdAt', mm.created_at, 'updatedAt', mm.updated_at, 'deletedAt', mm.deleted_at, 'deletedReason', mm.deleted_reason,
          'source', case when src.id is not null then jsonb_build_object(
            'messageId', src.id, 'text', left(src.text, 300), 'inputSource', src.meta->>'inputSource', 'at', src.created_at) end)
        order by mm.created_at desc, mm.id)
      from companion.memories mm
      left join companion.messages src on src.id = mm.source_message_id and src.user_id = p_user
      where mm.user_id = p_user and (v_deleted or mm.deleted_at is null)
    ), '[]'::jsonb),
    'relationships', coalesce((
      select jsonb_agg(jsonb_build_object('characterId', character_id, 'intimacy', intimacy, 'speechLevel', speech_level)
        order by character_id)
      from companion.relationships where user_id = p_user
    ), '[]'::jsonb)
  ) into v_result;
  perform ops.log(v_actor, 'view', 'user_memories', p_user, jsonb_build_object('includeDeleted', v_deleted));
  return v_result;
end;
$$;

-- 한 사용자의 스토리. stories는 올린 때 최신순 한 쪽(hasMore는 이것 기준), 나머지 셋은 최근 50.
--   · status: 끝났으면(`expires_at` 지남) `expired`, 아니면 표의 값(checking · live). createdAt = 올린 때(`posted_at`).
--   · seen = 본 캐릭터 수, replies = 이 스토리를 인용해 보낸 답 수, quiz = 이 스토리로 낸 퀴즈(가장 늦은 것, result null = 아직 안 끝남).
--   · rejections에는 격리 파일 경로를 싣지 않는다 — 거절된 사진의 그림은 운영 도구에서 열지 않는다.
--   · friendReplies.messageId = 그 답을 보낸 내 메시지(`client_message_id`로 찾는다, 지워졌으면 null). pastOpens.price = 그때 낸 엽전(구독이면 0).
create or replace function public.ops_user_stories(
  p_actor text, p_user uuid, p_limit integer default 30, p_before timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_result jsonb;
begin
  if p_user is null or not ops.user_exists(p_user) then
    raise exception 'not_found';
  end if;
  if p_limit is null or p_limit not between 1 and 100 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  with page as materialized (
    select s.* from companion.my_stories s
    where s.user_id = p_user and (p_before is null or s.posted_at < p_before)
    order by s.posted_at desc, s.id
    limit p_limit + 1
  ),
  shown as (select * from page order by posted_at desc, id limit p_limit),
  quiz as materialized (
    select distinct on (q.story_id) q.story_id, q.word, q.result
    from companion.my_story_quizzes q
    where q.user_id = p_user and q.story_id is not null
    order by q.story_id, q.created_at desc
  )
  select jsonb_build_object(
    'stories', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', s.id, 'kind', s.kind, 'status', case when s.expires_at <= now() then 'expired' else s.status end,
          'createdAt', s.posted_at, 'expiresAt', s.expires_at, 'ko', s.ko, 'roman', s.roman, 'meaning', s.meaning,
          'lineOriginal', s.line_original, 'overlays', s.overlays, 'scene', s.scene, 'imagePath', s.image_path,
          'seen', (select count(*) from companion.my_story_seen x where x.story_id = s.id),
          'reactions', coalesce((
            select jsonb_agg(jsonb_build_object('characterId', r.character_id, 'rank', r.rank, 'angle', r.angle, 'status', r.status,
              'messageId', r.message_id, 'dueAt', r.due_at, 'doneAt', r.done_at) order by r.rank, r.character_id)
            from companion.my_story_reactions r where r.story_id = s.id
          ), '[]'::jsonb),
          'replies', (select count(*) from companion.my_story_replies x where x.user_id = p_user and x.my_story_id = s.id),
          'quiz', (select jsonb_build_object('word', q.word, 'result', q.result) from quiz q where q.story_id = s.id))
        order by s.posted_at desc, s.id)
      from shown s
    ), '[]'::jsonb),
    'rejections', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'category', x.category, 'createdAt', x.created_at,
        'reviewRequestedAt', x.review_requested_at, 'reviewResult', x.review_result, 'reviewedAt', x.reviewed_at)
        order by x.created_at desc, x.id)
      from (
        select * from companion.my_story_rejections where user_id = p_user order by created_at desc, id limit 50
      ) x
    ), '[]'::jsonb),
    'friendReplies', coalesce((
      select jsonb_agg(jsonb_build_object('storyId', x.story_id, 'characterId', x.character_id, 'free', x.free,
        'messageId', (select m.id from companion.messages m where m.user_id = p_user and m.client_message_id = x.client_message_id),
        'at', x.created_at) order by x.created_at desc, x.client_message_id)
      from (
        select * from companion.story_replies where user_id = p_user order by created_at desc, client_message_id limit 50
      ) x
    ), '[]'::jsonb),
    'pastOpens', coalesce((
      select jsonb_agg(jsonb_build_object('characterId', x.character_id, 'openedAt', x.opened_at, 'price', x.price)
        order by x.opened_at desc, x.id)
      from (
        select * from companion.past_story_opens where user_id = p_user order by opened_at desc, id limit 50
      ) x
    ), '[]'::jsonb),
    'hasMore', (select count(*) > p_limit from page)
  ) into v_result;

  perform ops.log(v_actor, 'view', 'user_stories', p_user, jsonb_strip_nulls(jsonb_build_object(
    'limit', p_limit, 'before', p_before)));
  return v_result;
end;
$$;

-- ------------------------------------------------------------------ 쓰기 RPC (service_role, 쓰기 기록)

-- 판정 검토. 판정 하나에 하나 — 다시 고르면 덮고, `p_verdict`가 비면 지운다. 어느 판정이든(허용 포함) 받는다.
-- 기록의 대상(`target_user`)은 비운다 — 사용자에게 한 조작이 아니라서 그 사용자의 운영 이력에 섞지 않는다. 이력은 detail의 `event` · `before`로 잇는다.
create or replace function public.ops_review_moderation(
  p_actor text, p_event uuid, p_verdict text, p_expected_category text default null, p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_verdict text := nullif(btrim(p_verdict), '');
  v_expected text := nullif(btrim(p_expected_category), '');
  v_note text := nullif(btrim(p_note), '');
  v_before jsonb;
  v_row ops.moderation_reviews;
begin
  if v_verdict is not null and v_verdict not in ('correct', 'false_positive', 'missed', 'unsure') then
    raise exception 'invalid_verdict' using errcode = '22023';
  end if;
  if char_length(v_expected) > 64 then
    raise exception 'invalid_expected_category' using errcode = '22023';
  end if;
  if char_length(v_note) > 200 then
    raise exception 'invalid_note' using errcode = '22023';
  end if;
  if p_event is null or not exists (select 1 from companion.moderation_events where id = p_event) then
    raise exception 'not_found';
  end if;

  select ops.review_json(r) into v_before from ops.moderation_reviews r where r.event_id = p_event;
  if v_verdict is null then
    delete from ops.moderation_reviews where event_id = p_event;
  else
    insert into ops.moderation_reviews as r (event_id, verdict, expected_category, note, actor)
    values (p_event, v_verdict, v_expected, v_note, v_actor)
    on conflict (event_id) do update set
      verdict = excluded.verdict, expected_category = excluded.expected_category, note = excluded.note,
      actor = excluded.actor, at = now()
    returning r.* into v_row;
  end if;

  perform ops.log(v_actor, 'write', 'review_moderation', null, jsonb_build_object(
    'event', p_event, 'verdict', v_verdict, 'before', v_before));
  return jsonb_build_object('ok', true, 'review', ops.review_json(v_row));
end;
$$;

-- 리비전에 이름 · 메모를 붙인다(비면 지운다). 아직 판정에 보이지 않은 리비전도 받는다 — 배포 전에 이름을 먼저 붙일 수 있다.
create or replace function public.ops_set_guardrail_rev(p_actor text, p_rev text, p_label text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  v_actor text := ops.actor(p_actor);
  v_label text := nullif(btrim(p_label), '');
  v_note text := nullif(btrim(p_note), '');
  v_before jsonb;
  v_row ops.guardrail_revs;
begin
  if p_rev is null or p_rev !~ '^[0-9a-f]{8}$' then
    raise exception 'invalid_rev' using errcode = '22023';
  end if;
  if char_length(v_label) > 80 then
    raise exception 'invalid_label' using errcode = '22023';
  end if;
  if char_length(v_note) > 500 then
    raise exception 'invalid_note' using errcode = '22023';
  end if;

  select jsonb_build_object('label', g.label, 'note', g.note) into v_before from ops.guardrail_revs g where g.rev = p_rev;
  insert into ops.guardrail_revs as g (rev, label, note, updated_by)
  values (p_rev, v_label, v_note, v_actor)
  on conflict (rev) do update set label = excluded.label, note = excluded.note, updated_by = excluded.updated_by, updated_at = now()
  returning g.* into v_row;

  perform ops.log(v_actor, 'write', 'set_guardrail_rev', null, jsonb_build_object(
    'rev', p_rev, 'label', v_label, 'note', v_note, 'before', v_before));
  return jsonb_build_object('ok', true, 'rev', jsonb_build_object(
    'rev', v_row.rev, 'label', v_row.label, 'note', v_row.note, 'updatedBy', v_row.updated_by, 'updatedAt', v_row.updated_at));
end;
$$;

-- ------------------------------------------------------------------ 권한

revoke all on function public.ops_moderation_summary(text, timestamptz, timestamptz, text, text, text, text) from public, anon, authenticated;
revoke all on function public.ops_moderation_feed(text, timestamptz, timestamptz, text, text, text, text, text, text, text, text, uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.ops_user_memories(text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.ops_user_stories(text, uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.ops_review_moderation(text, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.ops_set_guardrail_rev(text, text, text, text) from public, anon, authenticated;

grant execute on function public.ops_moderation_summary(text, timestamptz, timestamptz, text, text, text, text) to service_role;
grant execute on function public.ops_moderation_feed(text, timestamptz, timestamptz, text, text, text, text, text, text, text, text, uuid, integer, timestamptz) to service_role;
grant execute on function public.ops_user_memories(text, uuid, boolean) to service_role;
grant execute on function public.ops_user_stories(text, uuid, integer, timestamptz) to service_role;
grant execute on function public.ops_review_moderation(text, uuid, text, text, text) to service_role;
grant execute on function public.ops_set_guardrail_rev(text, text, text, text) to service_role;
