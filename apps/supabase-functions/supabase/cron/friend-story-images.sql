-- 친구 스토리 그림 일꾼 예약 작업입니다(ADR-0192 D4 · D5). **마이그레이션이 아닙니다** — 마이그레이션 20270105120000과 `companion-story-images`를
-- 배포한 뒤 SQL 편집기에서 한 번 실행합니다(README 「친구 스토리 — AI 생성」). 다시 실행하면 같은 이름의 예약을 덮어씁니다.
-- 실행 전에 아래 `<project-ref>`를 프로젝트 ref로 바꿉니다. 서버 키 비밀(`companion_service_role_key`)은 컴패니언 예약 작업(`companion.sql`)과 같습니다.
--
-- 매분: 기획 승인된 초안(queued)을 올릴 날이 가까운 것부터 둘까지 그린다(한 장에 1분 안팎). 대기 줄이 없으면 RPC 한 번으로 끝난다.
-- 회차가 겹쳐도 같은 초안을 두 번 그리지 않는다(claim이 줄을 잠근다). 닫지 못하고 죽은 줄은 10분 뒤 다시 고른다.
select cron.schedule(
  'companion-story-images',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/companion-story-images',
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
