-- 학습 보상은 배포 콘텐츠에 있는 유닛에만(2026-11-14, ADR-0146 — 보안 리뷰 H4).
--
-- 문제: `companion_claim_coins()`(20261127)는 사용자 자신의 진행 스냅숏(catalogProgress ∪ coinUnits)에 있는 (에피소드, 유닛) 문자열마다
-- 학습 보상을 줬고, 확인은 길이뿐이었다. `save_learning_progress`는 JSON 모양만 보므로 로그인한 누구나 임의 키를 저장해 엽전을
-- 끝없이 받을 수 있었다(엽전은 컴패니언 대화에 쓰인다).
--
-- 1. `companion.content_units` — 보상 받을 수 있는 (에피소드 id, 유닛 키). 추가만 한다(콘텐츠에서 빠져도 이미 깬 사용자가 있어 지우지 않음).
--    표지 `intro` · 막간 `INT`는 check가 막는다. 앱은 닿지 않는다(companion 스키마 · RLS 정책 없음 · service_role만).
-- 2. 시드 = 버킷의 모든 매니페스트(manifest.json · manifests/level-2 ~ 5.json, 2026-11-14 확인 — level-5 generated_at
--    2026-11-13T04:00:00Z) 본문 74개의 보상 유닛 174행 + 옛 내장판에서만 깰 수 있던 id 13행(u00 S4 ~ S13 · u01 ~ u03 S9) = 187행.
--    새 에피소드 · 유닛을 올리면 `node devtools/content/content-units-sql.mjs --base …`가 내는 SQL을 적용한다(episode-content-json-contract.md 13절 규칙 11).
-- 3. 지급 함수는 진행 스냅숏의 후보를 이 표와 조인한 것만 준다. 그 밖(멱등 ref · 출시 보너스 · 반환 모양)은 그대로.

create table companion.content_units (
  episode_id text not null check (episode_id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  unit_key text not null check (unit_key ~ '^[A-Za-z0-9_-]{1,16}$' and unit_key not in ('intro', 'INT')),
  added_at timestamptz not null default now(),
  primary key (episode_id, unit_key)
);
alter table companion.content_units enable row level security;
revoke all on companion.content_units from public, anon, authenticated;
grant select, insert, update, delete on companion.content_units to service_role;

-- 버킷의 모든 매니페스트(`node devtools/content/content-units-sql.mjs --base …/content/`, 2026-11-14) — 174행.
insert into companion.content_units (episode_id, unit_key) values
  ('u00-tutorial', 'RP'),
  ('u00-tutorial', 'S1'),
  ('u00-tutorial', 'S2'),
  ('u00-tutorial', 'S3'),
  ('u01-water', 'CULT'),
  ('u01-water', 'RP'),
  ('u01-water', 'S1'),
  ('u01-water', 'S2'),
  ('u01-water', 'S3'),
  ('u01-water', 'S4'),
  ('u01-water', 'S5'),
  ('u01-water', 'S6'),
  ('u01-water', 'S7'),
  ('u01-water', 'S8'),
  ('u02-checkin', 'CULT'),
  ('u02-checkin', 'RP'),
  ('u02-checkin', 'S1'),
  ('u02-checkin', 'S2'),
  ('u02-checkin', 'S3'),
  ('u02-checkin', 'S4'),
  ('u02-checkin', 'S5'),
  ('u02-checkin', 'S6'),
  ('u02-checkin', 'S7'),
  ('u02-checkin', 'S8'),
  ('u03-mina', 'CULT'),
  ('u03-mina', 'RP'),
  ('u03-mina', 'S1'),
  ('u03-mina', 'S2'),
  ('u03-mina', 'S3'),
  ('u03-mina', 'S4'),
  ('u03-mina', 'S5'),
  ('u03-mina', 'S6'),
  ('u03-mina', 'S7'),
  ('u03-mina', 'S8'),
  ('u04-directions', 'CULT'),
  ('u04-directions', 'RP'),
  ('u04-directions', 'S1'),
  ('u04-directions', 'S2'),
  ('u04-directions', 'S3'),
  ('u04-directions', 'S4'),
  ('u04-directions', 'S5'),
  ('u04-directions', 'S6'),
  ('u04-directions', 'S7'),
  ('u04-directions', 'S8'),
  ('u05-baekban', 'CULT'),
  ('u05-baekban', 'RP'),
  ('u05-baekban', 'S1'),
  ('u05-baekban', 'S2'),
  ('u05-baekban', 'S3'),
  ('u05-baekban', 'S4'),
  ('u05-baekban', 'S5'),
  ('u05-baekban', 'S6'),
  ('u05-baekban', 'S7'),
  ('u05-baekban', 'S8'),
  ('u06-cafe', 'CULT'),
  ('u06-cafe', 'RP'),
  ('u06-cafe', 'S1'),
  ('u06-cafe', 'S2'),
  ('u06-cafe', 'S3'),
  ('u06-cafe', 'S4'),
  ('u06-cafe', 'S5'),
  ('u06-cafe', 'S6'),
  ('u06-cafe', 'S7'),
  ('u06-cafe', 'S8'),
  ('u07-jaemin', 'CULT'),
  ('u07-jaemin', 'RP'),
  ('u07-jaemin', 'S1'),
  ('u07-jaemin', 'S2'),
  ('u07-jaemin', 'S3'),
  ('u07-jaemin', 'S4'),
  ('u07-jaemin', 'S5'),
  ('u07-jaemin', 'S6'),
  ('u07-jaemin', 'S7'),
  ('u07-jaemin', 'S8'),
  ('u08-umbrella', 'CULT'),
  ('u08-umbrella', 'RP'),
  ('u08-umbrella', 'S1'),
  ('u08-umbrella', 'S2'),
  ('u08-umbrella', 'S3'),
  ('u08-umbrella', 'S4'),
  ('u08-umbrella', 'S5'),
  ('u08-umbrella', 'S6'),
  ('u08-umbrella', 'S7'),
  ('u08-umbrella', 'S8'),
  ('u09-subway', 'CULT'),
  ('u09-subway', 'RP'),
  ('u09-subway', 'S1'),
  ('u09-subway', 'S2'),
  ('u09-subway', 'S3'),
  ('u09-subway', 'S4'),
  ('u09-subway', 'S5'),
  ('u09-subway', 'S6'),
  ('u09-subway', 'S7'),
  ('u09-subway', 'S8'),
  ('u10-laundry', 'CULT'),
  ('u10-laundry', 'RP'),
  ('u10-laundry', 'S1'),
  ('u10-laundry', 'S2'),
  ('u10-laundry', 'S3'),
  ('u10-laundry', 'S4'),
  ('u10-laundry', 'S5'),
  ('u10-laundry', 'S6'),
  ('u10-laundry', 'S7'),
  ('u10-laundry', 'S8'),
  ('u11-bookstore', 'CULT'),
  ('u11-bookstore', 'RP'),
  ('u11-bookstore', 'S1'),
  ('u11-bookstore', 'S2'),
  ('u11-bookstore', 'S3'),
  ('u11-bookstore', 'S4'),
  ('u11-bookstore', 'S5'),
  ('u11-bookstore', 'S6'),
  ('u11-bookstore', 'S7'),
  ('u11-bookstore', 'S8'),
  ('u12-cafe-missed', 'CULT'),
  ('u12-cafe-missed', 'RP'),
  ('u12-cafe-missed', 'S1'),
  ('u12-cafe-missed', 'S2'),
  ('u12-cafe-missed', 'S3'),
  ('u12-cafe-missed', 'S4'),
  ('u12-cafe-missed', 'S5'),
  ('u12-cafe-missed', 'S6'),
  ('u12-cafe-missed', 'S7'),
  ('u12-cafe-missed', 'S8'),
  ('u13-pajeon', 'CULT'),
  ('u13-pajeon', 'RP'),
  ('u13-pajeon', 'S1'),
  ('u13-pajeon', 'S2'),
  ('u13-pajeon', 'S3'),
  ('u13-pajeon', 'S4'),
  ('u13-pajeon', 'S5'),
  ('u13-pajeon', 'S6'),
  ('u13-pajeon', 'S7'),
  ('u13-pajeon', 'S8'),
  ('u14-hanbok', 'CULT'),
  ('u14-hanbok', 'RP'),
  ('u14-hanbok', 'S1'),
  ('u14-hanbok', 'S2'),
  ('u14-hanbok', 'S3'),
  ('u14-hanbok', 'S4'),
  ('u14-hanbok', 'S5'),
  ('u14-hanbok', 'S6'),
  ('u14-hanbok', 'S7'),
  ('u14-hanbok', 'S8'),
  ('u15-changdeokgung', 'CULT'),
  ('u15-changdeokgung', 'RP'),
  ('u15-changdeokgung', 'S1'),
  ('u15-changdeokgung', 'S2'),
  ('u15-changdeokgung', 'S3'),
  ('u15-changdeokgung', 'S4'),
  ('u15-changdeokgung', 'S5'),
  ('u15-changdeokgung', 'S6'),
  ('u15-changdeokgung', 'S7'),
  ('u15-changdeokgung', 'S8'),
  ('u16-umbrella-return', 'CULT'),
  ('u16-umbrella-return', 'RP'),
  ('u16-umbrella-return', 'S1'),
  ('u16-umbrella-return', 'S2'),
  ('u16-umbrella-return', 'S3'),
  ('u16-umbrella-return', 'S4'),
  ('u16-umbrella-return', 'S5'),
  ('u16-umbrella-return', 'S6'),
  ('u16-umbrella-return', 'S7'),
  ('u16-umbrella-return', 'S8'),
  ('u17-samgyeopsal', 'CULT'),
  ('u17-samgyeopsal', 'RP'),
  ('u17-samgyeopsal', 'S1'),
  ('u17-samgyeopsal', 'S2'),
  ('u17-samgyeopsal', 'S3'),
  ('u17-samgyeopsal', 'S4'),
  ('u17-samgyeopsal', 'S5'),
  ('u17-samgyeopsal', 'S6'),
  ('u17-samgyeopsal', 'S7'),
  ('u17-samgyeopsal', 'S8')
on conflict do nothing;

-- 옛 내장판(apps/mobile/content/episodes git 이력)에서만 깰 수 있던 id — 카탈로그 u00 첫 판(S1 ~ S13 · RP)과 u01 ~ u03 초기판의 S9. 13행.
insert into companion.content_units (episode_id, unit_key) values
  ('u00-tutorial', 'S4'),
  ('u00-tutorial', 'S5'),
  ('u00-tutorial', 'S6'),
  ('u00-tutorial', 'S7'),
  ('u00-tutorial', 'S8'),
  ('u00-tutorial', 'S9'),
  ('u00-tutorial', 'S10'),
  ('u00-tutorial', 'S11'),
  ('u00-tutorial', 'S12'),
  ('u00-tutorial', 'S13'),
  ('u01-water', 'S9'),
  ('u02-checkin', 'S9'),
  ('u03-mina', 'S9')
on conflict do nothing;

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
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select * into s from companion.settings;
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
    -- 배포 콘텐츠에 있는 유닛만(ADR-0146). 표의 check가 intro · INT · 길이를 이미 막지만 제외 규칙은 여기도 적어 둔다.
    join companion.content_units cu on cu.episode_id = src.episode and cu.unit_key = src.unit
    where src.unit not in ('intro', 'INT')
  loop
    if companion.grant_once(v_user, s.learning_reward, 'learning', v_user::text || ':' || v_unit.episode || ':' || v_unit.unit) then
      v_learning := v_learning + s.learning_reward;
    end if;
  end loop;
  if companion.grant_once(v_user, s.launch_bonus, 'launch_bonus', v_user::text || ':2026-11') then
    v_bonus := s.launch_bonus;
  end if;
  return jsonb_build_object('learning', v_learning, 'bonus', v_bonus, 'wallet', companion.wallet_json(v_user, now()));
end;
$$;
revoke all on function public.companion_claim_coins() from public, anon;
grant execute on function public.companion_claim_coins() to authenticated;
