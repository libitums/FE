// 결과 화면의 「다음 학습」이 열 유닛입니다 — 같은 에피소드 사슬(레슨들 → 최종)에서 방금 끝낸 유닛의 바로 다음입니다.
// 최종 테스트 다음은 없습니다(에필로그로 갑니다). 순수 함수만 있습니다.

import { catalogUnitTicketCost } from "../lib/catalog-ticket-cost";
import type { CatalogProgress, CatalogUnitKey } from "../lib/catalog-progress";
import type { CatalogStartSource } from "../lib/catalog-learning-event.contract";
import type { LessonCompleteNext } from "../screens/lesson-complete/LessonCompleteNextActions";
import { catalogUnitNodesOf } from "../screens/journey-map/catalog-map";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";

export type CatalogNextUnit = {
  readonly unitKey: CatalogUnitKey;
  /** 문화 유닛은 레슨처럼 「Next lesson」으로 섭니다. */
  readonly kind: "lesson" | "final";
};

export function catalogNextUnitOf(
  sections: readonly CatalogMapSection[],
  episodeId: string,
  unitKey: CatalogUnitKey,
): CatalogNextUnit | null {
  const section = sections.find((candidate) => candidate.episodeId === episodeId);
  if (section === undefined || section.kind !== "catalog-ready") return null;
  const nodes = catalogUnitNodesOf(section, {});
  const index = nodes.findIndex((node) => node.key === unitKey);
  const next = index < 0 ? undefined : nodes[index + 1];
  if (next === undefined) return null;
  return { unitKey: next.key, kind: next.role === "final" ? "final" : "lesson" };
}

export type CatalogResultNextInput = {
  readonly catalogSections: readonly CatalogMapSection[];
  readonly catalogProgress: CatalogProgress;
  readonly catalogTicketUnits?: CatalogProgress;
  readonly onStartCatalogUnit: (
    episodeId: string,
    unitKey: CatalogUnitKey,
    source?: CatalogStartSource,
  ) => void;
};

/**
 * 결과 화면에 넘길 `next`입니다 — 다음 유닛이 있으면 그 종류 · 티켓 수 · 시작(출처 `result`), 없으면 빈 객체입니다.
 * 티켓 수는 맵 말풍선과 같은 함수(`catalogUnitTicketCost`)로 셉니다. 미통과 여부는 화면이 가립니다.
 */
export function catalogResultNextOf(
  input: CatalogResultNextInput,
  episodeId: string,
  unitKey: CatalogUnitKey,
): { readonly next?: LessonCompleteNext } {
  const next = catalogNextUnitOf(input.catalogSections, episodeId, unitKey);
  if (next === null) return {};
  return {
    next: {
      kind: next.kind,
      ticketCost: catalogUnitTicketCost(
        input.catalogProgress,
        episodeId,
        next.unitKey,
        input.catalogTicketUnits ?? {},
      ),
      onStart: () => input.onStartCatalogUnit(episodeId, next.unitKey, "result"),
    },
  };
}
