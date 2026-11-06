// 설정 › 다운로드의 편별 레슨 집계 계산입니다(순수).
import { isCatalogEpisodeComplete } from "../lib/catalog-progress";
import type { CatalogProgress, CatalogUnitKey } from "../lib/catalog-progress";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";

export type DownloadCatalogEntry = {
  readonly episodeId: string;
  readonly ordinal: number;
  /** `episode.units[].id` + `episode.finalTest.id` — 스텝 순서. */
  readonly unitKeys: readonly CatalogUnitKey[];
};
export type DownloadCatalogInput = {
  readonly entries: readonly DownloadCatalogEntry[];
  readonly currentEpisodeId: string | null;
};
export type DownloadEpisodeRow = {
  readonly episodeId: string;
  readonly ordinal: number;
  readonly downloadedLessons: number;
  readonly totalLessons: number;
};
export type DownloadProgressSummary = {
  readonly rows: readonly DownloadEpisodeRow[];
  readonly current: DownloadEpisodeRow | null;
};

/** 맵 구획 가운데 첫 `catalog-ready`이면서 아직 끝나지 않은 편. 전부 끝났거나 없으면 null. */
export function currentDownloadEpisodeId(
  sections: readonly CatalogMapSection[],
  progress: CatalogProgress,
): string | null {
  for (const section of sections) {
    if (section.kind !== "catalog-ready") continue;
    if (!isCatalogEpisodeComplete(progress, section.episodeId, section.completionKeys)) {
      return section.episodeId;
    }
  }
  return null;
}

export function downloadProgressSummaryOf(
  input: DownloadCatalogInput,
  downloadedUnits: (episodeId: string, unitKeys: readonly CatalogUnitKey[]) => number,
): DownloadProgressSummary {
  const rows = [...input.entries]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((entry): DownloadEpisodeRow => ({
      episodeId: entry.episodeId,
      ordinal: entry.ordinal,
      downloadedLessons: downloadedUnits(entry.episodeId, entry.unitKeys),
      totalLessons: entry.unitKeys.length,
    }));
  const current = rows.find((row) => row.episodeId === input.currentEpisodeId) ?? null;
  return { rows, current };
}

export function downloadCatalogEntriesOf(
  catalog: readonly CatalogEntry[],
): readonly DownloadCatalogEntry[] {
  const entries: DownloadCatalogEntry[] = [];
  for (const entry of catalog) {
    if (entry.status !== "ready") continue;
    entries.push({
      episodeId: entry.id,
      ordinal: entry.order,
      unitKeys: [...entry.episode.units.map((unit) => unit.id), entry.episode.finalTest.id],
    });
  }
  return entries;
}
