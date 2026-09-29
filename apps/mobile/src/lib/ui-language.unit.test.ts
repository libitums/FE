import { afterEach, expect, test, vi } from "vitest";

import { entryLanguages } from "./entry-language";
import {
  loadUiLanguage,
  saveUiLanguage,
  uiLanguageFrom,
  uiLanguageStorageKey,
} from "./ui-language";

function stubStorage(stored: string | null) {
  const get = vi.fn((_key: string) => stored);
  const set = vi.fn();
  const remove = vi.fn();
  vi.stubGlobal("NativeModules", { StorageModule: { get, set, remove } });
  return { get, set, remove };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("UL1. 저장 키가 libitum. 접두의 공백 없는 값이다", () => {
  expect(uiLanguageStorageKey).toBe("libitum.ui.language");
  expect(uiLanguageStorageKey.startsWith("libitum.")).toBe(true);
  expect(/\s/.test(uiLanguageStorageKey)).toBe(false);
});

test("UL2. uiLanguageFrom은 네 언어 코드를 그대로 낸다", () => {
  expect(uiLanguageFrom("en")).toBe("en");
  expect(uiLanguageFrom("vi")).toBe("vi");
  expect(uiLanguageFrom("es")).toBe("es");
  expect(uiLanguageFrom("ja")).toBe("ja");
});

test("UL2. uiLanguageFrom은 모르는 값 · null을 en으로 좁히고 던지지 않는다", () => {
  for (const stored of [null, "", "ko", "EN", " en", "en-US"]) {
    expect(() => uiLanguageFrom(stored)).not.toThrow();
    expect(uiLanguageFrom(stored)).toBe("en");
  }
});

test("UL2. uiLanguageFrom의 결과는 늘 entryLanguages의 멤버다", () => {
  for (const stored of [null, "", "ko", "vi", "es", "ja", "en", "zz", "😀"]) {
    expect(entryLanguages).toContain(uiLanguageFrom(stored));
  }
});

test("UL3. loadUiLanguage는 저장된 값을 키로 한 번 읽어 언어로 낸다", () => {
  const { get, set, remove } = stubStorage("vi");
  expect(loadUiLanguage()).toBe("vi");
  expect(get).toHaveBeenCalledTimes(1);
  expect(get).toHaveBeenCalledWith("libitum.ui.language");
  expect(set).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});

test("UL3. loadUiLanguage는 값이 없으면 en이다", () => {
  const { set, remove } = stubStorage(null);
  expect(loadUiLanguage()).toBe("en");
  expect(set).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});

test("UL3. loadUiLanguage는 저장소가 없어도 en이고 던지지 않는다", () => {
  for (const host of [undefined, {}, { StorageModule: null }]) {
    vi.stubGlobal("NativeModules", host);
    expect(() => loadUiLanguage()).not.toThrow();
    expect(loadUiLanguage()).toBe("en");
  }
});

test("UL4. saveUiLanguage는 set을 키와 값으로 정확히 한 번 부른다", () => {
  const { get, set, remove } = stubStorage(null);
  saveUiLanguage("en");
  expect(set).toHaveBeenCalledTimes(1);
  expect(set).toHaveBeenCalledWith("libitum.ui.language", "en");
  expect(get).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});

test("UL4. saveUiLanguage는 저장소가 없어도 던지지 않는다", () => {
  for (const host of [undefined, {}, { StorageModule: null }]) {
    vi.stubGlobal("NativeModules", host);
    expect(() => saveUiLanguage("ja")).not.toThrow();
  }
});
