// 결과 화면에서 나가면 에필로그(최종 통과 뒤 컷)로 이어지는가의 판정입니다 — 결선(이동)과 결과 화면(버튼 문구)이 같은
// 함수로 정해 「Back to map」을 누르면 이야기가 이어지는 어긋남이 없게 합니다. 순수 함수만 둡니다.

import type { CatalogUnitKey } from "../lib/catalog-progress";
import type { LearnerProfile } from "../lib/placeholder-fill";
import { assessmentCompletesStep } from "../screens/assessment/assessment";
import type { AssessmentVerdict } from "../screens/assessment/assessment";
import { catalogUnitRoleOf } from "../screens/journey-map/catalog-map";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { catalogEpilogueModelOf } from "./catalog-cover-wiring";
import type { EpisodeContent } from "./episode-content";

/** 최종 테스트를 통과했고 그릴 에필로그 컷이 있으면 참입니다. */
export function catalogUnitCompleteLeadsToEpilogue(
  values: {
    readonly episodeContent: EpisodeContent;
    readonly catalogSections: readonly CatalogMapSection[];
    readonly learnerFill: LearnerProfile;
  },
  episodeId: string,
  unitKey: CatalogUnitKey,
  verdict: AssessmentVerdict,
): boolean {
  const section = values.catalogSections.find((item) => item.episodeId === episodeId);
  return (
    section?.kind === "catalog-ready" &&
    catalogUnitRoleOf(section, unitKey) === "final" &&
    assessmentCompletesStep(verdict) &&
    catalogEpilogueModelOf(
      values.episodeContent,
      values.catalogSections,
      episodeId,
      values.learnerFill,
    ) !== null
  );
}
