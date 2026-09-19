import { expect, test } from "vitest";

import {
  entryLanguageLabel,
  entryLanguages,
  initialEntryLanguage,
  type EntryLanguage,
} from "./entry-language";

// 계약: .agent-harness/work/lib-261/spec.md §2.2(순수 타입 계약) · §3(pureFunctions)
// 계획: .agent-harness/work/lib-261/test-plan.md unit § `lib/entry-language.unit.test.ts`
// (신설). 케이스 id는 계획의 EL1~EL3 그대로다. 라벨 리터럴 자체는 자리표라
// 단언하지 않는다(계약 §8 · test-plan.md 「스텁 기준」 D-b) — 공백 아님·서로 다름만 본다.

// EL1
test("EL1. entryLanguages가 비어 있지 않고 중복이 없다", () => {
  expect(entryLanguages.length).toBeGreaterThan(0);
  expect(new Set(entryLanguages).size).toBe(entryLanguages.length);
});

// EL2 — 리터럴("ko")을 직접 단언하지 않는다. entryLanguages[0]과의 관계만 본다.
test("EL2. initialEntryLanguage가 entryLanguages[0]과 같다", () => {
  expect(initialEntryLanguage).toBe(entryLanguages[0]);
});

// EL3
const allEntryLanguages: readonly EntryLanguage[] = ["ko", "en", "ja", "vi"];

test("EL3. 네 코드 각각에 대해 entryLanguageLabel이 공백 아닌 문자열이고 넷이 서로 다르다", () => {
  const labels = allEntryLanguages.map((language) => entryLanguageLabel(language));

  for (const label of labels) {
    expect(label.trim().length).toBeGreaterThan(0);
  }
  expect(new Set(labels).size).toBe(allEntryLanguages.length);
});
