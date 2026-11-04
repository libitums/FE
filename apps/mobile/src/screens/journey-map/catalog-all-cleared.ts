// 「이 기기의 이야기를 모두 끝냈다」 판정 — 맵의 마지막 구획이 열린 편이고 그 편을 끝냈을 때입니다(ADR-0095 D9).

import { isCatalogEpisodeComplete } from "../../lib/catalog-progress";
import type { CatalogProgress } from "../../lib/catalog-progress";
import type { CatalogMapSection } from "./catalog-map.contract";

export function catalogAllCleared(
  sections: readonly CatalogMapSection[],
  progress: CatalogProgress,
): boolean {
  const last = sections[sections.length - 1];
  if (last?.kind !== "catalog-ready") return false;
  return isCatalogEpisodeComplete(progress, last.episodeId, last.completionKeys);
}
