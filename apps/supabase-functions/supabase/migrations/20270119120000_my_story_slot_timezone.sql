-- 내 스토리 올리기 창의 시간대(ADR-0211, ADR-0191 D8 개정).
--
-- 운영 2026-11-27: 16:30 KST에 올린 사진 스토리가 아침 창으로 잡혔다. 기기는 맞는 시차(+540)를 보냈지만 `companion.user_timezone`이
-- 학습 프로필 나라(레슨 문장에 들어가는 자기소개 나라 — 그때 KR이 아니었다)로 시간대를 정해 기기 시차를 보지 않았다.
--
-- 판정 순서를 바꾼다:
--   1. 저장된 IANA 시간대(`companion.profiles.timezone`)
--   2. 기기 시차(분) — 0이 아니고 -720 ~ 840일 때만. 0은 「모름」으로 본다(기기가 못 읽었을 때와 UTC+0 나라를 가릴 수 없다 —
--      UTC+0 나라는 3의 나라 시간대가 같은 답을 낸다).
--   3. 스토어 나라의 대표 시간대 — 요청의 `p_region`(앱 · Edge가 보낸 스토어 계정 나라), 없으면 저장된 `last_region`
--   4. 학습 프로필 나라의 대표 시간대
--   5. UTC
--
-- `companion.user_timezone`과 `companion.country_timezone`은 바꾸지 않는다 — 스토리 알림 · 선톡 대상이 그것으로 정해진다.
-- 스토어 나라 표는 `country_timezone`에 내 스토리 전용 보충(스페인어권 · 마카오 등)을 더한 것이다.
--
-- 공개 RPC 여섯(목록 · 단어/카드 올리기 · 사진 문/저장 · 글 문/저장)에 `p_region text default null`을 붙인다. 본문은 그대로 두고
-- 인자와 창 호출 두 곳만 바꾼다(20270104130000 · 20270107130000과 같은 방식) — 옛 앱 · 옛 Edge(인자 없음)도 그대로 부른다.

-- ------------------------------------------------------------------ 스토어 나라 → 대표 시간대

-- 나라(ISO 3166-1 alpha-2, 대소문자 무관) → 대표 시간대. 여러 시간대 나라는 인구 대표(US 동부 · BR 상파울루 · ID 자카르타 ·
-- MX 멕시코시티 · RU 모스크바 · AU 시드니 · CA 토론토). 모르는 나라 · 틀린 형식은 null.
create function companion.story_country_timezone(p_country text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when coalesce(p_country, '') ~ '^[A-Za-z]{2}$' then coalesce(
    companion.country_timezone(upper(p_country)),
    case upper(p_country)
      -- 스페인어권(앱 es 화면) — 기본 표에 없는 나라.
      when 'BO' then 'America/La_Paz'
      when 'CR' then 'America/Costa_Rica'
      when 'CU' then 'America/Havana'
      when 'DO' then 'America/Santo_Domingo'
      when 'EC' then 'America/Guayaquil'
      when 'GT' then 'America/Guatemala'
      when 'HN' then 'America/Tegucigalpa'
      when 'NI' then 'America/Managua'
      when 'PA' then 'America/Panama'
      when 'PR' then 'America/Puerto_Rico'
      when 'PY' then 'America/Asuncion'
      when 'SV' then 'America/El_Salvador'
      when 'UY' then 'America/Montevideo'
      when 'VE' then 'America/Caracas'
      -- 번체 중국어(zh-TW 화면) · 동남아 · 그 밖에 학습자가 있는 나라.
      when 'MO' then 'Asia/Macau'
      when 'BN' then 'Asia/Brunei'
      when 'LA' then 'Asia/Vientiane'
      when 'TL' then 'Asia/Dili'
      when 'MN' then 'Asia/Ulaanbaatar'
      when 'KZ' then 'Asia/Almaty'
      when 'IR' then 'Asia/Tehran'
      when 'IQ' then 'Asia/Baghdad'
      when 'NZ' then 'Pacific/Auckland'
      when 'PT' then 'Europe/Lisbon'
      when 'NL' then 'Europe/Amsterdam'
      when 'BE' then 'Europe/Brussels'
      when 'CH' then 'Europe/Zurich'
      when 'PL' then 'Europe/Warsaw'
      when 'SE' then 'Europe/Stockholm'
      when 'MA' then 'Africa/Casablanca'
      when 'GH' then 'Africa/Accra'
      when 'ZA' then 'Africa/Johannesburg'
    end
  ) end
$$;
revoke all on function companion.story_country_timezone(text) from public;

-- ------------------------------------------------------------------ 창

drop function companion.my_story_window(uuid, integer, timestamptz);

-- 지금의 올리기 창(ADR-0191 D8) — { slot, day(창이 속한 현지 날), nextAt(다음 창이 열리는 때), used }.
-- 시간대는 위 판정 순서. 밤 창은 자정을 넘는다 — 새벽(아침 창 전)은 전날의 밤 창이다.
create function companion.my_story_window(
  p_user_id uuid,
  p_tz_offset_min integer,
  p_now timestamptz,
  p_region text default null
)
returns jsonb language plpgsql stable as $$
declare
  v_offset integer := case when p_tz_offset_min between -720 and 840 and p_tz_offset_min <> 0 then p_tz_offset_min end;
  v_tz text;
  v_last_region text;
  v_morning integer := companion.my_story_rule('morningStart', 4)::integer;
  v_day integer := companion.my_story_rule('dayStart', 12)::integer;
  v_night integer := companion.my_story_rule('nightStart', 18)::integer;
  v_local timestamp;
  v_hour integer;
  v_slot text;
  v_slot_day date;
  v_next timestamp;
begin
  -- 프로필은 한 번만 읽는다(저장된 시간대 · 스토어 나라).
  select p.timezone, p.last_region into v_tz, v_last_region from companion.profiles p where p.user_id = p_user_id;
  if v_tz is null and v_offset is null then
    v_tz := coalesce(
      companion.story_country_timezone(p_region),
      companion.story_country_timezone(v_last_region),
      companion.country_timezone((select lp.country_code from public.learner_profiles lp where lp.user_id = p_user_id))
    );
  end if;
  v_offset := coalesce(v_offset, 0);
  v_local := case when v_tz is null then (p_now at time zone 'UTC') + make_interval(mins => v_offset)
    else p_now at time zone v_tz end;
  v_hour := extract(hour from v_local)::integer;
  if v_hour < v_morning then
    v_slot := 'night'; v_slot_day := v_local::date - 1;
    v_next := v_local::date + make_interval(hours => v_morning);
  elsif v_hour < v_day then
    v_slot := 'morning'; v_slot_day := v_local::date;
    v_next := v_local::date + make_interval(hours => v_day);
  elsif v_hour < v_night then
    v_slot := 'day'; v_slot_day := v_local::date;
    v_next := v_local::date + make_interval(hours => v_night);
  else
    v_slot := 'night'; v_slot_day := v_local::date;
    v_next := v_local::date + 1 + make_interval(hours => v_morning);
  end if;
  return jsonb_build_object(
    'slot', v_slot,
    'day', v_slot_day,
    'nextAt', companion.story_time(case when v_tz is null
      then (v_next - make_interval(mins => v_offset)) at time zone 'UTC' else v_next at time zone v_tz end),
    'used', exists (
      select 1 from companion.my_story_slots s
      where s.user_id = p_user_id and s.local_day = v_slot_day and s.slot = v_slot
    )
  );
end;
$$;
revoke all on function companion.my_story_window(uuid, integer, timestamptz, text) from public;

-- ------------------------------------------------------------------ RPC 여섯 — `p_region` 인자

-- 정의를 읽어 마지막 인자 뒤에 `p_region`을 붙이고, 창 호출에 넘긴다. 옛 서명은 지운다(같은 이름 · 기본값 인자가 겹치면 부를 때 모호하다).
do $$
declare
  v_fn regprocedure;
  v_def text;
  v_new text;
begin
  foreach v_fn in array array[
    'public.companion_my_stories(integer)'::regprocedure,
    'public.companion_post_my_story(uuid, text, jsonb, text, text, text, text, text, text, integer)'::regprocedure,
    'public.companion_my_photo_gate(uuid, uuid, integer, timestamptz)'::regprocedure,
    'public.companion_save_my_photo_story(uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, text, integer, timestamptz)'::regprocedure,
    'public.companion_my_text_gate(uuid, uuid, integer, timestamptz)'::regprocedure,
    'public.companion_save_my_text_story(uuid, uuid, text, text, jsonb, text, integer, timestamptz)'::regprocedure
  ] loop
    v_def := pg_get_functiondef(v_fn);
    v_new := regexp_replace(v_def, E'\\)\\n RETURNS jsonb', E', p_region text DEFAULT NULL::text)\n RETURNS jsonb');
    v_new := regexp_replace(
      v_new,
      'companion\.my_story_window\(([a-z_]+), p_tz_offset_min, ([a-z_]+|now\(\))\)',
      'companion.my_story_window(\1, p_tz_offset_min, \2, p_region)',
      'g'
    );
    -- 인자가 붙었고, 창 호출이 하나 이상이며 모두 `p_region`을 넘기는지 본다.
    if position('p_region text DEFAULT NULL::text)' in v_new) = 0
      or (select count(*) from regexp_matches(v_new, 'my_story_window\(', 'g')) = 0
      or (select count(*) from regexp_matches(v_new, 'my_story_window\(', 'g'))
        <> (select count(*) from regexp_matches(v_new, ', p_region\)', 'g')) then
      raise exception '%: definition not rewritten', v_fn;
    end if;
    execute format('drop function %s', v_fn);
    execute v_new;
  end loop;
end $$;

-- ------------------------------------------------------------------ 권한(옛 서명과 같게)

revoke all on function public.companion_my_stories(integer, text) from public, anon;
revoke all on function public.companion_post_my_story(uuid, text, jsonb, text, text, text, text, text, text, integer, text)
  from public, anon;
revoke all on function public.companion_my_photo_gate(uuid, uuid, integer, timestamptz, text) from public, anon, authenticated;
revoke all on function public.companion_save_my_photo_story(uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, text, integer, timestamptz, text)
  from public, anon, authenticated;
revoke all on function public.companion_my_text_gate(uuid, uuid, integer, timestamptz, text) from public, anon, authenticated;
revoke all on function public.companion_save_my_text_story(uuid, uuid, text, text, jsonb, text, integer, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.companion_my_stories(integer, text) to authenticated;
grant execute on function public.companion_post_my_story(uuid, text, jsonb, text, text, text, text, text, text, integer, text)
  to authenticated;
grant execute on function public.companion_my_photo_gate(uuid, uuid, integer, timestamptz, text) to service_role;
grant execute on function public.companion_save_my_photo_story(uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, text, integer, timestamptz, text)
  to service_role;
grant execute on function public.companion_my_text_gate(uuid, uuid, integer, timestamptz, text) to service_role;
grant execute on function public.companion_save_my_text_story(uuid, uuid, text, text, jsonb, text, integer, timestamptz, text)
  to service_role;
