import "background-only";

// 기기 캐시 — 검증을 통과한 원격 매니페스트 · 에피소드 원문을 호스트 저장소에 둡니다.
import type { CatalogSourceText } from "./episode-catalog";
import { getItem, isStorageAvailable, removeItem, setItem } from "./storage";

export const CONTENT_MANIFEST_KEY = "libitum.content.manifest";
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

export function readCachedSource(store: ContentStore, ids: readonly string[]): CatalogSourceText {
  const episodes: Record<string, string> = {};
  for (const id of ids) {
    const text = safeGet(store, contentEpisodeKey(id));
    if (text !== null) {
      episodes[id] = text;
    }
  }
  return { manifest: safeGet(store, CONTENT_MANIFEST_KEY), episodes };
}
