import "background-only";

// 내장 + 기기 캐시에서 카탈로그를 읽고 이미지 URL · 치환 포트를 닫아 만듭니다(백그라운드 전용).

import {
  contentFileUrl,
  contentFilesAvailable,
  downloadContentFile,
  localOrRemoteUrl,
} from "../lib/content-files";
import { isAssetsComplete } from "../lib/episode-asset-sync";
import type { AssetDeps } from "../lib/episode-asset-sync";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { CONTENT_MANIFEST_KEY, hostContentStore, readCachedSource } from "../lib/episode-cache";
import { buildEpisodeCatalog, parseCachedManifest } from "../lib/episode-catalog";
import type { CatalogSourceText } from "../lib/episode-catalog";
import { contentBaseUrl, resolveContentUrlSafe } from "../lib/episode-remote";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { supabaseConfig } from "../lib/supabase-config";
import type { EpisodeContent } from "./episode-content";

/** 버킷 상대 경로의 원격 주소입니다. 설정이 없으면 `null`입니다. */
export function remoteContentUrlOf(relativePath: string): string | null {
  const config = supabaseConfig();
  return config === null ? null : resolveContentUrlSafe(contentBaseUrl(config.url), relativePath);
}

// 받아 둔 파일이 있으면 그것을 씁니다 — 오프라인에서도 그림 · 소리가 나옵니다(ADR-0071). 음성도 이 포트를 씁니다.
function imageUrlOf(relativePath: string): string | null {
  return localOrRemoteUrl(relativePath, remoteContentUrlOf);
}

function cachedManifestText(): string | null {
  try {
    return hostContentStore.get(CONTENT_MANIFEST_KEY);
  } catch {
    return null;
  }
}

/** 내장 + 캐시 매니페스트가 가리키는 모든 에피소드 id의 원문을 저장소에서 읽습니다. */
function readSource(): CatalogSourceText {
  const bundledIds = bundledCatalogInput.manifest.episodes.map((entry) => entry.id);
  const remoteEntries = parseCachedManifest(cachedManifestText())?.episodes ?? [];
  const cachedIds = remoteEntries.map((entry) => entry.id);
  const ids = [...bundledIds, ...cachedIds.filter((id) => !bundledIds.includes(id))];
  // 파일 모듈이 있으면 원격 에피소드는 자산까지 갖춘 뒤에만 엽니다. 없으면(Explorer · 옛 호스트) 받을 수 없으니
  // 지금처럼 본문만으로 엽니다.
  if (!contentFilesAvailable()) return readCachedSource(hostContentStore, ids);
  const keep = (id: string): boolean => {
    const entry = remoteEntries.find((candidate) => candidate.id === id);
    return entry === undefined || isAssetsComplete(hostContentStore, id, entry.sha256);
  };
  return readCachedSource(hostContentStore, ids, keep);
}

function sameSource(a: CatalogSourceText, b: CatalogSourceText): boolean {
  if (a.manifest !== b.manifest) return false;
  const keys = Object.keys(a.episodes);
  return (
    keys.length === Object.keys(b.episodes).length &&
    keys.every((key) => a.episodes[key] === b.episodes[key])
  );
}

// 같은 원문 입력이면 이전 결과를 그대로 돌려줍니다 — 디코드를 반복하지 않고 참조가 안정됩니다.
let lastSource: CatalogSourceText | null = null;
let lastCatalog: EpisodeContent["catalog"] | null = null;

function catalogOf(source: CatalogSourceText): EpisodeContent["catalog"] {
  if (lastSource !== null && lastCatalog !== null && sameSource(lastSource, source)) {
    return lastCatalog;
  }
  const catalog = buildEpisodeCatalog({ bundled: bundledCatalogInput, cache: source });
  lastSource = source;
  lastCatalog = catalog;
  return catalog;
}

export function loadEpisodeContent(): EpisodeContent {
  let catalog: EpisodeContent["catalog"];
  try {
    catalog = catalogOf(readSource());
  } catch {
    catalog = buildEpisodeCatalog({
      bundled: bundledCatalogInput,
      cache: { manifest: null, episodes: {} },
    });
  }
  return { catalog, imageUrlOf, fillText: fillPlaceholders, audioTimingOf: () => null };
}

/** 호스트 파일 모듈이 있을 때만 자산을 받습니다. 없으면 지금처럼 본문만 받습니다(ADR-0071 D4). */
export function hostAssetDeps(): AssetDeps | undefined {
  if (!contentFilesAvailable()) return undefined;
  return {
    has: (path) => contentFileUrl(path) !== null,
    download: downloadContentFile,
    remoteUrlOf: remoteContentUrlOf,
  };
}
