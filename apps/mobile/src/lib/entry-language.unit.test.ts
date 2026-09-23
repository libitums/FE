import { expect, test } from "vitest";

import {
  entryLanguageLabel,
  entryLanguages,
  initialEntryLanguage,
  isEntryLanguageAvailable,
  type EntryLanguage,
} from "./entry-language";

// 라벨 리터럴 자체는 자리표라 이 파일에서 단언하지 않습니다 — 공백 아님·서로 다름만
// 봅니다.

test("EL1. entryLanguages가 비어 있지 않고 중복이 없다", () => {
  expect(entryLanguages.length).toBeGreaterThan(0);
  expect(new Set(entryLanguages).size).toBe(entryLanguages.length);
});

// EL2 — 리터럴("ko")을 직접 단언하지 않습니다. `entryLanguages[0]`과의 관계만 봅니다.
test("EL2. initialEntryLanguage가 entryLanguages[0]과 같다", () => {
  expect(initialEntryLanguage).toBe(entryLanguages[0]);
});

const allEntryLanguages: readonly EntryLanguage[] = ["en", "vi", "es", "ja"];

test("EL3. 네 코드 각각에 대해 entryLanguageLabel이 공백 아닌 문자열이고 넷이 서로 다르다", () => {
  const labels = allEntryLanguages.map((language) => entryLanguageLabel(language));

  for (const label of labels) {
    expect(label.trim().length).toBeGreaterThan(0);
  }
  expect(new Set(labels).size).toBe(allEntryLanguages.length);
});

// 2026-09-21 디자인 반영 — 영어만 고를 수 있는 언어라는 제약이 이 시점 확정입니다.
test("EL4. 영어만 고를 수 있고 initialEntryLanguage가 고를 수 있는 언어다", () => {
  expect(allEntryLanguages.filter((language) => isEntryLanguageAvailable(language))).toEqual([
    "en",
  ]);
  expect(isEntryLanguageAvailable(initialEntryLanguage)).toBe(true);
});
