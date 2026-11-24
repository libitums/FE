import { afterEach, describe, expect, test, vi } from "vitest";

// `unit` 계층(MG-U4): 기기 기록 — 저장소를 못 쓰면 안내는 안 뜨고(매번 뜨지 않게) 탭 배지도 안 붙는다(늘 붙어 있지 않게).

const storage = vi.hoisted(() => ({
  available: true,
  values: new Map<string, string>(),
  failWrite: false,
}));
vi.mock("../../lib/storage", () => ({
  isStorageAvailable: () => storage.available,
  getItem: (key: string) => storage.values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    if (storage.failWrite) throw new Error("write failed");
    storage.values.set(key, value);
  },
}));

import {
  deviceGuideStore,
  markMessengerTabVisited,
  messengerGuideSeenStorageKey,
  messengerKeyboardGuideSeenStorageKey,
  messengerTabVisited,
} from "./messenger-guide";

afterEach(() => {
  storage.available = true;
  storage.failWrite = false;
  storage.values.clear();
});

describe("기기 기록", () => {
  test("MG-U4 처음엔 안 봄 · 안 들어감, 남기면 다음에도(재시작 = 같은 저장소) 그대로", () => {
    expect(deviceGuideStore.unseen("list")).toBe(true);
    expect(messengerTabVisited()).toBe(false);
    deviceGuideStore.markSeen("list");
    markMessengerTabVisited();
    expect(deviceGuideStore.unseen("list")).toBe(false);
    expect(deviceGuideStore.unseen("room")).toBe(true);
    expect(messengerTabVisited()).toBe(true);
  });

  test("MG-U4 저장소를 못 쓰면 안내는 안 뜨고 탭은 들어간 것으로 본다", () => {
    storage.available = false;
    expect(deviceGuideStore.unseen("list")).toBe(false);
    expect(messengerTabVisited()).toBe(true);
  });

  test("MG-U4 쓰기가 실패해도 던지지 않고, 본 것으로 남지 않는다", () => {
    storage.failWrite = true;
    expect(() => deviceGuideStore.markSeen("room")).not.toThrow();
    expect(() => markMessengerTabVisited()).not.toThrow();
    expect(deviceGuideStore.unseen("room")).toBe(true);
  });
});

// ADR-0190: 키보드 단계는 따로 둔 키에 적습니다 — 기존 `guide-seen` 배열의 뜻(목록 · 방 · 예시)은 그대로.
test("MG-U14 키보드 단계 기록은 새 키 하나 — 기존 기록에 섞이지 않고, 기존 기록이 있어도 키보드는 안 본 것", () => {
  storage.values.set(messengerGuideSeenStorageKey, JSON.stringify(["list", "room", "snapshot"]));
  expect(deviceGuideStore.unseen("keyboard")).toBe(true);
  expect(deviceGuideStore.unseen("room")).toBe(false);
  deviceGuideStore.markSeen("keyboard");
  expect(storage.values.get(messengerKeyboardGuideSeenStorageKey)).toBe("1");
  expect(storage.values.get(messengerGuideSeenStorageKey)).toBe(
    JSON.stringify(["list", "room", "snapshot"]),
  );
  expect(deviceGuideStore.unseen("keyboard")).toBe(false);
  storage.available = false;
  expect(deviceGuideStore.unseen("keyboard")).toBe(false);
});
