-- AI 컴패니언 예약 작업입니다. **마이그레이션이 아닙니다** — 컴패니언 마이그레이션과 `companion-proactive`를 배포한 뒤
-- SQL 편집기에서 한 번 실행합니다(README 「AI 컴패니언」). 다시 실행하면 같은 이름의 예약을 덮어씁니다.
-- 실행 전에 아래 `<project-ref>`를 프로젝트 ref로 바꿉니다.
--
-- 사전 준비(이미 했으면 건너뜀):
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--   select vault.create_secret('<service role 키>', 'companion_service_role_key');
--   레거시 service_role 키(eyJ…)든 새 비밀 키(sb_secret_…)든 된다 — 런타임 키와 다르면 함수가 Auth에 물어 확인한다.

-- 닫히지 않은 크레딧 예약 해제(서버가 턴 중간에 죽은 경우) — 5분마다, 10분 넘은 것.
select cron.schedule(
  'companion-release-stale-holds',
  '*/5 * * * *',
  $$ select public.companion_release_stale_holds(interval '10 minutes'); $$
);

-- 구독 크레딧 소멸 — 매시 정각.
select cron.schedule(
  'companion-expire-sub-credits',
  '0 * * * *',
  $$ select public.companion_expire_sub_credits(now()); $$
);

-- 선톡 — 매시 30분, 후보 20개까지. 공백 · 하루 상한 · 연령 규칙은 companion.settings와 후보 함수가 정한다.
-- ⚠ 푸시는 아직 나가지 않는다(send-push에 컴패니언 목적지가 없다). 메시지는 저장되어 앱의 다음 조회에 보인다.
select cron.schedule(
  'companion-proactive',
  '30 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/companion-proactive',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'companion_service_role_key'
      )
    ),
    body := jsonb_build_object('batch', 20)
  );
  $$
);
