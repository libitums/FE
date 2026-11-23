import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ADULT_ACK_ASKED_KEY, deviceAdultAckAskedStore } from "./adult-ack-store";

// `unit` 계층(CF-U7): 「Get closer」 시트를 보였는지는 계정마다 기기에 적는다(ADR-0164 — 한 번만 묻기).

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

describe("CF-U7 물었는지 기록", () => {
  test("처음엔 묻지 않았다 · 적으면 같은 계정은 물었다 · 다른 계정은 아니다", () => {
    const a = deviceAdultAckAskedStore("server:a");
    expect(a.asked()).toBe(false);
    a.markAsked();
    expect(a.asked()).toBe(true);
    expect(deviceAdultAckAskedStore("server:a").asked()).toBe(true);
    expect(deviceAdultAckAskedStore("server:b").asked()).toBe(false);
    expect(JSON.parse(store.get(ADULT_ACK_ASKED_KEY) ?? "{}")).toEqual({ "server:a": true });
  });

  test("저장 값이 틀리면 묻지 않은 것으로 · 다른 계정 기록은 지우지 않는다", () => {
    store.set(ADULT_ACK_ASKED_KEY, "not json");
    expect(deviceAdultAckAskedStore("server:a").asked()).toBe(false);
    store.set(ADULT_ACK_ASKED_KEY, JSON.stringify({ "server:b": true }));
    deviceAdultAckAskedStore("server:a").markAsked();
    expect(JSON.parse(store.get(ADULT_ACK_ASKED_KEY) ?? "{}")).toEqual({
      "server:b": true,
      "server:a": true,
    });
  });
});
