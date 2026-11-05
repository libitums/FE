import { afterEach, expect, test, vi } from "vitest";

import { onUiLanguageSaved, saveUiLanguage } from "./ui-language";

// `unit` 계층: UI 언어를 저장하는 순간 등록한 함수들이 그 언어로 불린다(ADR-0102 D3 — 번역 받기 재실행의 신호).

afterEach(() => {
  vi.unstubAllGlobals();
});

const stubStorage = () =>
  vi.stubGlobal("NativeModules", {
    StorageModule: { get: () => null, set: () => {}, remove: () => {} },
  });

test("UL1. 저장하면 등록한 함수가 그 언어로 한 번 불리고, 떼면 더 불리지 않는다", () => {
  stubStorage();
  const listener = vi.fn();
  const off = onUiLanguageSaved(listener);

  saveUiLanguage("ja");
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener).toHaveBeenCalledWith("ja");

  off();
  saveUiLanguage("vi");
  expect(listener).toHaveBeenCalledTimes(1);
});

test("UL2. 한 함수가 던져도 저장과 다른 함수는 멈추지 않는다", () => {
  stubStorage();
  const second = vi.fn();
  const offA = onUiLanguageSaved(() => {
    throw new Error("boom");
  });
  const offB = onUiLanguageSaved(second);

  expect(() => saveUiLanguage("es")).not.toThrow();
  expect(second).toHaveBeenCalledWith("es");
  offA();
  offB();
});
