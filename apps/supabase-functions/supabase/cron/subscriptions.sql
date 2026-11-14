-- 구독 매달 엽전 예약 작업(ADR-0144). **마이그레이션이 아닙니다** — `20261129120000_subscriptions.sql`을 적용한 뒤 SQL 편집기에서
-- 한 번 실행합니다. 다시 실행하면 같은 이름의 예약을 덮어씁니다. 사전 준비: create extension if not exists pg_cron;
--
-- 월간 구독은 갱신 웹훅 때 그달 몫을 받지만, 연간 구독은 웹훅이 1년에 한 번이라 다음 달 몫을 이 작업이 줍니다.
-- 같은 (사용자, 권한, 기간 시작, 달)은 한 번만 지급됩니다(`grant_once`) — 여러 번 돌아도 안전합니다.

-- 매일 00:10 UTC.
select cron.schedule(
  'companion-grant-plan-coins',
  '10 0 * * *',
  $$ select public.companion_grant_due_plan_coins(now()); $$
);
