import "background-only";

// 설정 › 다운로드의 「받은 크기」(ADR-0095 D8) — 활성 매니페스트에서 그림 · 음성을 다 받은 편의 `assets_bytes` 합입니다.
// 파일을 세지 않습니다. 크기가 실린 편이 하나도 없으면 `null`(줄을 그리지 않음).

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
