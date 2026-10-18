// UI 언어의 저장 접점입니다. 저장소는 `storage.ts`의 접점 하나만 씁니다.
//
// 값은 `UiLanguage` 문자열 하나입니다. 고를 수 있는 언어인지(`isEntryLanguageAvailable`)는
// 보지 않습니다 — 저장된 `vi`는 `vi`로 읽고, 빠진 문구는 표가 영어로 채웁니다.

import { entryLanguages, initialEntryLanguage, isEntryLanguageAvailable } from "./entry-language";
import { getItem, setItem } from "./storage";
import type {
  LoadReturningUiLanguage,
  LoadUiLanguage,
  ReturningUiLanguageFrom,
  SaveUiLanguage,
  UiLanguageFrom,
  UiLanguageFromDeviceTag,
  UiLanguageStorageKey,
} from "./ui-copy.contract";

export const uiLanguageStorageKey: UiLanguageStorageKey = "libitum.ui.language";

// 대소문자 · 공백 보정 없이 멤버와 정확히 같은 문자열만 받습니다.
export const uiLanguageFrom: UiLanguageFrom = (stored) =>
  entryLanguages.find((language) => language === stored) ?? initialEntryLanguage;

export const loadUiLanguage: LoadUiLanguage = () => uiLanguageFrom(getItem(uiLanguageStorageKey));

export const saveUiLanguage: SaveUiLanguage = (language) => {
  setItem(uiLanguageStorageKey, language);
};

// 기기 태그의 주 하위 태그(`ja-JP` → `ja`, `_` 구분 허용)가 고를 수 있는 언어일 때만 받습니다.
export const uiLanguageFromDeviceTag: UiLanguageFromDeviceTag = (deviceLanguageTag) => {
  if (deviceLanguageTag === null) return null;
  const primary = (deviceLanguageTag.trim().split(/[-_]/)[0] ?? "").toLowerCase();
  const language = entryLanguages.find((candidate) => candidate === primary);
  return language !== undefined && isEntryLanguageAvailable(language) ? language : null;
};

// 저장값 → 기기 언어(고를 수 있을 때) → 영어. 저장값은 고를 수 있는지 보지 않습니다.
export const returningUiLanguageFrom: ReturningUiLanguageFrom = (stored, deviceLanguageTag) => {
  const storedLanguage = entryLanguages.find((language) => language === stored);
  return storedLanguage ?? uiLanguageFromDeviceTag(deviceLanguageTag) ?? initialEntryLanguage;
};

// 호스트가 기기 언어를 넘기는 경로가 아직 없어 기기 입력은 `null`입니다. 고를 수 있는 언어가
// 영어뿐이라 실제 기기 언어를 넣어도 결과는 같습니다. 둘째 언어를 열 때 호스트 경로를 세웁니다.
export const loadReturningUiLanguage: LoadReturningUiLanguage = () =>
  returningUiLanguageFrom(getItem(uiLanguageStorageKey), null);
