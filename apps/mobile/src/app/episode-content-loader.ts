import "background-only";

// 내장 + 기기 캐시에서 카탈로그를 읽고 이미지 URL · 치환 포트를 닫아 만듭니다(백그라운드 전용).

import { bundledCatalogInput } from "../lib/episode-bundled";
import { CONTENT_MANIFEST_KEY, hostContentStore, readCachedSource } from "../lib/episode-cache";
import { buildEpisodeCatalog, parseCachedManifest } from "../lib/episode-catalog";
import type { CatalogSourceText } from "../lib/episode-catalog";
import { contentBaseUrl, resolveContentUrlSafe } from "../lib/episode-remote";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { supabaseConfig } from "../lib/supabase-config";
import type { EpisodeContent } from "./episode-content";

function imageUrlOf(relativePath: string): string | null {
  const config = supabaseConfig();
  return config === null ? null : resolveContentUrlSafe(contentBaseUrl(config.url), relativePath);
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
  const cachedIds = (parseCachedManifest(cachedManifestText())?.episodes ?? []).map(
    (entry) => entry.id,
  );
  const ids = [...bundledIds, ...cachedIds.filter((id) => !bundledIds.includes(id))];
  return readCachedSource(hostContentStore, ids);
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
  return { catalog, imageUrlOf, fillText: fillPlaceholders };
}
