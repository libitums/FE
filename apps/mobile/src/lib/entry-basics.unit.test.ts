import { expect, test } from "vitest";

import {
  ENTRY_BASICS_LETTERS,
  ENTRY_BASICS_SENTENCE,
  ENTRY_BASICS_WORDS,
  lettersHearable,
} from "./entry-basics";
import { jamoSoundOf, LETTER_SOUND_SYLLABLES } from "./letters/jamo";

// `unit` 계층: 입장 전 기초의 글자 · 문장 · 「눌러서 듣기」 판정(ADR-0176).

test("EB1. 글자는 ㄱ ㄴ ㄷ · ㅏ ㅓ ㅗ 여섯이고 로마자는 자모표의 값이다", () => {
  expect(ENTRY_BASICS_LETTERS.map((l) => `${l.letter}:${l.roman}:${l.group}`)).toEqual([
    "ㄱ:g / k:consonants",
    "ㄴ:n:consonants",
    "ㄷ:d / t:consonants",
    "ㅏ:a:vowels",
    "ㅓ:eo:vowels",
    "ㅗ:o:vowels",
  ]);
});

test("EB2. 여섯 글자의 소리는 모두 소리 파일 목록에 있다", () => {
  expect(ENTRY_BASICS_LETTERS).toHaveLength(6);
  for (const { letter } of ENTRY_BASICS_LETTERS)
    expect(LETTER_SOUND_SYLLABLES).toContain(jamoSoundOf(letter));
});

test("EB3. 준비 완료는 문제 순서(가 · 너 · 도)의 칸을 「너 도 가」로 다시 놓는다", () => {
  expect(ENTRY_BASICS_WORDS).toEqual([
    { syllable: "너", roman: "neo", round: 1 },
    { syllable: "도", roman: "do", round: 2 },
    { syllable: "가", roman: "ga", round: 0 },
  ]);
  expect(ENTRY_BASICS_SENTENCE).toBe("너도 가?");
});

test("EB4. 여섯 소리가 다 있을 때만 들을 수 있다고 약속한다", () => {
  expect(lettersHearable((syllable) => `src:${syllable}`)).toBe(true);
  expect(lettersHearable((syllable) => (syllable === "오" ? null : `src:${syllable}`))).toBe(false);
  expect(lettersHearable(() => null)).toBe(false);
});
