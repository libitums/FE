// 메인 스레드에는 영어 문구표만 남깁니다(ADR-0031 「대가」). 실제 언어는 background 렌더가 냅니다.

import { afterEach, expect, test, vi } from "vitest";

import { entryLanguages } from "./entry-language";
import { uiCopyCatalog, uiCopyFor } from "./ui-copy";
import { uiCopyEn } from "./ui-copy-en";
import { loadUiLanguage } from "./ui-language";

function onThread(thread: "main" | "background"): void {
  vi.stubGlobal("__MAIN_THREAD__", thread === "main");
  vi.stubGlobal("__BACKGROUND__", thread === "background");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("MT1. 메인 스레드의 uiCopyFor는 어느 언어를 받아도 영어 표다", () => {
  onThread("main");
  for (const language of entryLanguages) {
    expect(uiCopyFor(language)).toBe(uiCopyEn);
  }
});

test("MT2. background의 uiCopyFor는 일곱 언어 모두 요청한 언어의 표다", () => {
  onThread("background");
  for (const language of entryLanguages) {
    expect(uiCopyFor(language)).toBe(uiCopyCatalog[language]);
  }
});

test("MT3. NativeModules가 없는 메인 스레드의 첫 언어는 en이라 문구표와 어긋나지 않는다", () => {
  onThread("main");
  vi.stubGlobal("NativeModules", undefined);
  expect(loadUiLanguage()).toBe("en");
  expect(uiCopyFor(loadUiLanguage())).toBe(uiCopyEn);
});
