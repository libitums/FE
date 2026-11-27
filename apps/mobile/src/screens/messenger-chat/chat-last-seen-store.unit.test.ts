import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { serverAccountKey } from "./chat-local-stores";
import { LAST_SEEN_KEY, deviceLastSeenStore, forgetLastSeen } from "./chat-last-seen-store";

// `unit` 계층(LSS-U1 ~ U5): 본 마지막 인물 메시지의 기기 저장 — 계정마다 따로, 인물마다 하나. 로그아웃 · 계정 삭제에 그 계정 것만 지운다.

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

describe("본 마지막 인물 메시지 저장 (LSS-U1 ~ U5)", () => {
  test("LSS-U1 적은 값을 새로 만든 저장(다시 켬)이 읽는다", () => {
    deviceLastSeenStore(A).write("mina", { id: "a1", at: 100 });
    expect(deviceLastSeenStore(A).read("mina")).toEqual({ id: "a1", at: 100 });
    expect(deviceLastSeenStore(A).read("duksu")).toBeNull();
  });

  test("LSS-U2 계정마다 따로 — 다른 계정에 보이지 않는다", () => {
    deviceLastSeenStore(A).write("mina", { id: "a1", at: 100 });
    deviceLastSeenStore(B).write("mina", { id: "b1", at: 200 });
    expect(deviceLastSeenStore(A).read("mina")).toEqual({ id: "a1", at: 100 });
    expect(deviceLastSeenStore(B).read("mina")).toEqual({ id: "b1", at: 200 });
  });

  test("LSS-U3 같은 값이면 다시 쓰지 않는다", () => {
    const seen = deviceLastSeenStore(A);
    seen.write("mina", { id: "a1", at: 100 });
    const set = vi.fn();
    vi.stubGlobal("NativeModules", {
      StorageModule: { get: (key: string) => store.get(key) ?? null, set, remove: () => undefined },
    });
    seen.write("mina", { id: "a1", at: 100 });
    expect(set).not.toHaveBeenCalled();
  });

  test("LSS-U4 그 계정 것만 지운다", () => {
    const seen = deviceLastSeenStore(A);
    seen.write("mina", { id: "a1", at: 100 });
    deviceLastSeenStore(B).write("mina", { id: "b1", at: 200 });
    forgetLastSeen(A);
    expect(deviceLastSeenStore(A).read("mina")).toBeNull();
    expect(deviceLastSeenStore(B).read("mina")).toEqual({ id: "b1", at: 200 });
    expect(JSON.parse(store.get(LAST_SEEN_KEY) ?? "{}")).not.toHaveProperty(A);
  });

  test("LSS-U5 틀린 저장값 · 저장소 오류는 적힌 것 없음 — 던지지 않는다", () => {
    store.set(LAST_SEEN_KEY, "not json");
    expect(deviceLastSeenStore(A).read("mina")).toBeNull();
    store.set(LAST_SEEN_KEY, JSON.stringify({ [A]: { mina: { id: 3 } } }));
    expect(deviceLastSeenStore(A).read("mina")).toBeNull();
    vi.stubGlobal("NativeModules", {
      StorageModule: {
        get: () => {
          throw new Error("boom");
        },
        set: () => {
          throw new Error("boom");
        },
        remove: () => undefined,
      },
    });
    const seen = deviceLastSeenStore(A);
    expect(() => seen.write("mina", { id: "a1", at: 1 })).not.toThrow();
    expect(seen.read("mina")).toEqual({ id: "a1", at: 1 });
  });
});
