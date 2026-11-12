-- AI 컴패니언 1단계의 기반(M0): 스키마 `companion`, 전역 학습 표현 표와 유닛 대응표, 컴패니언 프로필(연령 · 모국어 · 피드백 방식).
-- 결정 · 계약은 docs/specs/ai-companion.md · ai-companion-api.md가 진다.
--
-- **앱은 `companion` 스키마에 닿지 않는다.** PostgREST에 이 스키마를 노출하지 않고, 앱이 부를 것만 `public.companion_*` 창구 함수로
-- 연다. 표는 전부 RLS를 켜고 정책 없이 두며 앱 역할의 권한을 걷는다(기존 `learner_profiles`와 같은 방식). 서버(Edge Function ·
-- 워커 · 표현 동기화)는 service role로 닿는다.
-- **생년은 개인정보다 — 분석 · 로그에 남기지 않는다.** 연령대는 저장하지 않고 읽을 때 생년으로 계산한다(해가 바뀌면 나이가 바뀐다).

create schema companion;
revoke all on schema companion from public;
grant usage on schema companion to service_role;

-- 전역 학습 표현. 배포 에피소드 JSON의 `words[]` · `patterns[]`가 출처이고 `companion.sync_expressions`만 쓴다.
-- 접두사는 배포 콘텐츠에서 관찰한 다섯이다(2026-11-08: voca · expr · patt에 더해 문법 `gram` · 수 단위 `nume`).
-- id는 바꾸거나 재사용하지 않는다 — 콘텐츠에서 사라지면 행을 지우지 않고 `retired`로 둔다(앞으로 유저 기록이 이 id에 걸린다).
create table companion.expressions (
  id text primary key check (id ~ '^(voca|expr|patt|gram|nume):[A-Za-z0-9_-]{1,64}$'),
  kind text not null check (kind in ('voca', 'expr', 'patt', 'gram', 'nume')),
  surface text not null check (char_length(surface) between 1 and 200),
  roman text check (roman is null or char_length(roman) <= 200),
  gloss_en text check (gloss_en is null or char_length(gloss_en) <= 300),
  grade text check (grade is null or char_length(grade) <= 20),
  -- 원형 태깅은 채팅 개발 뒤로 미뤘다. 지금은 비어 있다.
  lemma text check (lemma is null or char_length(lemma) <= 200),
  first_episode text check (first_episode is null or first_episode ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  retired boolean not null default false,
  updated_at timestamptz not null default now(),
  check (split_part(id, ':', 1) = kind)
);

-- 표현 ↔ 유닛 대응. 문항의 `ref`가 출처다(`words[]`는 에피소드 단위라 유닛과 바로 이어지지 않는다).
-- 컴패니언은 유저의 `catalogProgress`(에피소드 id → 끝낸 유닛 키)로 이 표를 걸러 프롬프트에 넣을 표현을 고른다.
create table companion.expression_units (
  expression_id text not null references companion.expressions (id),
  episode_id text not null check (episode_id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  unit_key text not null check (unit_key ~ '^[A-Za-z0-9_-]{1,32}$'),
  primary key (expression_id, episode_id, unit_key)
);
create index expression_units_unit_idx on companion.expression_units (episode_id, unit_key);

create table companion.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  birth_year smallint check (birth_year is null or birth_year between 1900 and 2100),
  age_source text check (age_source is null or age_source in ('self', 'social', 'store_signal')),
  -- 앱의 언어 선택 값(BCP 47 언어 태그). 피드백 설명 · 뜻을 이 언어로 쓴다.
  l1 text check (l1 is null or l1 ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$'),
  feedback_mode text check (feedback_mode is null or feedback_mode in ('separate', 'natural', 'prefix')),
  updated_at timestamptz not null default now(),
  -- 생년과 출처는 함께 있거나 함께 없다.
  check ((birth_year is null) = (age_source is null))
);

alter table companion.expressions enable row level security;
alter table companion.expression_units enable row level security;
alter table companion.profiles enable row level security;
revoke all on all tables in schema companion from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema companion to service_role;

-- 행이 없으면 null.
create function public.companion_load_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'birthYear', birth_year,
    'ageSource', age_source,
    'l1', l1,
    'feedbackMode', feedback_mode
  )
  from companion.profiles
  where user_id = auth.uid();
$$;

-- null인 인수는 그 열을 바꾸지 않는다. 생년과 출처는 둘 다 주거나 둘 다 비워야 한다. 생년은 올해를 넘을 수 없다.
create function public.companion_save_profile(
  p_birth_year integer,
  p_age_source text,
  p_l1 text,
  p_feedback_mode text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if (p_birth_year is null) <> (p_age_source is null)
    or (p_birth_year is not null and (
      p_birth_year < 1900 or p_birth_year > extract(year from now())::integer
    ))
    or (p_age_source is not null and p_age_source not in ('self', 'social', 'store_signal'))
    or (p_l1 is not null and p_l1 !~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$')
    or (p_feedback_mode is not null and p_feedback_mode not in ('separate', 'natural', 'prefix')) then
    raise exception 'invalid companion profile' using errcode = '22023';
  end if;
  insert into companion.profiles (user_id, birth_year, age_source, l1, feedback_mode, updated_at)
  values (auth.uid(), p_birth_year, p_age_source, p_l1, p_feedback_mode, now())
  on conflict (user_id) do update set
    birth_year = coalesce(excluded.birth_year, companion.profiles.birth_year),
    age_source = coalesce(excluded.age_source, companion.profiles.age_source),
    l1 = coalesce(excluded.l1, companion.profiles.l1),
    feedback_mode = coalesce(excluded.feedback_mode, companion.profiles.feedback_mode),
    updated_at = now();
end;
$$;

-- 배포 콘텐츠 전체의 스냅숏으로 표현과 대응표를 맞춘다. 입력에 없는 표현은 지우지 않고 `retired`로, 다시 나타나면 되살린다.
-- 대응표는 통째로 바꾼다(유저 기록이 걸리지 않는 파생 데이터다). 같은 입력을 두 번 넣어도 결과가 같다.
-- service role만 부른다. 표 소유자 권한(security definer)으로 돌아 RLS 정책 없이 쓴다 — 다른 RPC와 같은 방식이다.
-- p_expressions: [{ id, kind, surface, roman?, gloss_en?, grade?, first_episode? }], p_units: [{ expression_id, episode_id, unit_key }]
create function companion.sync_expressions(p_expressions jsonb, p_units jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_upserted integer;
  v_retired integer;
  v_units integer;
begin
  if jsonb_typeof(p_expressions) is distinct from 'array' or jsonb_typeof(p_units) is distinct from 'array'
    or jsonb_array_length(p_expressions) = 0 then
    raise exception 'invalid expression snapshot' using errcode = '22023';
  end if;

  with incoming as (
    select * from jsonb_to_recordset(p_expressions) as r(
      id text, kind text, surface text, roman text, gloss_en text, grade text, first_episode text
    )
  )
  insert into companion.expressions as e (id, kind, surface, roman, gloss_en, grade, first_episode, retired, updated_at)
  select id, kind, surface, roman, gloss_en, grade, first_episode, false, now() from incoming
  on conflict (id) do update set
    kind = excluded.kind,
    surface = excluded.surface,
    roman = excluded.roman,
    gloss_en = excluded.gloss_en,
    grade = excluded.grade,
    first_episode = excluded.first_episode,
    retired = false,
    updated_at = now()
  where (e.kind, e.surface, e.roman, e.gloss_en, e.grade, e.first_episode, e.retired)
    is distinct from (excluded.kind, excluded.surface, excluded.roman, excluded.gloss_en, excluded.grade, excluded.first_episode, false);
  get diagnostics v_upserted = row_count;

  update companion.expressions
  set retired = true, updated_at = now()
  where not retired
    and id not in (select value->>'id' from jsonb_array_elements(p_expressions));
  get diagnostics v_retired = row_count;

  -- `where true`: PostgREST 경로의 safeupdate가 조건 없는 delete를 막는다.
  delete from companion.expression_units where true;
  insert into companion.expression_units (expression_id, episode_id, unit_key)
  select distinct expression_id, episode_id, unit_key
  from jsonb_to_recordset(p_units) as r(expression_id text, episode_id text, unit_key text);
  get diagnostics v_units = row_count;

  return jsonb_build_object('changed', v_upserted, 'retired', v_retired, 'units', v_units);
end;
$$;

revoke all on function public.companion_load_profile() from public, anon;
revoke all on function public.companion_save_profile(integer, text, text, text) from public, anon;
revoke all on function companion.sync_expressions(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.companion_load_profile() to authenticated;
grant execute on function public.companion_save_profile(integer, text, text, text) to authenticated;
grant execute on function companion.sync_expressions(jsonb, jsonb) to service_role;
