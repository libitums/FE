-- 다시 돌아오기 알림 예약입니다(ADR-0034). **마이그레이션이 아닙니다** — `send-push`를 배포하고 Vault에
-- service role 키를 넣은 뒤 SQL 편집기에서 한 번 실행합니다(README 「send-push」). 다시 실행하면 같은 이름의
-- 예약을 덮어씁니다.
--
-- 매일 10:00 UTC(한국 19:00)에 두 번 부릅니다 — 정확히 3일 · 7일 전 하루 동안 마지막으로 앱을 연 사용자.
-- 사전 준비:
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--   select vault.create_secret('<service role 키>', 'send_push_service_role_key');

select cron.schedule(
  'send-push-reengagement',
  '0 10 * * *',
  $$
  select net.http_post(
    url := 'https://wgwnitgyotyvixozwrzu.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'send_push_service_role_key'
      )
    ),
    body := jsonb_build_object('kind', 'reengagement', 'days', days)
  )
  from (values (3), (7)) as schedule (days);
  $$
);
