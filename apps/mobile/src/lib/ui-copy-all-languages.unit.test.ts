import { describe, expect, test } from "vitest";

import { languageFlags } from "../screens/language-select/language-flags";
import { entryLanguageLabel, entryLanguages, isEntryLanguageAvailable } from "./entry-language";
import { uiCopyCatalog, uiCopyFor } from "./ui-copy";
import { uiCopyEn } from "./ui-copy-en";
import { placeholderProblems } from "./ui-copy-placeholder.test-support";
import { scriptLeaves } from "./ui-copy-script.test-support";
import type { UiLanguage } from "./ui-copy.contract";

// `unit` 계층(LV-U1 ~ U3): 서비스 기반 언어 검증의 앱 쪽 장치(ADR-0185). 화면 언어 여덟 모두에 대해 문구 함수를 여러 표본 인자로 불러
// 자리표시자(이름 · 단어)가 남는지 · 빈 글이 없는지, 영어 밖 언어는 실제로 번역됐는지, 언어 목록 · 라벨 · 국기 · 문구표가 서로 빠짐없이
// 맞는지 본다. 언어를 더하면 이 파일의 기대 목록(`EXPECTED`)부터 바꾸게 된다.

const EXPECTED: readonly UiLanguage[] = ["en", "vi", "id", "es", "ja", "th", "my", "zh-TW"];

test("LV-U1. 화면 언어는 여덟이고 모두 고를 수 있으며, 문구표 · 라벨 · 국기가 빠짐없다", () => {
  expect(entryLanguages).toEqual(EXPECTED);
  for (const language of entryLanguages) {
    expect(isEntryLanguageAvailable(language), language).toBe(true);
    expect(uiCopyCatalog[language], language).toBeDefined();
    expect(entryLanguageLabel(language).trim(), language).not.toBe("");
    expect(languageFlags[language], language).toMatch(/^<svg /);
  }
  expect(new Set(entryLanguages.map(entryLanguageLabel)).size).toBe(entryLanguages.length);
});

describe.each(EXPECTED.filter((language) => language !== "en"))("LV-U2 · %s", (language) => {
  const table = uiCopyFor(language);

  test("영어 표가 아닌 자기 표이고, 영어와 같은 문자열이 10% 아래다", () => {
    expect(table).not.toBe(uiCopyEn);
    const { strings, sameAsEnglish } = scriptLeaves(table, uiCopyEn);
    expect(sameAsEnglish.length / strings.length).toBeLessThan(0.1);
  });

  test("문구 함수를 표본 인자로 부르면 영어에 든 자리표시자가 남고 빈 글이 없다", () => {
    expect(placeholderProblems(table, uiCopyEn)).toEqual({ missing: [], empty: [] });
  });
});

test("LV-U3. 영어 표도 표본 인자에서 빈 글을 내지 않는다", () => {
  expect(placeholderProblems(uiCopyEn, uiCopyEn).empty).toEqual([]);
});
