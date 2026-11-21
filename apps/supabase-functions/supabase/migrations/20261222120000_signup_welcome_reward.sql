-- 가입 보상(2026-11-21, ADR-0174): 새 계정에 엽전 100을 한 번 — 서버가 주고 서버가 중복을 막는다.
--
-- 1. 설정: `signup_reward`(100, 0이면 끔) · `signup_reward_since`(이 마이그레이션을 적용한 시각 — 그 전에 만든 계정은 기존 회원이라 받지 않는다).
-- 2. `public.companion_claim_signup_reward()`(앱이 부름, 로그인 필수, 멱등): 이미 받음 → already_claimed · 끔 → disabled · 익명 → anonymous ·
--    도입 전 계정 → existing_account · 같은 신원이 이미 받음 → identity_used · 아니면 grant 버킷에 지급(`grant_once`, reason `signup`, ref = 사용자 id).
--    돌려주는 값: { granted(이번에 더한 수), reason, wallet }.
-- 3. 재가입 막기: 받은 계정의 신원 키(로그인 제공자 id · 이메일 · 전화)를 솔트 해시로 `companion.signup_reward_keys`에 남긴다. 사용자 FK가 없어
--    탈퇴(auth.users 삭제 → 원장 cascade) 뒤에도 남고, 같은 신원으로 새로 만든 계정은 받지 못한다. 원문은 저장하지 않는다.
--    못 막는 것: 다른 Google · Apple 계정 · 다른 이메일 · 다른 전화로 만든 새 계정(기기 식별자를 서버가 받지 않는다 — ADR-0174 「대가」).
-- 4. 출시 보너스(ADR-0140 launch_bonus 100)는 기존 회원만(2026-11-21 사용자 결정): `companion_claim_coins()`가 같은 기준 시각
--    `signup_reward_since` 뒤에 만든 계정에는 보너스를 주지 않는다 — 새 계정은 가입 보상 100만. 학습 보상(레슨당 5)은 그대로.
--    응답에 `newAccount`(기준 시각 뒤 계정인가)를 더해 앱이 새 계정에 엽전 출시 모달을 띄우지 않게 한다.

alter table companion.settings
  add column signup_reward integer not null default 100 check (signup_reward between 0 and 100000),
  add column signup_reward_since timestamptz;
update companion.settings set signup_reward_since = now();

-- 해시 솔트(한 행). 앱 역할은 읽지 못한다 — 키 표만 새어도 이메일 사전 대입으로 되돌리기 어렵게.
create table companion.signup_reward_salt (
  id boolean primary key default true check (id),
  salt text not null
);
insert into companion.signup_reward_salt (salt)
values (encode(sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text || clock_timestamp()::text, 'UTF8')), 'hex'));
alter table companion.signup_reward_salt enable row level security;
revoke all on companion.signup_reward_salt from public, anon, authenticated;

create table companion.signup_reward_keys (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  claimed_at timestamptz not null default now()
);
alter table companion.signup_reward_keys enable row level security;
revoke all on companion.signup_reward_keys from public, anon, authenticated;
grant select, delete on companion.signup_reward_keys to service_role;

-- 사용자의 신원 키 해시(내부). 이메일 · 전화 로그인은 provider_id가 사용자 id라 제공자 신원에서 빼고 이메일 · 전화 값으로 센다.
create function companion.signup_identity_hashes(p_user_id uuid)
returns text[] language sql stable as $$
  with salt as (select salt from companion.signup_reward_salt),
  keys as (
    select i.provider || ':' || i.provider_id as k
    from auth.identities i
    where i.user_id = p_user_id and i.provider not in ('email', 'phone') and coalesce(i.provider_id, '') <> ''
    union
    select 'email:' || lower(btrim(u.email)) from auth.users u where u.id = p_user_id and coalesce(btrim(u.email), '') <> ''
    union
    select 'phone:' || regexp_replace(u.phone, '[^0-9]', '', 'g') from auth.users u
    where u.id = p_user_id and coalesce(regexp_replace(u.phone, '[^0-9]', '', 'g'), '') <> ''
  )
  select coalesce(array_agg(encode(sha256(convert_to((select salt from salt) || '|' || k, 'UTF8')), 'hex') order by k), '{}')
  from keys
$$;
revoke all on function companion.signup_identity_hashes(uuid) from public;

create function public.companion_claim_signup_reward()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  s companion.settings;
  v_created timestamptz;
  v_anonymous boolean;
  v_keys text[];
  v_reason text;
  v_granted integer := 0;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select * into s from companion.settings;
  select created_at, coalesce(is_anonymous, false) into v_created, v_anonymous from auth.users where id = v_user;
  -- 같은 신원의 두 계정이 동시에 부르는 경합을 줄 세운다(키 확인 → 지급 → 키 저장이 한 덩어리).
  perform pg_advisory_xact_lock(hashtext('companion.signup_reward'));
  v_keys := companion.signup_identity_hashes(v_user);
  if exists (
    select 1 from companion.credit_ledger where kind = 'grant' and reason = 'signup' and ref_id = v_user::text
  ) then
    v_reason := 'already_claimed';
  elsif s.signup_reward <= 0 then
    v_reason := 'disabled';
  elsif v_anonymous then
    v_reason := 'anonymous';
  elsif v_created is null or s.signup_reward_since is null or v_created < s.signup_reward_since then
    v_reason := 'existing_account';
  elsif exists (select 1 from companion.signup_reward_keys where key_hash = any (v_keys)) then
    v_reason := 'identity_used';
  elsif companion.grant_once(v_user, s.signup_reward, 'signup', v_user::text) then
    insert into companion.signup_reward_keys (key_hash) select unnest(v_keys) on conflict do nothing;
    v_reason := 'granted';
    v_granted := s.signup_reward;
  else
    v_reason := 'already_claimed';
  end if;
  return jsonb_build_object('granted', v_granted, 'reason', v_reason, 'wallet', companion.wallet_json(v_user, now()));
end;
$$;
revoke all on function public.companion_claim_signup_reward() from public, anon;
grant execute on function public.companion_claim_signup_reward() to authenticated;

-- 출시 보너스는 기존 회원만(위 4). 본문은 20261201(배포 콘텐츠 유닛만 학습 보상)과 같고, 보너스 조건과 `newAccount`만 더했다.
create or replace function public.companion_claim_coins()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  s companion.settings;
  v_progress jsonb;
  v_unit record;
  v_learning integer := 0;
  v_bonus integer := 0;
  v_created timestamptz;
  v_new boolean;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select * into s from companion.settings;
  select created_at into v_created from auth.users where id = v_user;
  -- 가입 보상과 같은 기준 시각 — 그 뒤에 만든 계정이 새 계정이다.
  v_new := s.signup_reward_since is not null and v_created is not null and v_created >= s.signup_reward_since;
  select progress into v_progress from public.learning_progress where user_id = v_user;
  for v_unit in
    select distinct src.episode, src.unit from (
      select e.key as episode, u.value as unit
      from jsonb_each(coalesce(v_progress -> 'catalogProgress', '{}'::jsonb)) e
      cross join lateral jsonb_array_elements_text(case when jsonb_typeof(e.value) = 'array' then e.value else '[]'::jsonb end) u
      union all
      select e.key, u.value
      from jsonb_each(coalesce(v_progress -> 'coinUnits', '{}'::jsonb)) e
      cross join lateral jsonb_array_elements_text(case when jsonb_typeof(e.value) = 'array' then e.value else '[]'::jsonb end) u
    ) src
    -- 배포 콘텐츠에 있는 유닛만(ADR-0148). 표의 check가 intro · INT · 길이를 이미 막지만 제외 규칙은 여기도 적어 둔다.
    join companion.content_units cu on cu.episode_id = src.episode and cu.unit_key = src.unit
    where src.unit not in ('intro', 'INT')
  loop
    if companion.grant_once(v_user, s.learning_reward, 'learning', v_user::text || ':' || v_unit.episode || ':' || v_unit.unit) then
      v_learning := v_learning + s.learning_reward;
    end if;
  end loop;
  if not v_new and companion.grant_once(v_user, s.launch_bonus, 'launch_bonus', v_user::text || ':2026-11') then
    v_bonus := s.launch_bonus;
  end if;
  return jsonb_build_object('learning', v_learning, 'bonus', v_bonus, 'newAccount', v_new,
    'wallet', companion.wallet_json(v_user, now()));
end;
$$;
revoke all on function public.companion_claim_coins() from public, anon;
grant execute on function public.companion_claim_coins() to authenticated;
