import { afterEach, expect, test, vi } from "vitest";

import { entryLanguages } from "./entry-language";
import {
  loadReturningUiLanguage,
  loadUiLanguage,
  returningUiLanguageFrom,
  saveUiLanguage,
  uiLanguageFrom,
  uiLanguageFromDeviceTag,
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

test("UL5. uiLanguageFromDeviceTag는 고를 수 있는 영어만 받는다", () => {
  for (const tag of ["en", "en-US", "en_GB", "EN-us"]) {
    expect(uiLanguageFromDeviceTag(tag)).toBe("en");
  }
});

test("UL5. 목록에만 있는 언어 · 모르는 태그 · 빈 값은 null이다", () => {
  for (const tag of ["ja-JP", "ko-KR", "zh-Hant-TW", "", " ", null]) {
    expect(uiLanguageFromDeviceTag(tag)).toBeNull();
  }
});

test("UL5c. 인도네시아어 기기 태그는 id다 — 옛 Android 코드 in도 같다(ADR-0093)", () => {
  for (const tag of ["id", "id-ID", "in", "in-ID", "IN_id"]) {
    expect(uiLanguageFromDeviceTag(tag)).toBe("id");
  }
  expect(returningUiLanguageFrom(null, "in-ID")).toBe("id");
});

test("UL5d. 스페인어 기기 태그는 나라 · 지역과 상관없이 es다(ADR-0097)", () => {
  for (const tag of ["es", "es-ES", "es-419", "es-MX", "ES_ar"]) {
    expect(uiLanguageFromDeviceTag(tag)).toBe("es");
  }
  expect(returningUiLanguageFrom(null, "es-CO")).toBe("es");
});

test("UL5b. 베트남어 기기 태그는 vi다(ADR-0091 D4)", () => {
  for (const tag of ["vi", "vi-VN", "VI_vn"]) {
    expect(uiLanguageFromDeviceTag(tag)).toBe("vi");
  }
  expect(returningUiLanguageFrom(null, "vi-VN")).toBe("vi");
});

test("UL6. returningUiLanguageFrom은 저장값 → 기기 → 영어 순이다", () => {
  expect(returningUiLanguageFrom("ja", "en-US")).toBe("ja");
  expect(returningUiLanguageFrom(null, "en-US")).toBe("en");
  expect(returningUiLanguageFrom(null, "ja-JP")).toBe("en");
  expect(returningUiLanguageFrom("xx", null)).toBe("en");
  expect(returningUiLanguageFrom(" en", null)).toBe("en");
  expect(returningUiLanguageFrom(null, null)).toBe("en");
});

test("UL7. loadReturningUiLanguage는 저장값을 키로 한 번 읽어 낸다", () => {
  const { get, set } = stubStorage("ja");
  expect(loadReturningUiLanguage()).toBe("ja");
  expect(get).toHaveBeenCalledTimes(1);
  expect(get).toHaveBeenCalledWith("libitum.ui.language");
  expect(set).not.toHaveBeenCalled();
});

test("UL7. loadReturningUiLanguage는 비었으면 en이고 저장소가 없어도 던지지 않는다", () => {
  stubStorage(null);
  expect(loadReturningUiLanguage()).toBe("en");
  for (const host of [undefined, {}, { StorageModule: null }]) {
    vi.stubGlobal("NativeModules", host);
    expect(() => loadReturningUiLanguage()).not.toThrow();
    expect(loadReturningUiLanguage()).toBe("en");
  }
});
