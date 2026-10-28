// 카탈로그 결선의 합침입니다 — 표지 결선과 학습(레슨 · 최종 테스트) 결선을 한 묶음으로 내립니다. 학습자 프로필의
// 에피소드 전 가드는 2026-10-20에 걷었습니다(이름 · 나라는 가입 직후 화면이 묻습니다 — ADR-0059 D7 적용 기록).

import { catalogCoverWiring } from "./catalog-cover-wiring";
import type { CatalogCoverWiring, CatalogCoverWiringArgs } from "./catalog-cover-wiring";
import { catalogItemReportWiring } from "./catalog-item-report-wiring";
import type { CatalogItemReportWiring } from "./catalog-item-report-wiring";
import { catalogLessonWiring } from "./catalog-lesson-wiring";
import type { CatalogLessonWiring, CatalogLessonWiringArgs } from "./catalog-lesson-wiring";
import { catalogListenWiring } from "./catalog-listen-wiring";
import { withCatalogStory } from "./catalog-story-wiring";
import type { CatalogStoryWiring } from "./catalog-story-wiring";
import type { CatalogListenWiring, CatalogListenWiringArgs } from "./catalog-listen-wiring";
import { roleplayStoryWiring } from "./roleplay-story-wiring";
import type { RoleplayStoryWiring } from "./roleplay-story-wiring";

export type CatalogWiring = CatalogCoverWiring &
  CatalogLessonWiring &
  CatalogStoryWiring &
  RoleplayStoryWiring &
  CatalogListenWiring &
  CatalogItemReportWiring;
export type CatalogWiringArgs = CatalogCoverWiringArgs &
  CatalogLessonWiringArgs &
  CatalogListenWiringArgs;

export function catalogWiring(args: CatalogWiringArgs): CatalogWiring {
  return {
    ...catalogCoverWiring(args),
    // 막간 이야기 유닛은 레슨 시작 앞에서 갈라집니다(ADR-0088).
    ...withCatalogStory(catalogLessonWiring(args), args),
    ...roleplayStoryWiring(args),
    ...catalogListenWiring(args),
    ...catalogItemReportWiring(args),
  };
}
