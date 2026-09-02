import { afterEach, expect, test, vi } from "vitest";

import { getItem, isStorageAvailable, removeItem, setItem } from "./storage";

// 호스트가 등록하는 모듈을 대신 세운다. 테스트 환경에는 네이티브가 없다.
function stubHost() {
  const store = new Map<string, string>();
  const mod = {
    get: (k: string) => store.get(k) ?? null,
    set: (k: string, v: string) => void store.set(k, v),
    remove: (k: string) => void store.delete(k),
  };
  vi.stubGlobal("NativeModules", { StorageModule: mod });
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("저장한 값을 그대로 돌려준다", () => {
  stubHost();
  setItem("token", "abc");
  expect(getItem("token")).toBe("abc");
});

test("없는 키는 null이다", () => {
  stubHost();
  expect(getItem("없음")).toBeNull();
});

test("지운 키는 null이 된다", () => {
  stubHost();
  setItem("token", "abc");
  removeItem("token");
  expect(getItem("token")).toBeNull();
});

// 호스트 밖(Explorer·테스트)에서 터지지 않아야 한다.
// 저장소가 없다고 앱이 죽으면 개발 루프가 막힌다.
test("저장소가 없으면 조용히 null이고 터지지 않는다", () => {
  vi.stubGlobal("NativeModules", {});
  expect(isStorageAvailable()).toBe(false);
  expect(getItem("token")).toBeNull();
  expect(() => setItem("token", "abc")).not.toThrow();
});
