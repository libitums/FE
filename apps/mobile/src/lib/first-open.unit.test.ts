import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  daysBetween,
  daysSinceFirstOpen,
  firstOpenDayStorageKey,
  noteFirstOpen,
  resetFirstOpenForTests,
} from "./first-open";

// 기기 첫 실행일 · 지난 날 수(ADR-0029 「D3 목적 구분」)입니다.

let store: Map<string, string>;
beforeEach(() => {
  resetFirstOpenForTests();
  store = new Map();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (k: string) => store.get(k) ?? null,
      set: (k: string, v: string) => void store.set(k, v),
      remove: (k: string) => void store.delete(k),
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  resetFirstOpenForTests();
});

test("FO-U1 달력 날끼리 센다 — 달 · 해를 넘겨도, 거꾸로면 0", () => {
  expect(daysBetween("2026-11-14", "2026-11-14")).toBe(0);
  expect(daysBetween("2026-11-28", "2026-12-01")).toBe(3);
  expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  expect(daysBetween("2026-11-15", "2026-11-14")).toBe(0);
});

test("FO-U2 처음이면 오늘을 적고, 적힌 값이 있으면 그것을 쓴다", () => {
  expect(noteFirstOpen(new Date(2026, 10, 14, 9))).toBe("2026-11-14");
  expect(store.get(firstOpenDayStorageKey)).toBe("2026-11-14");
  expect(daysSinceFirstOpen(new Date(2026, 10, 17, 23))).toBe("3");
  resetFirstOpenForTests();
  store.set(firstOpenDayStorageKey, "2026-11-01");
  expect(noteFirstOpen(new Date(2026, 10, 14))).toBe("2026-11-01");
  expect(daysSinceFirstOpen(new Date(2026, 10, 14))).toBe("13");
});

test("FO-U3 저장소가 없으면 이번 실행 메모리로 센다 · 깨진 값은 버린다", () => {
  vi.stubGlobal("NativeModules", {});
  expect(daysSinceFirstOpen(new Date(2026, 10, 14))).toBe("0");
  expect(daysSinceFirstOpen(new Date(2026, 10, 16))).toBe("2");
  resetFirstOpenForTests();
  vi.stubGlobal("NativeModules", {
    StorageModule: { get: () => "garbage", set: () => undefined, remove: () => undefined },
  });
  expect(noteFirstOpen(new Date(2026, 10, 14))).toBe("2026-11-14");
});
