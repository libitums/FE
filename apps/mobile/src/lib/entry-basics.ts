// 입장 전 기초 세 걸음(글자 여섯 → 합치기 → 준비 완료)의 순수 어휘입니다(ADR-0176). 한글은 배우는 내용입니다.
// 로마자 · 소리는 자모표(`letters/jamo.ts`)의 값을 그대로 씁니다.

import { JAMO_GROUPS, jamoSoundOf, syllableRomanOf } from "./letters/jamo";
import type { JamoGroupId } from "./letters/jamo";

export type EntryBasicsLetter = {
  readonly letter: string;
  readonly roman: string;
  readonly group: Extract<JamoGroupId, "consonants" | "vowels">;
};

export type EntryBasicsWord = {
  readonly syllable: string;
  readonly roman: string;
  /** 합치기 문제에서의 자리(가 0 · 너 1 · 도 2) — 준비 완료 칸이 출발하는 자리입니다. */
  readonly round: number;
};

const FIRST_LETTERS = "ㄱㄴㄷㅏㅓㅗ";
/** 문장 순서의 칸 — 숫자는 합치기 문제에서의 자리입니다. */
const SENTENCE_SYLLABLES: readonly (readonly [string, number])[] = [
  ["너", 1],
  ["도", 2],
  ["가", 0],
];

/** 「너도 가?」 — 친구 사이 반말입니다. */
export const ENTRY_BASICS_SENTENCE = "너도 가?";

export const ENTRY_BASICS_LETTERS: readonly EntryBasicsLetter[] =
  /* @__PURE__ */ ((): readonly EntryBasicsLetter[] => {
    const picked: EntryBasicsLetter[] = [];
    for (const group of JAMO_GROUPS) {
      if (group.id !== "consonants" && group.id !== "vowels") continue;
      for (const { letter, roman } of group.letters)
        if (FIRST_LETTERS.indexOf(letter) >= 0) picked.push({ letter, roman, group: group.id });
    }
    return picked;
  })();

export const ENTRY_BASICS_WORDS: readonly EntryBasicsWord[] =
  /* @__PURE__ */ SENTENCE_SYLLABLES.map(([syllable, round]) => ({
    syllable,
    roman: syllableRomanOf(syllable),
    round,
  }));

/** 「눌러서 들어 보세요」라고 말해도 되는가 — 여섯 소리가 다 있을 때만입니다. */
export function lettersHearable(sourceOf: (syllable: string) => string | null): boolean {
  return ENTRY_BASICS_LETTERS.every(({ letter }) => sourceOf(jamoSoundOf(letter)) !== null);
}
