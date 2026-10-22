-- 웹 체험판 인식 글자 수집의 보관 90일 예약입니다(ADR-0083 D19). **마이그레이션이 아닙니다** — 마이그레이션
-- 20261022130000_trial_speech_samples.sql을 적용한 뒤 SQL 편집기에서 한 번 실행합니다(README 「trial_speech_samples」).
-- 다시 실행하면 같은 이름의 예약을 덮어씁니다.
--
-- 매일 03:30 UTC(한국 12:30)에 90일 넘은 행을 지웁니다.
-- 사전 준비:
--   create extension if not exists pg_cron;

select cron.schedule(
  'trial-speech-samples-retention',
  '30 3 * * *',
  $$ select public.purge_trial_speech_samples(); $$
);
