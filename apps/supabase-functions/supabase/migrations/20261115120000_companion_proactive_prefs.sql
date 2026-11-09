-- AI 컴패니언 — 선톡 빈도를 유저가 고른다(하루 0 · 1 · 2회) · 선호 시각 · 시간대 · 조용한 시간.
--
--   `companion.profiles`에 `proactive_pref`(off · daily1 · daily2, 기본 daily1) · `proactive_hour`(현지 시각 0 ~ 23, null이면 아무 때나) ·
--   `timezone`(IANA, null이면 모름)을 더한다.
--   판정은 `companion.proactive_skip_reason` 하나가 하고, 후보(`companion_proactive_candidates`)와 맥락(`companion_proactive_context`)이
--   같은 판정을 쓴다. 규칙:
--     off      → 보내지 않는다.
--     daily1   → 하루 1회, 마지막 메시지 뒤 `settings.proactive_gap`(24시간) 지나서.
--     daily2   → 하루 2회, 마지막 메시지 뒤 `settings.proactive_gap_daily2`(10시간) 지나서.
--     공통     → 그 유저의 직전 선톡 뒤 `settings.proactive_spacing`(8시간) 지나서. 하루 횟수는 `settings.proactive_daily_cap`을 넘지 않는다(전체 상한).
--     시간대를 알면(프로필 `timezone`, 없으면 지역의 대표 시간대) 현지 22:00 ~ 08:00에는 보내지 않고, 「하루」는 현지 자정부터다.
--     `proactive_hour`가 있으면 현지 그 시각에만 — daily2는 그 시각과 10시간 뒤 두 번(10시간 뒤가 조용한 시간이면 그날은 한 번).
--     시간대를 모르면 시각 맞추기 · 조용한 시간을 건너뛰고 하루는 UTC 기준이다.
--   한 번 돌 때 유저마다 후보 하나(가장 오래 조용한 대화)만 — 같은 회차에 상한을 넘기지 않게.
--   예약 작업은 매시 30분 그대로다 — 유저마다 현지 시각이 달라 매시간 봐야 선호 시각을 맞출 수 있다. 유저마다 보내는 수는 위 규칙이 정한다.
--   연령 · 지역 규칙(성인, 또는 미국이 아님을 아는 미성년자)은 그대로다.
--
--   앱: `companion_save_profile` · `companion_load_profile`에 선톡 설정 셋. 운영: `companion_operator_set_profile`에 같은 셋,
--   `companion_inspect_testers`가 보여 준다. 기존 인수만 쓰는 호출은 그대로 돈다(새 인수는 기본값 null).
--
-- 기존 컴패니언 마이그레이션(20261108 ~ 20261114) 뒤에 적용한다.

alter table companion.profiles
  add column if not exists proactive_pref text not null default 'daily1'
    check (proactive_pref in ('off', 'daily1', 'daily2')),
  add column if not exists proactive_hour smallint
    check (proactive_hour is null or proactive_hour between 0 and 23),
  add column if not exists timezone text
    check (timezone is null or timezone ~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+){0,2}$');

alter table companion.settings
  add column if not exists proactive_gap_daily2 interval not null default interval '10 hours',
  add column if not exists proactive_spacing interval not null default interval '8 hours';
-- 전체 상한은 daily2가 쓸 수 있게 2로. 운영자가 바꾸지 않은 기본값(1)일 때만 올린다.
alter table companion.settings alter column proactive_daily_cap set default 2;
update companion.settings set proactive_daily_cap = 2 where proactive_daily_cap = 1;

-- ------------------------------------------------------------------ 내부 도우미 (companion 스키마, 노출 안 됨)

-- 지역의 대표 시간대. 시간대가 여럿인 나라(미국 등)와 모르는 지역은 null — 시각 맞추기 · 조용한 시간을 건너뛴다.
create or replace function companion.default_timezone(p_region text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_region
    when 'KR' then 'Asia/Seoul'
    when 'JP' then 'Asia/Tokyo'
    when 'PH' then 'Asia/Manila'
    when 'IN' then 'Asia/Kolkata'
    when 'VN' then 'Asia/Ho_Chi_Minh'
    when 'TH' then 'Asia/Bangkok'
    when 'ID' then 'Asia/Jakarta'
    when 'MY' then 'Asia/Kuala_Lumpur'
    when 'SG' then 'Asia/Singapore'
    when 'TW' then 'Asia/Taipei'
    when 'HK' then 'Asia/Hong_Kong'
    when 'CN' then 'Asia/Shanghai'
  end
$$;

-- 지금 이 유저에게 선톡을 보내면 안 되는 이유, 보내도 되면 null. 이유: off · quiet_hours · hour · daily_cap · gap · spacing.
-- 연령 · 지역 규칙은 여기서 보지 않는다(부르는 쪽이 본다 — 플레이그라운드 `force`는 이 판정만 건너뛴다).
create or replace function companion.proactive_skip_reason(p_user_id uuid, p_last_message_at timestamptz, p_now timestamptz)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s companion.settings;
  v_pref text;
  v_hour smallint;
  v_tz text;
  v_region text;
  v_local_hour integer;
  v_day_start timestamptz;
  v_sent integer;
  v_gap interval;
begin
  select * into s from companion.settings;
  select p.proactive_pref, p.proactive_hour, p.timezone, p.last_region
  into v_pref, v_hour, v_tz, v_region
  from companion.profiles p where p.user_id = p_user_id;
  v_pref := coalesce(v_pref, 'daily1');
  if v_pref = 'off' then
    return 'off';
  end if;

  v_tz := coalesce(v_tz, companion.default_timezone(v_region));
  if v_tz is not null then
    v_local_hour := extract(hour from p_now at time zone v_tz)::integer;
    if v_local_hour >= 22 or v_local_hour < 8 then
      return 'quiet_hours';
    end if;
    if v_hour is not null and v_local_hour <> v_hour
      and not (v_pref = 'daily2' and v_local_hour = (v_hour + 10) % 24) then
      return 'hour';
    end if;
    v_day_start := date_trunc('day', p_now at time zone v_tz) at time zone v_tz;
  else
    v_day_start := date_trunc('day', p_now at time zone 'UTC') at time zone 'UTC';
  end if;

  select count(*) into v_sent from companion.messages m
  where m.user_id = p_user_id and m.origin = 'proactive' and m.created_at >= v_day_start;
  if v_sent >= least(case v_pref when 'daily2' then 2 else 1 end, s.proactive_daily_cap) then
    return 'daily_cap';
  end if;

  v_gap := case v_pref when 'daily2' then s.proactive_gap_daily2 else s.proactive_gap end;
  if p_last_message_at is null or p_last_message_at > p_now - v_gap then
    return 'gap';
  end if;
  if exists (
    select 1 from companion.messages m
    where m.user_id = p_user_id and m.origin = 'proactive' and m.created_at > p_now - s.proactive_spacing
  ) then
    return 'spacing';
  end if;
  return null;
end;
$$;

-- ------------------------------------------------------------------ 선톡 (service_role)

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
      -- 유저마다 가장 오래 조용한 대화 하나.
      select distinct on (c.user_id) c.user_id, c.character_id, c.id, c.last_message_at
      from companion.conversations c
      left join companion.profiles p on p.user_id = c.user_id
      where c.kind = 'companion' and c.last_message_at is not null
        and (
          companion.age_band(p.birth_year, p_now) = 'adult'
          -- 미성년자는 미국이 아닌 것을 아는 경우만. 지역을 모르면 미국일 수 있다고 본다.
          or (companion.age_band(p.birth_year, p_now) = 'minor' and p.last_region is not null and p.last_region <> 'US')
        )
        and companion.proactive_skip_reason(c.user_id, c.last_message_at, p_now) is null
      order by c.user_id, c.last_message_at
    ) y
    order by y.last_message_at
    limit greatest(1, least(coalesce(p_limit, 20), 200))
  ) x
$$;

-- `skipReason`이 판정(위 규칙), `capReached`는 이전 함수 호환(이유가 있으면 참). 플레이그라운드 `force`는 둘 다 건너뛴다.
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
    'allowed', companion.age_band(p.birth_year, p_now) = 'adult'
      or (companion.age_band(p.birth_year, p_now) = 'minor' and p.last_region is not null and p.last_region <> 'US'),
    'skipReason', companion.proactive_skip_reason(p_user_id, c.last_message_at, p_now),
    'capReached', companion.proactive_skip_reason(p_user_id, c.last_message_at, p_now) is not null,
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

-- ------------------------------------------------------------------ 앱용 (authenticated)

create or replace function public.companion_load_profile()
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
    'feedbackMode', feedback_mode,
    'proactivePref', proactive_pref,
    'proactiveHour', proactive_hour,
    'timezone', timezone
  )
  from companion.profiles
  where user_id = auth.uid();
$$;

-- 선톡 설정 검사(앱 · 운영 함께). 시간대는 이 DB가 아는 IANA 이름만.
create or replace function companion.valid_proactive_prefs(p_pref text, p_hour integer, p_timezone text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (p_pref is null or p_pref in ('off', 'daily1', 'daily2'))
    and (p_hour is null or p_hour between -1 and 23)
    and (p_timezone is null or p_timezone = '' or exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone))
$$;

drop function if exists public.companion_save_profile(integer, text, text, text);
-- null인 인수는 그 열을 바꾸지 않는다. 생년과 출처는 둘 다 주거나 둘 다 비워야 한다. 생년은 올해를 넘을 수 없다.
-- 선톡: p_proactive_hour -1이면 선호 시각을 지우고(아무 때나), p_timezone ''이면 시간대를 지운다.
create function public.companion_save_profile(
  p_birth_year integer,
  p_age_source text,
  p_l1 text,
  p_feedback_mode text,
  p_proactive_pref text default null,
  p_proactive_hour integer default null,
  p_timezone text default null
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
    or (p_feedback_mode is not null and p_feedback_mode not in ('separate', 'natural', 'prefix'))
    or not companion.valid_proactive_prefs(p_proactive_pref, p_proactive_hour, p_timezone) then
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
  update companion.profiles set
    proactive_pref = coalesce(p_proactive_pref, proactive_pref),
    proactive_hour = case when p_proactive_hour = -1 then null else coalesce(p_proactive_hour::smallint, proactive_hour) end,
    timezone = case when p_timezone = '' then null else coalesce(p_timezone, timezone) end
  where user_id = auth.uid();
end;
$$;

-- ------------------------------------------------------------------ 운영 (service_role)

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
    'feedbackMode', p.feedback_mode,
    'proactivePref', coalesce(p.proactive_pref, 'daily1'),
    'proactiveHour', p.proactive_hour,
    'timezone', p.timezone
  ) order by u.email), '[]'::jsonb)
  from auth.users u
  left join companion.profiles p on p.user_id = u.id
  where u.raw_app_meta_data->>'duru_tester' = 'true'
$$;

drop function if exists public.companion_operator_set_profile(uuid, integer, boolean, text, text, text);
-- 플레이그라운드에서 시험 계정의 연령 · 모국어 · 피드백 방식 · 지역 · 선톡 설정을 바꾼다. null 인수는 그 열을 바꾸지 않고,
-- p_clear_age면 생년을, p_region ''이면 지역을, p_proactive_hour -1이면 선호 시각을, p_timezone ''이면 시간대를 지운다.
create function public.companion_operator_set_profile(
  p_user_id uuid, p_birth_year integer, p_clear_age boolean, p_l1 text, p_feedback_mode text, p_region text,
  p_proactive_pref text default null, p_proactive_hour integer default null, p_timezone text default null
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
  if not companion.valid_proactive_prefs(p_proactive_pref, p_proactive_hour, p_timezone) then
    raise exception 'invalid companion profile' using errcode = '22023';
  end if;
  insert into companion.profiles (user_id) values (p_user_id) on conflict do nothing;
  update companion.profiles set
    birth_year = case when p_clear_age then null else coalesce(p_birth_year::smallint, birth_year) end,
    age_source = case when p_clear_age then null when p_birth_year is not null then 'self' else age_source end,
    l1 = coalesce(p_l1, l1),
    feedback_mode = coalesce(p_feedback_mode, feedback_mode),
    -- 빈 문자열이면 지역을 지운다(null은 그대로 둔다).
    last_region = case when p_region = '' then null else coalesce(p_region, last_region) end,
    proactive_pref = coalesce(p_proactive_pref, proactive_pref),
    proactive_hour = case when p_proactive_hour = -1 then null else coalesce(p_proactive_hour::smallint, proactive_hour) end,
    timezone = case when p_timezone = '' then null else coalesce(p_timezone, timezone) end,
    updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function companion.default_timezone(text) from public;
revoke all on function companion.proactive_skip_reason(uuid, timestamptz, timestamptz) from public;
revoke all on function companion.valid_proactive_prefs(text, integer, text) from public;
revoke all on function public.companion_save_profile(integer, text, text, text, text, integer, text) from public, anon;
grant execute on function public.companion_save_profile(integer, text, text, text, text, integer, text) to authenticated;
revoke all on function public.companion_operator_set_profile(uuid, integer, boolean, text, text, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.companion_operator_set_profile(uuid, integer, boolean, text, text, text, text, integer, text) to service_role;
