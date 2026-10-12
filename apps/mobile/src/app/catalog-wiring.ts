// 카탈로그 결선의 합침입니다 — 표지 결선과 학습(레슨 · 최종 테스트) 결선을 한 묶음으로 내립니다.

import { catalogCoverWiring } from "./catalog-cover-wiring";
import type { CatalogCoverWiring, CatalogCoverWiringArgs } from "./catalog-cover-wiring";
import { catalogLessonWiring } from "./catalog-lesson-wiring";
import type { CatalogLessonWiring, CatalogLessonWiringArgs } from "./catalog-lesson-wiring";

export type CatalogWiring = CatalogCoverWiring & CatalogLessonWiring;
export type CatalogWiringArgs = CatalogCoverWiringArgs & CatalogLessonWiringArgs;

export function catalogWiring(args: CatalogWiringArgs): CatalogWiring {
  return { ...catalogCoverWiring(args), ...catalogLessonWiring(args) };
}
