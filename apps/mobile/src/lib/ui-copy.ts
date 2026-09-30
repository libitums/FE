// 문구표 조회 · context입니다. 화면은 `useUiCopy()`로 완전한 `UiCopy`만 받습니다.

import { createContext, useContext } from "@lynx-js/react";

import type {
  UiCopy,
  UiCopyCatalog,
  UiCopyFor,
  UiCopyOverrides,
  UiCopyWithOverrides,
  UiLanguage,
  UseUiCopy,
} from "./ui-copy.contract";
import { uiCopyEn } from "./ui-copy-en";

export const uiCopyCatalog: UiCopyCatalog = { en: uiCopyEn, vi: {}, es: {}, ja: {} };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// 덮어쓰기의 평범한 객체는 재귀, 문자열 · 함수는 통째 교체, 없거나 undefined인 키는 기준값.
function merge(base: unknown, overrides: unknown): unknown {
  if (overrides === undefined) {
    return base;
  }
  if (!isPlainObject(base) || !isPlainObject(overrides)) {
    return overrides;
  }
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(base)) {
    result[key] = merge(base[key], overrides[key]);
  }
  return result;
}

export const uiCopyWithOverrides: UiCopyWithOverrides = (base, overrides) =>
  merge(base, overrides) as UiCopy;

// 언어마다 한 번 지어 두는 표입니다 — 같은 언어면 늘 같은 객체라 Provider 값이 렌더마다 바뀌지 않습니다.
function buildTable(language: UiLanguage): UiCopy {
  if (language === "en") {
    return uiCopyEn;
  }
  const overrides: UiCopyOverrides = uiCopyCatalog[language];
  return uiCopyWithOverrides(uiCopyEn, overrides);
}

const tables: Readonly<Record<UiLanguage, UiCopy>> = {
  en: buildTable("en"),
  vi: buildTable("vi"),
  es: buildTable("es"),
  ja: buildTable("ja"),
};

export const uiCopyFor: UiCopyFor = (language) => tables[language];

// Provider 없이 그린 컴포넌트도 영어를 받습니다.
export const UiCopyContext = createContext<UiCopy>(uiCopyEn);

export const useUiCopy: UseUiCopy = () => useContext(UiCopyContext);
