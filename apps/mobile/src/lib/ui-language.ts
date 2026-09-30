// UI 언어의 저장 접점입니다. 저장소는 `storage.ts`의 접점 하나만 씁니다.
//
// 값은 `UiLanguage` 문자열 하나입니다. 고를 수 있는 언어인지(`isEntryLanguageAvailable`)는
// 보지 않습니다 — 저장된 `vi`는 `vi`로 읽고, 빠진 문구는 표가 영어로 채웁니다.

import { entryLanguages, initialEntryLanguage } from "./entry-language";
import { getItem, setItem } from "./storage";
import type {
  LoadUiLanguage,
  SaveUiLanguage,
  UiLanguageFrom,
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
