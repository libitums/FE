-- 내 스토리 반응 예약 작업입니다(ADR-0191). **마이그레이션이 아닙니다** — 마이그레이션 20261228140000과 `companion-story-reactions`를
-- 배포한 뒤 SQL 편집기에서 한 번 실행합니다(README 「내 스토리」). 다시 실행하면 같은 이름의 예약을 덮어씁니다.
-- 실행 전에 아래 `<project-ref>`를 프로젝트 ref로 바꿉니다. 서버 키 비밀(`companion_service_role_key`)은 컴패니언 예약 작업(`companion.sql`)과 같습니다.
--
-- 매분(ADR-0191 D4): 보관을 끈 사람의 지난 스토리 정리 → 때가 된 반응 알람을 한 번에 12개까지 그 인물 방의 메시지로 만들기(시간 예산 40초) → 푸시.
-- 회차가 겹쳐도 같은 알람을 두 번 만들지 않는다(claim이 줄을 잠근다). 스위치(`settings.my_stories` · `settings.story_reactions`)가 off면 예약도
-- 만들기도 없다. 하루 상한은 `story_reaction_user_daily` · `story_reaction_global_daily`, 알림은 `story_reaction_push`.
select cron.schedule(
  'companion-story-reactions',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/companion-story-reactions',
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
