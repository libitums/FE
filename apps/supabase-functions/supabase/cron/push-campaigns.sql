-- 자동 푸시 캠페인 예약입니다(ADR-0130 D12). **마이그레이션이 아닙니다** — 마이그레이션 `push_campaigns`를 적용하고
-- `push-campaigns` 함수를 배포한 뒤 SQL 편집기에서 한 번 실행합니다. 다시 실행하면 같은 이름의 예약을 덮어씁니다.
-- 실행 전에 아래 `<project-ref>`를 프로젝트 ref로 바꿉니다. Vault 키는 다시 돌아오기 예약과 같은 것을 씁니다.
--
-- 매시 5분에 부릅니다. 함수가 현지 20시에 든 사람만 고르므로 시간대마다 하루 한 번 저녁에 닿습니다.
-- 끄기: select cron.unschedule('push-campaigns-hourly');

select cron.schedule(
  'push-campaigns-hourly',
  '5 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/push-campaigns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'send_push_service_role_key'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
