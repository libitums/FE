// 문구표 조회 · context입니다. 화면은 `useUiCopy()`로 완전한 `UiCopy`만 받습니다.

import { createContext, useContext } from "@lynx-js/react";

import type {
  UiCopy,
  UiCopyCatalog,
  UiCopyFor,
  UiCopyWithOverrides,
  UiLanguage,
  UseUiCopy,
} from "./ui-copy.contract";
import { uiCopyEn } from "./ui-copy-en";
import { uiCopyEs } from "./ui-copy-es";
import { uiCopyId } from "./ui-copy-id";
import { uiCopyJa } from "./ui-copy-ja";
import { uiCopyMy } from "./ui-copy-my";
import { uiCopyTh } from "./ui-copy-th";
import { uiCopyVi } from "./ui-copy-vi";

export const uiCopyCatalog: UiCopyCatalog = {
  en: uiCopyEn,
  vi: uiCopyVi,
  id: uiCopyId,
  es: uiCopyEs,
  ja: uiCopyJa,
  // 2026-11-20 태국어 · 미얀마어도 완전한 표입니다(ADR-0158 개정 — 화면 문구를 번들에 싣고 천장을 올림, ADR-0149 개정).
  th: uiCopyTh,
  my: uiCopyMy,
};

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
// 일곱 언어 모두 완전한 표라 그대로 돌려줍니다(ADR-0091 D3 · 0093 · 0097 · 0098 · 0158 개정). 빈 덮어쓰기를 영어로 채우는
// 병합은 `uiCopyWithOverrides`가 지고, 덮어쓰기만 가진 언어를 다시 둘 때 여기서 부릅니다.
// `default` 없는 switch — 언어가 늘면 TS2366으로 섭니다.
function buildTable(language: UiLanguage): UiCopy {
  switch (language) {
    case "en":
      return uiCopyEn;
    case "vi":
      return uiCopyVi;
    case "id":
      return uiCopyId;
    case "es":
      return uiCopyEs;
    case "ja":
      return uiCopyJa;
    case "th":
      return uiCopyTh;
    case "my":
      return uiCopyMy;
  }
}

// PURE 표시가 있어야 쓰지 않는 스레드의 번들에서 영어 밖 표가 빠집니다(ADR-0031 D8).
const tables: Readonly<Record<UiLanguage, UiCopy>> = {
  en: /*#__PURE__*/ buildTable("en"),
  vi: /*#__PURE__*/ buildTable("vi"),
  id: /*#__PURE__*/ buildTable("id"),
  es: /*#__PURE__*/ buildTable("es"),
  ja: /*#__PURE__*/ buildTable("ja"),
  th: /*#__PURE__*/ buildTable("th"),
  my: /*#__PURE__*/ buildTable("my"),
};

// 메인 스레드에는 `NativeModules`가 없어 저장된 언어를 못 읽으므로 첫 프레임은 늘 영어입니다. 그래서 영어 표만
// 싣고, 실제 언어는 background 렌더가 냅니다. 메인 스레드에서 언어를 알게 되면 이 줄부터 고칩니다(ADR-0031 D8).
export const uiCopyFor: UiCopyFor = (language) => (__MAIN_THREAD__ ? uiCopyEn : tables[language]);

// Provider 없이 그린 컴포넌트도 영어를 받습니다.
export const UiCopyContext = createContext<UiCopy>(uiCopyEn);

export const useUiCopy: UseUiCopy = () => useContext(UiCopyContext);
