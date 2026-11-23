-- 친구 스토리 예약 작업입니다(ADR-0178). **마이그레이션이 아닙니다** — 마이그레이션 20261228120000 · 20261228130000과 `companion-stories`를
-- 배포한 뒤 SQL 편집기에서 한 번 실행합니다(README 「친구 스토리」). 다시 실행하면 같은 이름의 예약을 덮어씁니다.
-- 실행 전에 아래 `<project-ref>`를 프로젝트 ref로 바꿉니다. 서버 키 비밀(`companion_service_role_key`)은 컴패니언 예약 작업(`companion.sql`)과 같습니다.
--
-- 매시 5분: 올림(인물마다 UTC 하루 하나, 올림 시각 UTC 01 ~ 10시) → 알림 후보 → 사람마다 한 통. 스위치(`settings.friend_stories` ·
-- `settings.story_push`)가 off면 아무것도 올리거나 보내지 않습니다. 선톡(매시 30분)과 겹치지 않게 5분에 돕니다.
select cron.schedule(
  'companion-stories',
  '5 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/companion-stories',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'companion_service_role_key'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);
