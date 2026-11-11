import { afterEach, expect, test, vi } from "vitest";

import { openExternalLink } from "./external-link";

// `unit` 계층(SU-U9 ~ U11): 위기 카드의 전화 · 웹 주소를 호스트 `ExternalLinkModule`로 엽니다(ADR-0125).

afterEach(() => {
  vi.unstubAllGlobals();
});

test("SU-U9 열 수 있는 주소면 호스트 open을 부르고 true", () => {
  const open = vi.fn();
  vi.stubGlobal("NativeModules", { ExternalLinkModule: { open } });
  expect(openExternalLink("tel:988")).toBe(true);
  expect(open).toHaveBeenCalledTimes(1);
  expect(open.mock.calls[0]?.[0]).toBe("tel:988");
});

test("SU-U10 열 수 없는 주소 · 모듈 없음이면 부르지 않고 false", () => {
  const open = vi.fn();
  vi.stubGlobal("NativeModules", { ExternalLinkModule: { open } });
  expect(openExternalLink("javascript:alert(1)")).toBe(false);
  expect(open).not.toHaveBeenCalled();
  vi.stubGlobal("NativeModules", {});
  expect(openExternalLink("tel:988")).toBe(false);
});

test("SU-U11 호스트가 던져도 던지지 않고 false", () => {
  vi.stubGlobal("NativeModules", {
    ExternalLinkModule: {
      open: () => {
        throw new Error("boom");
      },
    },
  });
  expect(() => openExternalLink("https://example.org")).not.toThrow();
  expect(openExternalLink("https://example.org")).toBe(false);
});
