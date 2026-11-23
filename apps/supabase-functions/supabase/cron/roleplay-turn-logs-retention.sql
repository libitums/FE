-- 롤플레이 턴 로그의 보관 1년 예약입니다(ADR-0161). **마이그레이션이 아닙니다** — 마이그레이션
-- 20270101120000_roleplay_turn_logs.sql을 적용한 뒤 SQL 편집기에서 한 번 실행합니다(README 「roleplay_turn_logs」).
-- 다시 실행하면 같은 이름의 예약을 덮어씁니다.
--
-- 매일 03:40 UTC(한국 12:40)에 1년 넘은 줄을 지웁니다.
-- 사전 준비:
--   create extension if not exists pg_cron;

select cron.schedule(
  'roleplay-turn-logs-retention',
  '40 3 * * *',
  $$ select public.purge_roleplay_turn_logs(); $$
);
