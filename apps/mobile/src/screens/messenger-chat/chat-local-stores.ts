// 해금 기록 · 내 모습 · 생년의 기기 저장 접점입니다(messenger-chat-1-5 spec §5.3). lib/storage의 getItem · setItem만 씁니다.
// 첫 읽기 뒤 메모리 캐시로 읽고, 쓰기는 캐시 + 저장소 둘 다 합니다. 실패는 삼키고 이번 실행만 메모리로 갑니다.

import { getItem, setItem } from "../../lib/storage";
import { SNAPSHOT_SELVES, type ChatSnapshotSelf } from "./chat-album.contract";
import type { SnapshotSelfStore } from "./chat-fixture-album";
import type { BirthYearStore } from "./chat-fixture-birth-year";
import type { ChatBirthYear } from "./chat-source.contract";
import type { KeyboardHeightStore } from "./keyboard-ports";

export const UNLOCKED_KEY = "libitum.messenger.unlocked";
/** 사진 속 내 모습(ADR-0150) — `{ <출처 키>: female | male | hidden }`(계정마다). */
export const SNAPSHOT_SELF_KEY = "libitum.messenger.snapshot-self";
/** 생년(ADR-0125) — `{ <출처 키>: { kind: "set", year } | { kind: "skipped" } }`(계정마다). */
export const BIRTH_YEAR_KEY = "libitum.messenger.birth-year";

export type UnlockStore = {
  readonly read: () => ReadonlySet<string>;
  readonly add: (characterId: string) => void;
};

/**
 * 배열이 아니면 []. 배열이면 문자열만 남기고(중복 · 빈 문자열 제거) — 값 하나가 어긋났다고 해금한 인물을 모두 잠그지 않습니다.
 */
export function parseUnlocked(raw: unknown): readonly string[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw.filter((item): item is string => typeof item === "string" && item !== "");
  return [...new Set(ids)];
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

const selfOf = (value: unknown): ChatSnapshotSelf | null =>
  SNAPSHOT_SELVES.find((self) => self === value) ?? null;

/** 기기의 내 모습 저장 — 계정(출처 키 「fixture」 · 「server:<id>」)마다 따로. 틀린 값은 고른 적 없음으로 읽습니다. */
export function deviceSnapshotSelfStore(accountKey: string): SnapshotSelfStore {
  const all = (): Record<string, unknown> => {
    const raw = readJson(SNAPSHOT_SELF_KEY);
    return typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  };
  return {
    read: () => selfOf(all()[accountKey]),
    write: (self) => writeJson(SNAPSHOT_SELF_KEY, { ...all(), [accountKey]: self }),
  };
}

/** 기기에 적힌 생년 하나 — set(정수 연도) · skipped만 읽고, 틀린 값은 적힌 것 없음(null)으로. */
export function parseBirthYear(raw: unknown): ChatBirthYear | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as { kind?: unknown; year?: unknown };
  if (value.kind === "skipped") return { kind: "skipped" };
  return value.kind === "set" && typeof value.year === "number" && Number.isInteger(value.year)
    ? { kind: "set", year: value.year }
    : null;
}

/** 기기의 생년 저장(ADR-0125) — 계정(출처 키 「fixture」 · 「server:<id>」)마다 따로. */
export function deviceBirthYearStore(accountKey: string): BirthYearStore {
  const all = (): Record<string, unknown> => {
    const raw = readJson(BIRTH_YEAR_KEY);
    return typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  };
  return {
    read: () => parseBirthYear(all()[accountKey]),
    write: (value) => writeJson(BIRTH_YEAR_KEY, { ...all(), [accountKey]: value }),
  };
}

/** 휴대폰 키보드 높이 — 기기 하나에 하나(계정과 무관). 유한한 양수가 아니면 적힌 것 없음. */
export const KEYBOARD_HEIGHT_KEY = "libitum.messenger.keyboard-height";

const positiveHeight = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

function createDeviceKeyboardHeightStore(): KeyboardHeightStore {
  let loaded = false;
  let cache: number | null = null;
  return {
    read: () => {
      if (!loaded) {
        loaded = true;
        cache = positiveHeight(readJson(KEYBOARD_HEIGHT_KEY));
      }
      return cache;
    },
    write: (height) => {
      if (positiveHeight(height) === null || height === cache) return;
      loaded = true;
      cache = height;
      writeJson(KEYBOARD_HEIGHT_KEY, height);
    },
  };
}

export const deviceKeyboardHeightStore: KeyboardHeightStore = createDeviceKeyboardHeightStore();

export function memoryBirthYearStore(initial: ChatBirthYear | null = null): BirthYearStore {
  let value = initial;
  return {
    read: () => value,
    write: (next) => {
      value = next;
    },
  };
}

export function memorySnapshotSelfStore(
  initial: ChatSnapshotSelf | null = null,
): SnapshotSelfStore {
  let value = initial;
  return {
    read: () => value,
    write: (self) => {
      value = self;
    },
  };
}
