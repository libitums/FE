import { afterEach, expect, test, vi } from "vitest";

import { getItem, isStorageAvailable, removeItem, setItem } from "./storage";

// 호스트가 등록하는 모듈을 대신 세웁니다. 테스트 환경에는 네이티브가 없습니다.
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

// 호스트 밖(Explorer·테스트)에서 터지지 않아야 합니다.
// 저장소가 없다고 앱이 죽으면 개발 루프가 막힙니다.
test("저장소가 없으면 조용히 null이고 터지지 않는다", () => {
  vi.stubGlobal("NativeModules", {});
  expect(isStorageAvailable()).toBe(false);
  expect(getItem("token")).toBeNull();
  expect(() => setItem("token", "abc")).not.toThrow();
});

// ---------------------------------------------------------- 모듈 값이 null일 때
//
// registerModule이 이 프레임에서 아직 안 끝났을 때 관찰되는 값입니다 — `undefined`가
// 아니라 `null`입니다. `nativeModule()`의 반환 타입 `StorageModule | undefined`가
// 이 값을 감추므로, 캐스팅만 믿으면 이 축이 조용히 새나갑니다. 이 정규화가 없으면
// `isStorageAvailable`이 이름의 주장과 반대로 `null`에 `true`를 돌려줍니다 —
// `storage.ts`의 `?? undefined` 줄이 `null`을 `undefined`로 정규화해 `false`를
// 돌려주는지를 봅니다.

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
// `accessibility.ts`·`audio.ts`·이 파일(storage.ts의 `typeof` 가드) 셋 모두 이 축을
// 가집니다 — `typeof NativeModules === "undefined"` 가드가 앞을 지킵니다. 가드가
// 있어 전역 자체가 없어도 맨 식별자 접근으로 넘어가지 않고 조용히 `undefined`를
// 돌려줍니다. 아래 테스트 셋은 그 가드가 실제로 지켜지는 것을 검증합니다 —
// 전역을 세우지 않습니다.

test("전역 자체가 없으면 isStorageAvailable이 false다 — typeof 가드", () => {
  expect(() => isStorageAvailable()).not.toThrow();
  expect(isStorageAvailable()).toBe(false);
});

test("전역 자체가 없으면 getItem이 null이고 던지지 않는다 — typeof 가드", () => {
  expect(() => getItem("token")).not.toThrow();
  expect(getItem("token")).toBeNull();
});

test("전역 자체가 없으면 setItem·removeItem이 던지지 않는다 — typeof 가드", () => {
  expect(() => setItem("token", "abc")).not.toThrow();
  expect(() => removeItem("token")).not.toThrow();
});

// -------------------------------------------- 전역 자체가 null일 때 (typeof 가드의 사각)
//
// `typeof NativeModules === "undefined"` 가드는 전역이 **없을 때**만 막습니다.
// `typeof null`은 `"object"`라 전역 자체가 `null`이면 이 가드를 통과하고, 다음 줄
// `(NativeModules as Record<string, unknown>)["StorageModule"]`의 색인 접근에서
// TypeError가 납니다 — `audio.ts`·`accessibility.ts`와 같은 자리, 같은 모양입니다.
// 위 「전역 자체가 없을 때 (typeof 가드)」 셋과 대칭인 넷째 축입니다.
//
// 이 축의 가드 자체는 코드로 관측되지만, 전역이 실제로 `null`로 세팅되는 경로가
// 관찰됐는지는 별개입니다 — 근거의 종류는 `storage.ts`의 `nativeModule()` 위 주석을
// 참고합니다.

test("전역 자체가 null이면 isStorageAvailable이 false다 — typeof 가드의 사각", () => {
  vi.stubGlobal("NativeModules", null);

  expect(isStorageAvailable()).toBe(false);
});

test("전역 자체가 null이면 getItem이 null이고 던지지 않는다 — typeof 가드의 사각", () => {
  vi.stubGlobal("NativeModules", null);

  expect(() => getItem("token")).not.toThrow();
  expect(getItem("token")).toBeNull();
});

test("전역 자체가 null이면 setItem·removeItem이 던지지 않는다 — typeof 가드의 사각", () => {
  vi.stubGlobal("NativeModules", null);

  expect(() => setItem("token", "abc")).not.toThrow();
  expect(() => removeItem("token")).not.toThrow();
});
