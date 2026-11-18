import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { serverAccountKey } from "./chat-local-stores";
import {
  FRIENDS_BY_ACCOUNT_KEY,
  deviceFriendStore,
  forgetDeviceFriends,
  parseFriendRecords,
} from "./friend-store";

// `unit` 계층(RF-U30 ~ U33): 추천 친구 추가 기록은 기기에 계정마다 따로 적는다(해금 기록 ADR-0117과 같은 꼴). 틀린 줄은 그 줄만
// 버리고, 계정을 지우면 그 계정 기록만 지운다.

let storage: Map<string, string>;

beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => storage.get(key) ?? null,
      set: (key: string, value: string) => void storage.set(key, value),
      remove: (key: string) => void storage.delete(key),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const A = serverAccountKey("user-a");
const B = serverAccountKey("user-b");

describe("추천 친구 기록 (RF-U30 ~ U33)", () => {
  test("RF-U30 한 계정이 추가한 친구는 다른 계정에 보이지 않고, 다시 읽어도 남는다", () => {
    deviceFriendStore(A).add("seoyeon", 10);
    expect([...deviceFriendStore(A).read()]).toEqual([
      ["seoyeon", { addedAt: 10, messaged: false }],
    ]);
    expect(deviceFriendStore(B).read().size).toBe(0);
    expect(JSON.parse(storage.get(FRIENDS_BY_ACCOUNT_KEY) ?? "{}")).toEqual({
      [A]: { seoyeon: { addedAt: 10, messaged: false } },
    });
  });

  test("RF-U31 첫 글 표시는 한 번만 적히고 추가 시각은 그대로다", () => {
    const store = deviceFriendStore(A);
    store.add("daeun", 5);
    store.add("daeun", 99);
    store.markMessaged("daeun");
    expect(deviceFriendStore(A).read().get("daeun")).toEqual({ addedAt: 5, messaged: true });
  });

  test("RF-U32 틀린 값은 그 줄만 버린다", () => {
    expect([
      ...parseFriendRecords({
        a: { addedAt: 1 },
        b: { addedAt: "x" },
        "": { addedAt: 1 },
        c: null,
      }),
    ]).toEqual([["a", { addedAt: 1, messaged: false }]]);
    expect(parseFriendRecords([1, 2]).size).toBe(0);
    expect(parseFriendRecords(null).size).toBe(0);
  });

  test("RF-U33 계정을 지우면 그 계정 기록만 지운다 · 저장소가 깨져도 던지지 않는다", () => {
    deviceFriendStore(A).add("seoyeon", 1);
    deviceFriendStore(B).add("daeun", 2);
    forgetDeviceFriends(A);
    expect(deviceFriendStore(A).read().size).toBe(0);
    expect(deviceFriendStore(B).read().has("daeun")).toBe(true);
    storage.set(FRIENDS_BY_ACCOUNT_KEY, "{not json");
    expect(deviceFriendStore(A).read().size).toBe(0);
  });
});
