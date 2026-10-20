import "background-only";

// 기기 캐시 — 검증을 통과한 원격 매니페스트 · 에피소드 원문을 호스트 저장소에 둡니다.
import type { CatalogSourceText } from "./episode-catalog";
import { getItem, isStorageAvailable, removeItem, setItem } from "./storage";

export const CONTENT_MANIFEST_KEY = "libitum.content.manifest";
export const CONTENT_AUDIO_MANIFEST_KEY = "libitum.content.audio-manifest";
export const contentEpisodeKey = (id: string): string => `libitum.content.episode.${id}`;

export type ContentStore = {
  available(): boolean;
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
};

export const hostContentStore: ContentStore = {
  available: isStorageAvailable,
  get: getItem,
  set: setItem,
  remove: removeItem,
};

function safeGet(store: ContentStore, key: string): string | null {
  try {
    return store.get(key);
  } catch {
    return null;
  }
}

/**
 * 저장소의 원문을 읽습니다. `keep`이 거른 id의 본문은 넣지 않습니다 — 자산을 다 갖추지 못한 원격 에피소드를
 * 카탈로그에서 「준비 중」으로 두는 자리입니다(ADR-0071). 내장본이 있는 id면 카탈로그가 내장본으로 엽니다.
 */
export function readCachedSource(
  store: ContentStore,
  ids: readonly string[],
  keep: (id: string) => boolean = () => true,
): CatalogSourceText {
  const episodes: Record<string, string> = {};
  for (const id of ids) {
    if (!keep(id)) {
      continue;
    }
    const text = safeGet(store, contentEpisodeKey(id));
    if (text !== null) {
      episodes[id] = text;
    }
  }
  return { manifest: safeGet(store, CONTENT_MANIFEST_KEY), episodes };
}
