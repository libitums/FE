import { afterEach, expect, test, vi } from "vitest";

import { nativeContentDigest } from "./content-files";

// `unit` 계층: 받은 본문의 SHA-256 · UTF-8 바이트 수를 호스트(`ContentFileModule.sha256`)로 계산한다(ADR-0105 D4).
// 모듈 · 메서드가 없거나 답이 틀리면 `null` — 부르는 쪽이 JS 순수 구현으로 되돌아갑니다. 호스트만 대역입니다.

afterEach(() => {
  vi.unstubAllGlobals();
});

const HASH = "a".repeat(64);
const withModule = (sha256?: (text: string) => unknown) =>
  vi.stubGlobal("NativeModules", {
    ContentFileModule: {
      download: () => {},
      fileUrl: () => "",
      remove: () => {},
      ...(sha256 === undefined ? {} : { sha256 }),
    },
  });

test("CD1. 호스트 답 `<sha>:<bytes>`를 읽는다", () => {
  withModule(() => `${HASH}:123`);
  expect(nativeContentDigest("x")).toEqual({ sha256: HASH, bytes: 123 });
});

test("CD2. 모듈이 없거나 sha256 메서드가 없으면(옛 호스트) null이다", () => {
  vi.stubGlobal("NativeModules", {});
  expect(nativeContentDigest("x")).toBeNull();
  withModule();
  expect(nativeContentDigest("x")).toBeNull();
});

test("CD3. 답이 비었거나 모양이 틀리면 null이다", () => {
  for (const reply of ["", "zz:1", `${HASH}`, `${HASH}:-1`, `${HASH}:1.5`, 42, null]) {
    withModule(() => reply);
    expect(nativeContentDigest("x"), String(reply)).toBeNull();
  }
});

test("CD4. 호스트가 던져도 던지지 않고 null이다", () => {
  withModule(() => {
    throw new Error("native");
  });
  expect(nativeContentDigest("x")).toBeNull();
});
