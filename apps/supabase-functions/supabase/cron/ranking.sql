-- 주간 순위 정산 예약 작업(ADR-0170). **마이그레이션이 아닙니다** — `20261220120000_weekly_ranking.sql`을 적용한 뒤 SQL 편집기에서
-- 한 번 실행합니다. 다시 실행하면 같은 이름의 예약을 덮어씁니다. 사전 준비: create extension if not exists pg_cron;
--
-- 매주 월 00:05 UTC에 막 끝난 지난주(월요일 날짜)를 정산합니다. 보상이 꺼져 있으면(`ranking.settings.reward_enabled`, 기본 false)
-- 아무것도 하지 않고 0을 돌려줍니다. 켜져 있으면 그룹 · 보드마다 1~3위에 `reward_amount` 엽전 — 같은 (주, 보드, 사용자)는 한 번만
-- 지급됩니다(`grant_once`) — 여러 번 돌아도 안전합니다.

select cron.schedule(
  'ranking-settle-week',
  '5 0 * * 1',
  $$ select public.ranking_settle_week(date_trunc('week', now() at time zone 'utc')::date - 7); $$
);
