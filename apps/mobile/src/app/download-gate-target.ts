// 받기 문지기의 대상과 시트 라벨 계산입니다(순수).
import type { CatalogUnitKey } from "../lib/catalog-progress";
import type { AssetTarget } from "../lib/download-policy";
import { catalogLessonOrdinalOf } from "../screens/journey-map/catalog-map";
import type {
  CatalogMapSection,
  CatalogUnitNode,
} from "../screens/journey-map/catalog-map.contract";

export type DownloadGateTarget =
  | { readonly kind: "episode"; readonly episodeId: string }
  | { readonly kind: "unit"; readonly episodeId: string; readonly unitKey: CatalogUnitKey };

/** 시트 제목에 쓸 유닛 — 맵 노드와 같은 역할 · 번호. */
export type DownloadSheetUnit = Pick<CatalogUnitNode, "role" | "ordinal">;

/** 마지막 유닛 → final, 문화 → culture, 이야기 → story, 그 밖 lesson(번호 없으면 0). */
export function downloadSheetUnitOf(
  sections: readonly CatalogMapSection[],
  episodeId: string,
  unitKey: CatalogUnitKey,
): DownloadSheetUnit {
  const section = sections.find((candidate) => candidate.episodeId === episodeId);
  if (section === undefined || section.kind !== "catalog-ready") {
    return { role: "lesson", ordinal: 0 };
  }
  if (section.finalKey === unitKey)
    return { role: "final", ordinal: section.lessonKeys.length + 1 };
  if (section.cultureKeys.includes(unitKey)) return { role: "culture", ordinal: 0 };
  if (section.storyKeys?.includes(unitKey) === true) return { role: "story", ordinal: 0 };
  return { role: "lesson", ordinal: catalogLessonOrdinalOf(sections, episodeId, unitKey) ?? 0 };
}

export function assetTargetOf(target: DownloadGateTarget): AssetTarget {
  return target.kind === "episode"
    ? { kind: "episode" }
    : { kind: "unit", unitKey: target.unitKey };
}
