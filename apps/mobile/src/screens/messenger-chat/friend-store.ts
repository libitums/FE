// 추천 친구 추가 기록의 기기 저장입니다(계정마다) — 해금 기록(`deviceUnlockStore`, ADR-0117)과 같은 꼴. 첫 읽기 뒤 메모리 캐시로
// 읽고, 쓰기는 캐시 + 저장소 둘 다 합니다. 실패는 삼키고 이번 실행만 메모리로 갑니다. 새 기기는 기록이 없어 추천 줄이 다시 서고,
// 다시 추가하면 서버 대화가 이어집니다(방을 열 때 기록을 읽습니다).

import { readJson, writeJson } from "./chat-local-stores";
import type { FriendRecord, FriendStore } from "./chat-friends.contract";

/** `{ <출처 키>: { <친구 id>: { addedAt, messaged } } }`. */
export const FRIENDS_BY_ACCOUNT_KEY = "libitum.messenger.friends-by-account";

/** 기록 하나 — addedAt이 유한한 수가 아니면 버립니다(값 하나가 어긋났다고 다른 친구를 잃지 않게). */
export function parseFriendRecords(raw: unknown): Map<string, FriendRecord> {
  const records = new Map<string, FriendRecord>();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return records;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (id === "" || typeof value !== "object" || value === null) continue;
    const { addedAt, messaged } = value as { addedAt?: unknown; messaged?: unknown };
    if (typeof addedAt !== "number" || !Number.isFinite(addedAt)) continue;
    records.set(id, { addedAt, messaged: messaged === true });
  }
  return records;
}

const accountMap = (): Record<string, unknown> => {
  const raw = readJson(FRIENDS_BY_ACCOUNT_KEY);
  return typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? { ...(raw as Record<string, unknown>) }
    : {};
};

function storeOver(
  load: () => Map<string, FriendRecord>,
  save: (records: Map<string, FriendRecord>) => void,
): FriendStore {
  return {
    read: () => new Map(load()),
    add: (characterId, at) => {
      const records = load();
      if (characterId === "" || records.has(characterId)) return;
      records.set(characterId, { addedAt: at, messaged: false });
      save(records);
    },
    markMessaged: (characterId) => {
      const records = load();
      const record = records.get(characterId);
      if (record === undefined || record.messaged) return;
      records.set(characterId, { ...record, messaged: true });
      save(records);
    },
  };
}

/** 기기의 추천 친구 기록 — 계정(출처 키 「fixture」 · 「server:<id>」)마다 따로입니다. */
export function deviceFriendStore(accountKey: string): FriendStore {
  let cache: Map<string, FriendRecord> | null = null;
  return storeOver(
    () => {
      cache ??= parseFriendRecords(accountMap()[accountKey]);
      return cache;
    },
    (records) =>
      writeJson(FRIENDS_BY_ACCOUNT_KEY, {
        ...accountMap(),
        [accountKey]: Object.fromEntries(records),
      }),
  );
}

/** 계정을 지웠을 때 그 계정의 추천 친구 기록을 지웁니다(다른 계정은 그대로). */
export function forgetDeviceFriends(accountKey: string): void {
  const map = accountMap();
  if (map[accountKey] === undefined) return;
  delete map[accountKey];
  writeJson(FRIENDS_BY_ACCOUNT_KEY, map);
}

export function memoryFriendStore(
  initial: Readonly<Record<string, FriendRecord>> = {},
): FriendStore {
  const records = parseFriendRecords(initial);
  return storeOver(
    () => records,
    () => undefined,
  );
}
