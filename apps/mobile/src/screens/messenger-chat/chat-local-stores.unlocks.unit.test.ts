import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  UNLOCKED_BY_ACCOUNT_KEY,
  UNLOCKED_KEY,
  deviceUnlockStore,
  forgetDeviceUnlocks,
  serverAccountKey,
} from "./chat-local-stores";

// `unit` 계층(UA-U1 ~ U5): 해금 기록은 계정마다 따로 적는다(2026-11-17 — 같은 기기에서 탈퇴 뒤 다시 가입한 계정에 앞 계정의
// 정윤경 · 미나가 열려 있던 것). 옛 기기 하나짜리 목록은 처음 읽는 계정 하나로만 옮기고 지운다. 손님 해금은 로그인한 계정이 받는다.

let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const A = serverAccountKey("user-a");
const B = serverAccountKey("user-b");
const ids = (accountKey: string) => [...deviceUnlockStore(accountKey).read()].sort();

describe("계정마다 해금 기록 (UA-U1 ~ U5)", () => {
  test("UA-U1 한 계정이 연 인물은 다른 계정에 보이지 않는다", () => {
    expect(A).toBe("server:user-a");
    deviceUnlockStore(A).add("mina");
    deviceUnlockStore(A).add("yoonkyung");
    expect(ids(A)).toEqual(["mina", "yoonkyung"]);
    expect(ids(B)).toEqual([]);
    expect(UNLOCKED_BY_ACCOUNT_KEY).toBe("libitum.messenger.unlocked-by-account");
  });

  test("UA-U2 옛 기기 하나짜리 목록은 처음 읽는 계정이 받고, 옛 키는 지워져 다음 계정은 받지 않는다", () => {
    store.set(UNLOCKED_KEY, JSON.stringify(["mina", "yoonkyung"]));
    expect(ids(A)).toEqual(["mina", "yoonkyung"]);
    expect(store.has(UNLOCKED_KEY)).toBe(false);
    expect(ids(B)).toEqual([]);
    // 옮긴 뒤에도 A의 기록은 남는다.
    expect(ids(A)).toEqual(["mina", "yoonkyung"]);
  });

  test("UA-U3 손님(가짜 출처)이 연 인물은 로그인한 계정이 받고 손님 기록은 지운다", () => {
    deviceUnlockStore("fixture").add("mina");
    deviceUnlockStore(A).add("doyun");
    expect(ids(A)).toEqual(["doyun", "mina"]);
    expect(ids("fixture")).toEqual([]);
    expect(ids(B)).toEqual([]);
  });

  test("UA-U4 계정을 잊으면 그 계정의 해금만 지운다", () => {
    deviceUnlockStore(A).add("mina");
    deviceUnlockStore(B).add("doyun");
    forgetDeviceUnlocks(A);
    expect(ids(A)).toEqual([]);
    expect(ids(B)).toEqual(["doyun"]);
  });

  test("UA-U5 틀린 저장 값 · 저장소 오류는 빈 기록으로 읽고 던지지 않는다", () => {
    store.set(UNLOCKED_BY_ACCOUNT_KEY, "not-json");
    expect(ids(A)).toEqual([]);
    store.set(UNLOCKED_BY_ACCOUNT_KEY, JSON.stringify({ [A]: ["mina", 3, ""] }));
    expect(ids(A)).toEqual(["mina"]);
    vi.stubGlobal("NativeModules", {
      StorageModule: {
        get: () => {
          throw new Error("native module failed");
        },
        set: () => {
          throw new Error("quota");
        },
        remove: () => undefined,
      },
    });
    expect(() => deviceUnlockStore(A).add("doyun")).not.toThrow();
    expect(() => deviceUnlockStore(A).read()).not.toThrow();
  });
});
