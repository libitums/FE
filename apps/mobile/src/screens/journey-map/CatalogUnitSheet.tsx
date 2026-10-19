import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { StepSheet } from "./StepSheet";
import { catalogUnitNodeTitle, catalogUnitNodesOf } from "./catalog-map";
import type { JourneyMapCatalogProps } from "./catalog-map.contract";
import { catalogSectionTitle, catalogSheetFigures } from "./catalog-sheet";
import type { CatalogSheetTarget } from "./catalog-sheet";
import type { SheetEntranceMotion } from "./journey-map-sheet-motion";

export type CatalogUnitSheetProps = {
  readonly target: CatalogSheetTarget;
  readonly catalog: JourneyMapCatalogProps;
  readonly top: number;
  readonly caretOffset: number;
  readonly onClose: () => void;
  /** 말풍선의 등장 모션입니다. 없으면 `none`(모션 없음). */
  readonly entrance?: SheetEntranceMotion;
};

/**
 * 카탈로그 유닛을 누르면 붙는 말풍선입니다 — 튜토리얼 스텝과 같은 `StepSheet`에 이름(`Lesson n` ·
 * `Culture` · `Final test`) · 에피소드 제목 · 문항 진행을 싣고, `Start`가 세션을 엽니다. 구획이나 유닛을
 * 찾지 못하면(콘텐츠가 바뀐 사이) 그리지 않습니다.
 */
export function CatalogUnitSheet({
  target,
  catalog,
  top,
  caretOffset,
  onClose,
}: CatalogUnitSheetProps): ReactNode {
  const copy = useUiCopy();
  const section = catalog.sections.find((candidate) => candidate.episodeId === target.episodeId);
  if (section?.kind !== "catalog-ready") return null;
  const node = catalogUnitNodesOf(section, catalog.progress).find(
    (candidate) => candidate.key === target.unitKey,
  );
  if (node === undefined) return null;
  const figures = catalogSheetFigures(
    target,
    catalog.unitItemCountOf?.(target.episodeId, target.unitKey) ?? 0,
    catalog.progress,
  );
  return (
    <StepSheet
      title={catalogSectionTitle(section)}
      top={top}
      caretOffset={caretOffset}
      lessonOrdinal={node.ordinal}
      unitLabel={catalogUnitNodeTitle(node, copy)}
      completedActivityCount={figures.completedActivityCount}
      totalActivityCount={figures.totalActivityCount}
      onStart={() => catalog.onStartUnit(target.episodeId, target.unitKey)}
      onClose={onClose}
    />
  );
}
