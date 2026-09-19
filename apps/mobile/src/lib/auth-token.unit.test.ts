import { afterEach, expect, test, vi } from "vitest";

import {
  authTokenStorageKey,
  createTemporaryAuthToken,
  hasAuthToken,
  saveAuthToken,
} from "./auth-token";

// 계약: .agent-harness/work/lib-261/spec.md §2.3(순수 타입 계약) · §3(pureFunctions)
// 계획: .agent-harness/work/lib-261/test-plan.md unit § `lib/auth-token.unit.test.ts`
// (신설). 케이스 id는 계획의 AT1~AT6 그대로다.
//
// `storage.unit.test.ts`의 `vi.stubGlobal` 형태를 그대로 쓴다 — 호스트가 등록하는
// 모듈을 대신 세운다(테스트 환경에는 네이티브가 없다).
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

// AT1
test("AT1. authTokenStorageKey가 libitum. 접두사를 갖고 공백이 없다", () => {
  expect(authTokenStorageKey.startsWith("libitum.")).toBe(true);
  expect(authTokenStorageKey).not.toMatch(/\s/);
});

// AT2
test("AT2. createTemporaryAuthToken()이 공백이 아니고 호출마다 같은 값이다", () => {
  const first = createTemporaryAuthToken();
  const second = createTemporaryAuthToken();

  expect(first.trim().length).toBeGreaterThan(0);
  expect(second).toBe(first);
});

// AT3 — ⭐ 수용 기준 4. 저장 뒤 스텁 저장소에 다른 키가 함께 쌓이지 않는지를 본다.
test("AT3. 저장 뒤 스텁 저장소의 키 집합이 authTokenStorageKey 하나다", () => {
  const store = stubHost();

  saveAuthToken(createTemporaryAuthToken());

  expect(Array.from(store.keys())).toEqual([authTokenStorageKey]);
});

// AT4
test("AT4. 저장 전 hasAuthToken()이 거짓이다", () => {
  stubHost();

  expect(hasAuthToken()).toBe(false);
});

// AT5
test("AT5. 저장 후 hasAuthToken()이 참이다", () => {
  stubHost();

  saveAuthToken(createTemporaryAuthToken());

  expect(hasAuthToken()).toBe(true);
});

// AT6 — 저장소 자체를 세우지 않는다(호스트 부재를 그대로 흉내낸다).
test("AT6. 저장소가 없는 환경에서 hasAuthToken()이 거짓이고 saveAuthToken이 던지지 않는다", () => {
  expect(hasAuthToken()).toBe(false);
  expect(() => saveAuthToken(createTemporaryAuthToken())).not.toThrow();
});
