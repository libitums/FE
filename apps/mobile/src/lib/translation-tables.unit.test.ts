import { expect, test } from "vitest";

import { sameTranslationTables } from "./translation-tables";

// `unit` 계층: 번역표 두 단계(언어 → 영어 원문 → 번역)의 같음 — 키 순서와 무관하고 직렬화 없이 비교합니다.

test("TT1. 같은 참조 · 둘 다 없음은 같다", () => {
  const table = { vi: { a: "x" } };
  expect(sameTranslationTables(table, table)).toBe(true);
  expect(sameTranslationTables(undefined, undefined)).toBe(true);
});

test("TT2. 키 순서만 다르면 같다", () => {
  expect(
    sameTranslationTables(
      { vi: { a: "x", b: "y" }, ja: { a: "z" } },
      { ja: { a: "z" }, vi: { b: "y", a: "x" } },
    ),
  ).toBe(true);
});

test("TT3. 언어 · 항목 · 값 중 하나라도 다르면 다르다", () => {
  expect(sameTranslationTables({ vi: { a: "x" } }, undefined)).toBe(false);
  expect(sameTranslationTables({ vi: { a: "x" } }, { vi: { a: "x" }, ja: { a: "z" } })).toBe(false);
  expect(sameTranslationTables({ vi: { a: "x" } }, { ja: { a: "x" } })).toBe(false);
  expect(sameTranslationTables({ vi: { a: "x" } }, { vi: { a: "x", b: "y" } })).toBe(false);
  expect(sameTranslationTables({ vi: { a: "x" } }, { vi: { a: "w" } })).toBe(false);
});
