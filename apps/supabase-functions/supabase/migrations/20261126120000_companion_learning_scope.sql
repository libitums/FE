-- AI 컴패니언 — 배운 표현을 고를 범위를 유저가 정하기(PRD §3.7, 결정 2026-11-10).
--
--   기본은 자동(`auto`) — 지금처럼 끝낸 유닛 전부. 설정에서 수동(`manual`)으로 바꾸면 고른 에피소드(u01-water …)만 쓴다.
--   고를 수 있는 에피소드 = 유저가 유닛을 하나 이상 끝냈고 학습 표현이 있는 에피소드. 고른 에피소드 안에서도 끝낸 유닛의 표현만 쓴다
--   (「끝낸 유닛만」은 그대로). 수동인데 고른 것이 없으면 넣지 않는다(자동으로 되돌리지 않는다 — 설정 응답의 `empty`).
--   고른 에피소드가 나중에 콘텐츠에서 빠지면(대응표에 없으면) 건너뛴다. 튜토리얼 규칙은 그대로 — 고른 범위가 튜토리얼뿐이면 턴에는 넣지 않는다.
--
--   · `companion.profiles.learning_scope` · `learning_units` — 상한 50개, id 모양은 설정 함수가 검사한다.
--   · `companion.episodes` — 에피소드 제목 · 순서(배포 매니페스트). `companion.sync_episodes`(service role)만 쓰고, 표현 동기화
--     스크립트(`devtools/companion-expressions/build.mjs`)가 같은 SQL 파일에 함께 싣는다. 비어 있으면 제목 대신 id를 준다.
--   · `companion_learning_scope()` · `companion_set_learning_scope(p_scope, p_units)` — 앱(authenticated). 플레이그라운드는
--     `companion_operator_learning_scope(p_user_id)` · `companion_operator_set_learning_scope(p_user_id, p_scope, p_units)`(시험 계정만).
--   · `companion_learning_context`(같은 인수)가 범위를 따르고 `scope { mode, units, empty }`를 더 준다.
--
-- 기존 컴패니언 마이그레이션(20261108 ~ 20261125) 뒤에 적용한다. 다시 적용해도 같은 결과다.

alter table companion.profiles
  add column if not exists learning_scope text not null default 'auto',
  add column if not exists learning_units text[] not null default '{}';
alter table companion.profiles drop constraint if exists profiles_learning_scope_check;
alter table companion.profiles
  add constraint profiles_learning_scope_check check (
    learning_scope in ('auto', 'manual') and cardinality(learning_units) <= 50
  );

create table if not exists companion.episodes (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  title text check (title is null or char_length(title) <= 200),
  sort_order integer,
  updated_at timestamptz not null default now()
);
alter table companion.episodes enable row level security;
revoke all on table companion.episodes from public, anon, authenticated;
grant select, insert, update, delete on table companion.episodes to service_role;

-- 매니페스트 에피소드 목록으로 제목 · 순서를 맞춘다. 입력에 없는 에피소드는 남겨 둔다(고를 수 있는지는 대응표가 정한다).
-- p_episodes: [{ id, title?, order? }]
create or replace function companion.sync_episodes(p_episodes jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if jsonb_typeof(p_episodes) is distinct from 'array' then
    raise exception 'invalid episode list' using errcode = '22023';
  end if;
  insert into companion.episodes as e (id, title, sort_order, updated_at)
  select r.id, nullif(btrim(r.title), ''), r."order", now()
  from jsonb_to_recordset(p_episodes) as r(id text, title text, "order" integer)
  where r.id ~ '^[a-z0-9][a-z0-9-]{0,63}$'
  on conflict (id) do update set title = excluded.title, sort_order = excluded.sort_order, updated_at = now()
  where (e.title, e.sort_order) is distinct from (excluded.title, excluded.sort_order);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 유저가 끝낸 유닛(catalogProgress: 에피소드 id → 끝낸 유닛 키 배열).
create or replace function companion.completed_units(p_user_id uuid)
returns table (episode_id text, unit_key text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.key, u.value
  from public.learning_progress lp,
    jsonb_each(coalesce(lp.progress->'catalogProgress', '{}'::jsonb)) as e(key, value),
    jsonb_array_elements_text(e.value) as u(value)
  where lp.user_id = p_user_id
    and jsonb_typeof(lp.progress->'catalogProgress') = 'object'
    and jsonb_typeof(e.value) = 'array'
$$;

-- 지금 범위로 쓸 끝낸 유닛. 자동이면 전부, 수동이면 고른 에피소드의 것만.
create or replace function companion.scoped_units(p_user_id uuid)
returns table (episode_id text, unit_key text)
language sql
stable
security definer
set search_path = ''
as $$
  select cu.episode_id, cu.unit_key
  from companion.completed_units(p_user_id) cu
  left join companion.profiles p on p.user_id = p_user_id
  where coalesce(p.learning_scope, 'auto') = 'auto' or cu.episode_id = any (p.learning_units)
$$;

-- 설정 화면용: 범위 · 고른 에피소드와 고를 수 있는 에피소드(끝낸 유닛 수 · 표현 수 · 골랐는가).
create or replace function companion.learning_scope_json(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with profile as (
    select coalesce(p.learning_scope, 'auto') as scope, coalesce(p.learning_units, '{}') as units
    from (select 1) one left join companion.profiles p on p.user_id = p_user_id
  ),
  completed as (
    select cu.episode_id, count(distinct cu.unit_key) as units,
      count(distinct x.id) filter (where x.id is not null) as expressions
    from companion.completed_units(p_user_id) cu
    left join companion.expression_units eu on eu.episode_id = cu.episode_id and eu.unit_key = cu.unit_key
    left join companion.expressions x on x.id = eu.expression_id and not x.retired
    group by cu.episode_id
  ),
  options as (
    select c.episode_id, c.units, c.expressions, ep.title, ep.sort_order
    from completed c left join companion.episodes ep on ep.id = c.episode_id
    where c.expressions > 0
  )
  select jsonb_build_object(
    'scope', profile.scope,
    -- 고른 것 가운데 지금 고를 수 있는 것만(콘텐츠에서 빠진 에피소드는 건너뛴다).
    'units', coalesce((
      select jsonb_agg(o.episode_id order by o.sort_order nulls last, o.episode_id)
      from options o where o.episode_id = any (profile.units)
    ), '[]'::jsonb),
    'empty', profile.scope = 'manual'
      and not exists (select 1 from options o where o.episode_id = any (profile.units)),
    'options', coalesce((
      select jsonb_agg(jsonb_build_object(
        'episode', o.episode_id,
        'title', o.title,
        'completedUnits', o.units,
        'expressions', o.expressions,
        'selected', o.episode_id = any (profile.units)
      ) order by o.sort_order nulls last, o.episode_id)
      from options o
    ), '[]'::jsonb)
  )
  from profile
$$;

create or replace function companion.set_learning_scope(p_user_id uuid, p_scope text, p_units text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_units text[];
begin
  if p_scope is null or p_scope not in ('auto', 'manual') then
    raise exception 'invalid learning scope' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct u order by u), '{}') into v_units
  from unnest(coalesce(p_units, '{}')) u where u is not null;
  if cardinality(v_units) > 50
    or exists (select 1 from unnest(v_units) u where u !~ '^[a-z0-9][a-z0-9-]{0,63}$') then
    raise exception 'invalid learning units' using errcode = '22023';
  end if;
  -- 자동으로 돌아가도 고른 목록은 남긴다 — 다시 수동으로 바꾸면 그대로 보인다.
  insert into companion.profiles (user_id, learning_scope, learning_units)
  values (p_user_id, p_scope, case when p_units is null then '{}' else v_units end)
  on conflict (user_id) do update set
    learning_scope = excluded.learning_scope,
    learning_units = case when p_units is null then companion.profiles.learning_units else excluded.learning_units end,
    updated_at = now();
  return companion.learning_scope_json(p_user_id);
end;
$$;

create or replace function public.companion_learning_scope()
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
  return companion.learning_scope_json(auth.uid());
end;
$$;

create or replace function public.companion_set_learning_scope(p_scope text, p_units text[] default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  return companion.set_learning_scope(auth.uid(), p_scope, p_units);
end;
$$;

create or replace function public.companion_operator_learning_scope(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from auth.users where id = p_user_id and raw_app_meta_data->>'duru_tester' = 'true') then
    raise exception 'not a tester' using errcode = 'P0002';
  end if;
  return companion.learning_scope_json(p_user_id);
end;
$$;

create or replace function public.companion_operator_set_learning_scope(p_user_id uuid, p_scope text, p_units text[] default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from auth.users where id = p_user_id and raw_app_meta_data->>'duru_tester' = 'true') then
    raise exception 'not a tester' using errcode = 'P0002';
  end if;
  return companion.set_learning_scope(p_user_id, p_scope, p_units);
end;
$$;

-- 프롬프트 · 판정에 넣을 학습 맥락(20261125) — 끝낸 유닛 대신 지금 범위의 끝낸 유닛을 쓰고 `scope`를 더한다.
create or replace function public.companion_learning_context(p_user_id uuid, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with units as (
    select su.episode_id, su.unit_key from companion.scoped_units(p_user_id) su
  ),
  picked as (
    select distinct on (x.id) x.id, x.kind, x.surface, x.roman, x.gloss_en, eu.episode_id
    from units
    join companion.expression_units eu on eu.episode_id = units.episode_id and eu.unit_key = units.unit_key
    join companion.expressions x on x.id = eu.expression_id and not x.retired
    order by x.id, eu.episode_id desc
  ),
  scope as (select companion.learning_scope_json(p_user_id) as j)
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
    ),
    'scope', (select jsonb_build_object('mode', j->'scope', 'units', j->'units', 'empty', j->'empty') from scope)
  )
$$;

revoke all on function companion.sync_episodes(jsonb) from public, anon, authenticated;
grant execute on function companion.sync_episodes(jsonb) to service_role;
revoke all on function companion.completed_units(uuid) from public, anon, authenticated;
revoke all on function companion.scoped_units(uuid) from public, anon, authenticated;
revoke all on function companion.learning_scope_json(uuid) from public, anon, authenticated;
revoke all on function companion.set_learning_scope(uuid, text, text[]) from public, anon, authenticated;
revoke all on function public.companion_learning_scope() from public, anon;
grant execute on function public.companion_learning_scope() to authenticated;
revoke all on function public.companion_set_learning_scope(text, text[]) from public, anon;
grant execute on function public.companion_set_learning_scope(text, text[]) to authenticated;
revoke all on function public.companion_operator_learning_scope(uuid) from public, anon, authenticated;
grant execute on function public.companion_operator_learning_scope(uuid) to service_role;
revoke all on function public.companion_operator_set_learning_scope(uuid, text, text[]) from public, anon, authenticated;
grant execute on function public.companion_operator_set_learning_scope(uuid, text, text[]) to service_role;
revoke all on function public.companion_learning_context(uuid, integer) from public, anon, authenticated;
grant execute on function public.companion_learning_context(uuid, integer) to service_role;
