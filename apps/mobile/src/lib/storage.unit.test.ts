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

// ---------------------------------------------------------- 모듈 값이 null일 때
//
// registerModule이 이 프레임에서 아직 안 끝났을 때 관찰되는 값이다 — `undefined`가
// 아니라 `null`이다. `nativeModule()`의 반환 타입 `StorageModule | undefined`가
// 이 값을 감춘다. 이 파일은 `typeof` 가드조차 없어(위 파일 주석) `?.`가 유일한
// 방어선인데, 그 방어선이 「사용 가능하다」는 답까지 막아 주지는 않는다 —
// `isStorageAvailable`이 이름의 주장과 반대로 `null`에 `true`를 돌려준다.

test("모듈 값이 null이면 isStorageAvailable이 false다", () => {
  vi.stubGlobal("NativeModules", { StorageModule: null });

  expect(isStorageAvailable()).toBe(false);
});

test("모듈 값이 null이면 getItem이 null이고 던지지 않는다", () => {
  vi.stubGlobal("NativeModules", { StorageModule: null });

  expect(() => getItem("token")).not.toThrow();
  expect(getItem("token")).toBeNull();
});

test("모듈 값이 null이면 setItem·removeItem이 던지지 않는다", () => {
  vi.stubGlobal("NativeModules", { StorageModule: null });

  expect(() => setItem("token", "abc")).not.toThrow();
  expect(() => removeItem("token")).not.toThrow();
});

// -------------------------------------------------- 전역 자체가 없을 때 (typeof 가드)
//
// `accessibility.ts`·`audio.ts`에는 이 축이 이미 있다 — `typeof NativeModules ===
// "undefined"` 가드가 앞을 지킨다. 이 파일(`storage.ts:29~31`)에는 그 가드가 없다 —
// 한 겹 더 나쁘다: 맨 식별자 접근이라 전역 자체가 없으면 `nativeModule()`이
// `ReferenceError: NativeModules is not defined`로 죽는다. 전역을 세우지 않는다.

test("전역 자체가 없으면 isStorageAvailable이 false다 — typeof 가드 없음", () => {
  expect(() => isStorageAvailable()).not.toThrow();
  expect(isStorageAvailable()).toBe(false);
});

test("전역 자체가 없으면 getItem이 null이고 던지지 않는다 — typeof 가드 없음", () => {
  expect(() => getItem("token")).not.toThrow();
  expect(getItem("token")).toBeNull();
});

test("전역 자체가 없으면 setItem·removeItem이 던지지 않는다 — typeof 가드 없음", () => {
  expect(() => setItem("token", "abc")).not.toThrow();
  expect(() => removeItem("token")).not.toThrow();
});
