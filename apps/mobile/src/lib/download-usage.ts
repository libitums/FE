import "background-only";

// 설정 › 다운로드의 「받은 크기」(ADR-0095 D8) — 활성 매니페스트에서 그림 · 음성을 다 받은 편의 `assets_bytes` 합입니다.
// 파일을 세지 않습니다. 크기가 실린 편이 하나도 없으면 `null`(줄을 그리지 않음).

import type { CatalogUnitKey } from "./catalog-progress";
import type { AssetTarget } from "./download-policy";
import { contentCommonAssetsKey, contentUnitAssetsKey } from "./episode-asset-groups-sync";
import { isAssetsComplete } from "./episode-asset-sync";
import { CONTENT_MANIFEST_KEY, safeGet } from "./episode-cache";
import type { ContentStore } from "./episode-cache";
import { parseCachedManifest } from "./episode-catalog";

export function downloadedAssetBytes(store: ContentStore): number | null {
  const manifest = parseCachedManifest(safeGet(store, CONTENT_MANIFEST_KEY));
  if (manifest === null) return null;
  let sized = false;
  let total = 0;
  for (const entry of manifest.episodes) {
    if (entry.assetsBytes === undefined) continue;
    sized = true;
    if (isAssetsComplete(store, entry.id, entry.sha256)) total += entry.assetsBytes;
  }
  return sized ? total : null;
}

/**
 * 그 편의 그림 · 음성을 다 받았는가 — 자산 표시의 sha가 활성 매니페스트나 내장 목록의 그 편 sha와 맞을 때입니다
 * (에피소드를 열 때의 받기 판정, ADR-0095 D6). 그 편이 어디에도 없으면 false.
 */
export function episodeAssetsComplete(
  store: ContentStore,
  bundled: readonly { readonly id: string; readonly sha256: string }[],
  id: string,
): boolean {
  const active = parseCachedManifest(safeGet(store, CONTENT_MANIFEST_KEY))?.episodes ?? [];
  const shas = [...active, ...bundled].filter((entry) => entry.id === id).map((e) => e.sha256);
  return shas.some((sha256) => isAssetsComplete(store, id, sha256));
}

/** 활성 매니페스트에 실린 그 편의 그림 · 음성 크기입니다(받기 시트의 크기 줄). 없으면 `null`. */
export function episodeAssetsBytes(store: ContentStore, id: string): number | null {
  const manifest = parseCachedManifest(safeGet(store, CONTENT_MANIFEST_KEY));
  return manifest?.episodes.find((entry) => entry.id === id)?.assetsBytes ?? null;
}

function shasOf(
  store: ContentStore,
  bundled: readonly { readonly id: string; readonly sha256: string }[],
  id: string,
): string[] {
  const active = parseCachedManifest(safeGet(store, CONTENT_MANIFEST_KEY))?.episodes ?? [];
  return [...active, ...bundled].filter((entry) => entry.id === id).map((e) => e.sha256);
}

/**
 * 대상별 받음 — `episode`: 편 표시. `common`: 편 표시 또는 공통 표시. `unit`: 편 표시 또는
 * (공통 표시 그리고 그 유닛 표시). sha는 활성 매니페스트 · 내장 목록의 그 편 sha 가운데 하나입니다.
 */
export function episodeAssetsCompleteFor(
  store: ContentStore,
  bundled: readonly { readonly id: string; readonly sha256: string }[],
  id: string,
  target: AssetTarget,
): boolean {
  return shasOf(store, bundled, id).some((sha256) => {
    if (isAssetsComplete(store, id, sha256)) return true;
    if (target.kind === "episode") return false;
    if (!isAssetsComplete(store, id, sha256, contentCommonAssetsKey(id))) return false;
    if (target.kind === "common") return true;
    return isAssetsComplete(store, id, sha256, contentUnitAssetsKey(id, target.unitKey));
  });
}

/** 받은 유닛 수 — `unitKeys` 가운데 `unit` 판정이 참인 것(편 표시가 완료면 전부). */
export function downloadedUnitCount(
  store: ContentStore,
  bundled: readonly { readonly id: string; readonly sha256: string }[],
  id: string,
  unitKeys: readonly CatalogUnitKey[],
): number {
  return unitKeys.filter((unitKey) =>
    episodeAssetsCompleteFor(store, bundled, id, { kind: "unit", unitKey }),
  ).length;
}
