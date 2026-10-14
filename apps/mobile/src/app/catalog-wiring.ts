// 카탈로그 결선의 합침입니다 — 표지 결선과 학습(레슨 · 최종 테스트) 결선에 학습자 프로필의 가드를 얹어 한 묶음으로 내립니다.

import { catalogCoverWiring } from "./catalog-cover-wiring";
import type { CatalogCoverWiring, CatalogCoverWiringArgs } from "./catalog-cover-wiring";
import { catalogLessonWiring } from "./catalog-lesson-wiring";
import type { CatalogLessonWiring, CatalogLessonWiringArgs } from "./catalog-lesson-wiring";
import { learnerProfileWiring } from "./learner-profile-wiring";
import type { LearnerProfileWiring, LearnerProfileWiringArgs } from "./learner-profile-wiring";

export type CatalogWiring = CatalogCoverWiring & CatalogLessonWiring & LearnerProfileWiring;
export type CatalogWiringArgs = CatalogCoverWiringArgs &
  CatalogLessonWiringArgs &
  LearnerProfileWiringArgs;

export function catalogWiring(args: CatalogWiringArgs): CatalogWiring {
  const profile = learnerProfileWiring(args, (learnerFill) => {
    const withFill = { ...args, learnerFill };
    return {
      cover: catalogCoverWiring(withFill).onStartCatalogCover,
      unit: catalogLessonWiring(withFill).onStartCatalogUnit,
    };
  });
  // 가드가 선 시작 함수 둘이 마지막에 놓여 원래 시작을 덮습니다.
  return { ...catalogCoverWiring(args), ...catalogLessonWiring(args), ...profile };
}
