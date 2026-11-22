# 미션 파일 (ADR-0176 D4)

롤플레이 미션의 **정본은 이 폴더의 JSON 파일들**입니다. 스크립트가 서버 표 `companion.missions`(`definition jsonb`)로 올리고, DB를 손으로 고치지 않습니다.

- 파일 하나 = 미션 하나. 파일 이름은 `<id>.json`.
- 모양은 계약 패키지의 `missionDefinitionSchema`(`packages/companion-contract/src/mission.ts`)이고, 서버는 `validateMission`(`../mission-definition.ts`)으로 읽습니다.
- 내용을 바꾸면 `version`을 올립니다 — 지난 결과가 어느 판의 정의로 채점됐는지 남습니다.
- `targetExpressions`는 에피소드 콘텐츠(`apps/mobile/content/episodes/<episodeId>.json`의 `patterns` · `words`)의 id와 글 그대로입니다. 단위 테스트(`mission-files.unit.test.ts`)가 확인합니다.
- `counterpart.base`(캐스트만, 선택)는 페르소나 카드의 바탕 네 칸(`name` · `age` · `job` · `speech`)을 옮겨 둔 것입니다. 실험실 번들 · 테스트용이고, 서버는 DB의 카드가 있으면 그것을 먼저 씁니다.
- 파일을 고치면 실험실 번들을 다시 만듭니다: `pnpm mission:bundle`.
