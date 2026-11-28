-- AI 컴패니언 2단계 — 롤플레이 미션 예약 작업입니다. **마이그레이션이 아닙니다** — `20270122120000_companion_mission.sql`을 적용한 뒤
-- SQL 편집기에서 한 번 실행합니다(README 「롤플레이 미션 DB」). 다시 실행하면 같은 이름의 예약을 덮어씁니다.
-- 운영에는 1단계 마이그레이션 기록이 정리될 때까지 적용하지 않습니다(PRD §0.9).
--
-- 사전 준비(이미 했으면 건너뜀): create extension if not exists pg_cron;

-- 방치된 판 닫기 — 5분마다. 마지막 메시지 뒤 `settings.mission_stale_after`(기본 30분)가 지난 진행 중인 판을 그만둠(stale)으로 닫고
-- 판 단위 예약을 확정한다(돌려주지 않는다 — PRD §3.6). 채점이 실패해 값을 이미 돌려준 판은 건드리지 않는다.
-- 판 단위 예약은 `companion-release-stale-holds`(10분 넘은 열린 예약 해제)가 건드리지 않는다 — 이 작업만 닫는다.
select cron.schedule(
  'companion-close-stale-missions',
  '*/5 * * * *',
  $$ select public.companion_close_stale_missions(now()); $$
);
