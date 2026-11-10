-- AI 컴패니언 — 배운 표현을 대화에 녹이기(PRD §3.7 결정 2026-11-10).
--
--   넣기 설정 `companion.settings.learning_*` — 주기(직전 삽입 뒤 유저 턴 `learning_min_gap`번이 지나야 후보가 열리고, 열린 뒤
--   `learning_base_probability`에서 턴마다 올라 `learning_force_turns`번째에는 반드시) · 대화당 하루 상한(`learning_daily_cap`) ·
--   전체 끄기(`learning_enabled`). 판정 · 표현 고르기 · 방식(노출 · 유도 · 칩)은 함수(`companion-learning.ts`)가 하고, 대화마다의
--   간격 · 하루 수 · 최근 지시한 표현은 `conversations.topic_state`에 둔다(칸만 늘어난다 — 스키마 변경 없음).
--
--   유저 × 표현 기록 `companion.user_expressions` — 캐릭터가 실제로 쓴 횟수(노출 · 첫 인사 · 선톡) · 유도 질문 · 칩에 실린 횟수 · 유저가
--   직접 입력해 쓴 횟수(칩 전송은 세지 않는다)와 마지막 시각. `companion_record_learning`(서버)만 쓴다. 기억(§3.9)과 따로다.
--
--   · `companion_learning_context`(같은 인수)가 표현마다 유저 기록 · 낸 에피소드와 넣기 설정(`settings`)을 더 준다. 끝낸 유닛만 —
--     그대로다.
--   · `companion.correction_json`이 카드의 `learnedUsed`(유저가 쓴 배운 표현, 있을 때만)를 돌려준다.
--   · `companion_learning_stats(p_since, p_playground)` — 지표: 후보가 열린 턴 · 넣은 턴(방식별) · 실제로 따른 턴 · 넣지 않은 까닭 ·
--     유저 산출(유도 뒤 3턴 안) · 다시 쓴 표현(산출 2번 이상, 하루 넘게 떨어져).
--
-- 기존 컴패니언 마이그레이션(20261108 ~ 20261124) 뒤에 적용한다. 다시 적용해도 같은 결과다.

alter table companion.settings
  add column if not exists learning_enabled boolean not null default true,
  add column if not exists learning_min_gap integer not null default 3,
  add column if not exists learning_base_probability numeric not null default 0.3,
  add column if not exists learning_force_turns integer not null default 6,
  add column if not exists learning_daily_cap integer not null default 6;
alter table companion.settings drop constraint if exists settings_learning_values_check;
alter table companion.settings
  add constraint settings_learning_values_check check (
    learning_min_gap >= 1
    and learning_base_probability between 0 and 1
    and learning_force_turns >= learning_min_gap
    and learning_daily_cap >= 0
  );

create table if not exists companion.user_expressions (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 표현은 지우지 않고 `retired`만 하므로(20261108) 외래 키를 두지 않는다 — 기록 함수가 있는 표현만 센다.
  expression_id text not null,
  exposed_count integer not null default 0,
  last_exposed_at timestamptz,
  elicited_count integer not null default 0,
  last_elicited_at timestamptz,
  chip_shown_count integer not null default 0,
  last_chip_at timestamptz,
  produced_count integer not null default 0,
  first_produced_at timestamptz,
  last_produced_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, expression_id)
);
alter table companion.user_expressions enable row level security;
revoke all on table companion.user_expressions from public, anon, authenticated;
grant select, insert, update, delete on table companion.user_expressions to service_role;

-- 프롬프트 · 판정에 넣을 학습 맥락: 끝낸 유닛의 학습 표현(최대 p_limit개, 마지막 에피소드 것부터) + 유저 기록 + 넣기 설정.
create or replace function public.companion_learning_context(p_user_id uuid, p_limit integer)
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
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'kind', p.kind, 'surface', p.surface, 'roman', p.roman, 'gloss', p.gloss_en,
        'episode', p.episode_id,
        'exposed', coalesce(ue.exposed_count, 0),
        'elicited', coalesce(ue.elicited_count, 0),
        'chipShown', coalesce(ue.chip_shown_count, 0),
        'produced', coalesce(ue.produced_count, 0),
        'lastSeenAt', greatest(ue.last_exposed_at, ue.last_elicited_at, ue.last_chip_at)
      ) order by p.episode_id desc, p.id)
      from (select * from picked order by episode_id desc, id limit greatest(0, least(p_limit, 200))) p
      left join companion.user_expressions ue on ue.user_id = p_user_id and ue.expression_id = p.id
    ), '[]'::jsonb),
    'settings', (
      select jsonb_build_object(
        'enabled', s.learning_enabled,
        'minGap', s.learning_min_gap,
        'baseProbability', s.learning_base_probability,
        'forceTurns', s.learning_force_turns,
        'dailyCap', s.learning_daily_cap
      ) from companion.settings s limit 1
    )
  )
$$;

-- 기록 세기. p_events: [{ expression_id, kind: exposed | elicited | chip_shown | produced }]. 없는 표현 · 모르는 kind는 건너뛴다.
create or replace function public.companion_record_learning(p_user_id uuid, p_events jsonb, p_now timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_event record;
begin
  if jsonb_typeof(p_events) is distinct from 'array' then
    return 0;
  end if;
  for v_event in
    select e->>'expression_id' as expression_id, e->>'kind' as kind
    from jsonb_array_elements(p_events) e
    where e->>'kind' in ('exposed', 'elicited', 'chip_shown', 'produced')
      and exists (select 1 from companion.expressions x where x.id = e->>'expression_id')
  loop
    insert into companion.user_expressions as ue (
      user_id, expression_id,
      exposed_count, last_exposed_at, elicited_count, last_elicited_at,
      chip_shown_count, last_chip_at, produced_count, first_produced_at, last_produced_at, updated_at
    )
    values (
      p_user_id, v_event.expression_id,
      (v_event.kind = 'exposed')::int, case when v_event.kind = 'exposed' then p_now end,
      (v_event.kind = 'elicited')::int, case when v_event.kind = 'elicited' then p_now end,
      (v_event.kind = 'chip_shown')::int, case when v_event.kind = 'chip_shown' then p_now end,
      (v_event.kind = 'produced')::int, case when v_event.kind = 'produced' then p_now end,
      case when v_event.kind = 'produced' then p_now end, p_now
    )
    on conflict (user_id, expression_id) do update set
      exposed_count = ue.exposed_count + (v_event.kind = 'exposed')::int,
      last_exposed_at = case when v_event.kind = 'exposed' then p_now else ue.last_exposed_at end,
      elicited_count = ue.elicited_count + (v_event.kind = 'elicited')::int,
      last_elicited_at = case when v_event.kind = 'elicited' then p_now else ue.last_elicited_at end,
      chip_shown_count = ue.chip_shown_count + (v_event.kind = 'chip_shown')::int,
      last_chip_at = case when v_event.kind = 'chip_shown' then p_now else ue.last_chip_at end,
      produced_count = ue.produced_count + (v_event.kind = 'produced')::int,
      first_produced_at = coalesce(ue.first_produced_at, case when v_event.kind = 'produced' then p_now end),
      last_produced_at = case when v_event.kind = 'produced' then p_now else ue.last_produced_at end,
      updated_at = p_now;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- SSE `correction` 데이터와 같은 카드(20261116) + `reason`(건너뛴 카드만, 20261121) + `learnedUsed`(유저가 쓴 배운 표현, 있을 때만).
create or replace function companion.correction_json(c companion.corrections)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'userMessageId', c.message_id,
    'status', c.status,
    'kind', c.kind,
    'original', coalesce(
      c.card->>'original',
      (select m.text from companion.messages m where m.id = c.message_id),
      ''
    ),
    'corrected', case when c.card is not null then c.card->'corrected' else to_jsonb(c.l1_to_ko->>'text') end,
    'items', coalesce(
      case when jsonb_typeof(c.card->'items') = 'array' then c.card->'items' end,
      c.items,
      '[]'::jsonb
    ),
    'better', case
      when c.card is not null then case when jsonb_typeof(c.card->'better') = 'object' then c.card->'better' else 'null'::jsonb end
      when c.better is not null then jsonb_build_object(
        'text', c.better->>'text',
        'meaning', coalesce(c.better->>'meaning', ''),
        'explanation', coalesce(c.better->>'explanation', '')
      )
      else 'null'::jsonb
    end,
    'meaning', case
      when c.card is not null then c.card->'meaning'
      else to_jsonb(c.l1_to_ko->>'meaning')
    end
  )
  || case when c.status = 'skipped' and c.card ? 'reason' then jsonb_build_object('reason', c.card->'reason') else '{}'::jsonb end
  || case
    when jsonb_typeof(c.card->'learnedUsed') = 'array' and jsonb_array_length(c.card->'learnedUsed') > 0
      then jsonb_build_object('learnedUsed', c.card->'learnedUsed')
    else '{}'::jsonb
  end
$$;
revoke all on function companion.correction_json(companion.corrections) from public;

-- 학습 표현 지표. 캐릭터 메시지의 `meta.learning`(턴 · 첫 인사 · 선톡)이 근거다. 숨긴(다시 보낸) 턴은 뺀다.
create or replace function public.companion_learning_stats(p_since timestamptz, p_playground boolean default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with msgs as (
    select m.id, m.conversation_id, m.created_at, m.origin, m.meta->'learning' as learning
    from companion.messages m
    where m.role = 'assistant' and m.created_at >= p_since
      and jsonb_typeof(m.meta->'learning') = 'object'
      and not m.hidden
      and (p_playground is null or coalesce((m.meta->>'playground')::boolean, false) = p_playground)
  ),
  turns as (select * from msgs where origin = 'turn'),
  elicited as (
    select t.id, t.conversation_id, t.created_at, t.learning->>'expressionId' as expression_id
    from turns t
    where t.learning->>'mode' = 'elicit' and (t.learning->>'done')::boolean
  ),
  followed as (
    select e.id,
      exists (
        select 1 from (
          select n.learning from turns n
          where n.conversation_id = e.conversation_id and n.created_at > e.created_at
          order by n.created_at limit 3
        ) nx
        where jsonb_typeof(nx.learning->'produced') = 'array' and nx.learning->'produced' ? e.expression_id
      ) as produced
    from elicited e
  )
  select jsonb_build_object(
    'since', p_since,
    'turns', (select count(*) from turns),
    'open', (select count(*) from turns where (learning->>'open')::boolean),
    'inserted', (select count(*) from turns where learning ? 'mode'),
    'byMode', coalesce((
      select jsonb_object_agg(mode, jsonb_build_object('inserted', inserted, 'done', done)) from (
        select learning->>'mode' as mode, count(*) as inserted,
          count(*) filter (where (learning->>'done')::boolean) as done
        from msgs where learning ? 'mode' group by 1
      ) g
    ), '{}'::jsonb),
    'byOrigin', coalesce((
      select jsonb_object_agg(origin, n) from (
        select origin, count(*) as n from msgs where learning ? 'mode' group by 1
      ) g
    ), '{}'::jsonb),
    'reasons', coalesce((
      select jsonb_object_agg(reason, n) from (
        select learning->>'reason' as reason, count(*) as n from turns group by 1
      ) g
    ), '{}'::jsonb),
    'producedTurns', (select count(*) from turns where jsonb_typeof(learning->'produced') = 'array'),
    'elicitedDone', (select count(*) from elicited),
    'elicitedProduced', (select count(*) from followed where produced),
    'reused', (
      select count(*) from companion.user_expressions ue
      where ue.produced_count >= 2 and ue.last_produced_at - ue.first_produced_at >= interval '1 day'
    ),
    'producedExpressions', (select count(*) from companion.user_expressions where produced_count > 0),
    'topExpressions', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'surface', x.surface, 'inserted', g.n) order by g.n desc)
      from (
        select learning->>'expressionId' as id, count(*) as n from msgs where learning ? 'mode'
        group by 1 order by 2 desc limit 10
      ) g
      join companion.expressions x on x.id = g.id
    ), '[]'::jsonb)
  )
$$;

revoke all on function public.companion_record_learning(uuid, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.companion_record_learning(uuid, jsonb, timestamptz) to service_role;
revoke all on function public.companion_learning_stats(timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.companion_learning_stats(timestamptz, boolean) to service_role;
revoke all on function public.companion_learning_context(uuid, integer) from public, anon, authenticated;
grant execute on function public.companion_learning_context(uuid, integer) to service_role;
