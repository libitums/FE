// 본 마지막 인물 메시지의 기기 저장입니다(ADR-0213 개정) — `{ <출처 키>: { <인물 id>: { id, at } } }`, 계정마다 따로.
// 첫 읽기 뒤 메모리 캐시로 읽고, 같은 값이면 다시 쓰지 않습니다. 실패는 삼키고 이번 실행만 메모리로 갑니다.
// 다른 기기에서 읽은 것은 반영하지 않습니다(받아들인 한계 — 서버에 읽음 기록이 없음).

import { getItem, setItem } from "../../lib/storage";
import { parseLastSeen, type LastSeen, type LastSeenStore } from "./chat-last-seen";

export type { LastSeenStore };

/** 본 마지막 인물 메시지 — `{ <출처 키>: { <인물 id>: { id: string | null, at: number } } }`. */
export const LAST_SEEN_KEY = "libitum.messenger.last-seen";

const objectOf = (raw: unknown): Record<string, unknown> =>
  typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? { ...(raw as Record<string, unknown>) }
    : {};

function readAll(): Record<string, unknown> {
  try {
    const text = getItem(LAST_SEEN_KEY);
    return objectOf(text === null ? null : (JSON.parse(text) as unknown));
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, unknown>): void {
  try {
    setItem(LAST_SEEN_KEY, JSON.stringify(all));
  } catch {
    // 이번 실행만 캐시로 계속합니다.
  }
}

/** 그 계정(출처 키 「server:<id>」)의 저장. */
export function deviceLastSeenStore(accountKey: string): LastSeenStore {
  let cache: Map<string, LastSeen> | null = null;
  const load = (): Map<string, LastSeen> => {
    if (cache !== null) return cache;
    cache = new Map();
    for (const [characterId, raw] of Object.entries(objectOf(readAll()[accountKey]))) {
      const seen = parseLastSeen(raw);
      if (seen !== null) cache.set(characterId, seen);
    }
    return cache;
  };
  return {
    read: (characterId) => load().get(characterId) ?? null,
    write: (characterId, seen) => {
      const seenMap = load();
      const old = seenMap.get(characterId);
      if (characterId === "" || (old?.id === seen.id && old.at === seen.at)) return;
      seenMap.set(characterId, seen);
      writeAll({ ...readAll(), [accountKey]: Object.fromEntries(seenMap) });
    },
  };
}

/** 로그아웃 · 계정 삭제 — 그 계정 것만 지웁니다(다른 계정은 그대로). */
export function forgetLastSeen(accountKey: string): void {
  const all = readAll();
  if (all[accountKey] === undefined) return;
  delete all[accountKey];
  writeAll(all);
}

/** 메모리 저장(테스트 · 데모). */
export function memoryLastSeenStore(): LastSeenStore {
  const seenMap = new Map<string, LastSeen>();
  return {
    read: (characterId) => seenMap.get(characterId) ?? null,
    write: (characterId, seen) => void seenMap.set(characterId, seen),
  };
}
