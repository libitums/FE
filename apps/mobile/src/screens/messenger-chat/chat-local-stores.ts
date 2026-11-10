// 무료 수 원장 · 해금 기록의 기기 저장 접점입니다(messenger-chat-1-5 spec §5.3). lib/storage의 getItem · setItem만 씁니다.
// 첫 읽기 뒤 메모리 캐시로 읽고, 쓰기는 캐시 + 저장소 둘 다 합니다. 실패는 삼키고 이번 실행만 메모리로 갑니다.

import { getItem, setItem } from "../../lib/storage";
import { parseTurnRecord, type TurnRecord } from "./free-turns";
import type { TurnRecordStore } from "./turn-ledger";

export const TURN_RECORD_KEY = "libitum.messenger.free-turns";
export const UNLOCKED_KEY = "libitum.messenger.unlocked";

export type UnlockStore = {
  readonly read: () => ReadonlySet<string>;
  readonly add: (characterId: string) => void;
};

/** 문자열 배열이 아니면 [], 중복 · 빈 문자열 제거. */
export function parseUnlocked(raw: unknown): readonly string[] {
  if (!Array.isArray(raw) || !raw.every((item) => typeof item === "string")) return [];
  return [...new Set((raw as string[]).filter((id) => id !== ""))];
}

function readJson(key: string): unknown {
  try {
    const text = getItem(key);
    return text === null ? null : (JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    setItem(key, JSON.stringify(value));
  } catch {
    // 이번 실행만 캐시로 계속합니다.
  }
}

function createDeviceTurnRecordStore(): TurnRecordStore {
  let loaded = false;
  let cache: TurnRecord | null = null;
  return {
    read: () => {
      if (!loaded) {
        loaded = true;
        cache = parseTurnRecord(readJson(TURN_RECORD_KEY));
      }
      return cache;
    },
    write: (record) => {
      loaded = true;
      cache = record;
      writeJson(TURN_RECORD_KEY, record);
    },
  };
}

function createDeviceUnlockStore(): UnlockStore {
  let cache: Set<string> | null = null;
  const load = (): Set<string> => {
    cache ??= new Set(parseUnlocked(readJson(UNLOCKED_KEY)));
    return cache;
  };
  return {
    read: () => new Set(load()),
    add: (characterId) => {
      const ids = load();
      if (characterId === "" || ids.has(characterId)) return;
      ids.add(characterId);
      writeJson(UNLOCKED_KEY, [...ids]);
    },
  };
}

export const deviceTurnRecordStore: TurnRecordStore = createDeviceTurnRecordStore();
export const deviceUnlockStore: UnlockStore = createDeviceUnlockStore();

export function memoryUnlockStore(initial: readonly string[] = []): UnlockStore {
  const ids = new Set(parseUnlocked(initial));
  return {
    read: () => new Set(ids),
    add: (characterId) => {
      if (characterId !== "") ids.add(characterId);
    },
  };
}
