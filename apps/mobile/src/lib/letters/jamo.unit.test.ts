import { describe, expect, test } from "vitest";

import {
  JAMO_GROUPS,
  LETTER_SOUND_SYLLABLES,
  composeSyllable,
  isJamoConsonant,
  jamoSoundOf,
  letterAudioIdOf,
} from "./jamo";

// `unit` 계층: 자모표 40자의 순서 · 로마자 · 누르면 나는 소리 · 소리 파일 id(ADR-0169).

describe("자모표", () => {
  test("JM1. 네 묶음이 보드 순서로 14 · 10 · 5 · 11, 모두 40자", () => {
    expect(JAMO_GROUPS.map((group) => [group.id, group.letters.length])).toEqual([
      ["consonants", 14],
      ["vowels", 10],
      ["doubles", 5],
      ["combined", 11],
    ]);
    expect(JAMO_GROUPS.flatMap((group) => group.letters).length).toBe(40);
  });

  test("JM2. 글자와 로마자는 보드 값(개정 로마자) 그대로", () => {
    const flat = JAMO_GROUPS.flatMap((group) => group.letters.map((l) => `${l.letter}=${l.roman}`));
    expect(flat.slice(0, 14).join(" ")).toBe(
      "ㄱ=g / k ㄴ=n ㄷ=d / t ㄹ=r / l ㅁ=m ㅂ=b / p ㅅ=s ㅇ=silent / ng ㅈ=j ㅊ=ch ㅋ=k ㅌ=t ㅍ=p ㅎ=h",
    );
    expect(flat.slice(14, 24).join(" ")).toBe(
      "ㅏ=a ㅑ=ya ㅓ=eo ㅕ=yeo ㅗ=o ㅛ=yo ㅜ=u ㅠ=yu ㅡ=eu ㅣ=i",
    );
    expect(flat.slice(24, 29).join(" ")).toBe("ㄲ=kk ㄸ=tt ㅃ=pp ㅆ=ss ㅉ=jj");
    expect(flat.slice(29).join(" ")).toBe(
      "ㅐ=ae ㅒ=yae ㅔ=e ㅖ=ye ㅘ=wa ㅙ=wae ㅚ=oe ㅝ=wo ㅞ=we ㅟ=wi ㅢ=ui",
    );
  });
});

describe("소리", () => {
  test.each([
    ["ㄱ", "가"],
    ["ㄴ", "나"],
    ["ㅇ", "아"],
    ["ㅎ", "하"],
    ["ㄲ", "까"],
    ["ㅉ", "짜"],
    ["ㅏ", "아"],
    ["ㅑ", "야"],
    ["ㅡ", "으"],
    ["ㅢ", "의"],
    ["ㅙ", "왜"],
  ])("JM3. %s → %s (자음 + ㅏ, 모음은 ㅇ)", (letter, sound) => {
    expect(jamoSoundOf(letter)).toBe(sound);
  });

  test("JM4. 자모가 아니면 빈 문자열", () => {
    expect(jamoSoundOf("a")).toBe("");
  });

  test("JM5. 자음 판정", () => {
    expect(isJamoConsonant("ㄱ")).toBe(true);
    expect(isJamoConsonant("ㄸ")).toBe(true);
    expect(isJamoConsonant("ㅏ")).toBe(false);
  });

  test.each([
    ["ㄱ", "ㅏ", "가"],
    ["ㄴ", "ㅓ", "너"],
    ["ㄷ", "ㅗ", "도"],
    ["ㅇ", "ㅢ", "의"],
  ])("JM6. %s + %s = %s", (c, v, syllable) => {
    expect(composeSyllable(c, v)).toBe(syllable);
  });

  test("JM7. 자음 + 모음이 아니면 빈 문자열", () => {
    expect(composeSyllable("ㅏ", "ㄱ")).toBe("");
  });
});

describe("소리 파일 id", () => {
  test.each([
    ["가", "letters/ga"],
    ["까", "letters/kka"],
    ["아", "letters/a"],
    ["의", "letters/ui"],
    ["너", "letters/neo"],
    ["도", "letters/do"],
    ["짜", "letters/jja"],
  ])("JM8. %s → %s", (syllable, id) => {
    expect(letterAudioIdOf(syllable)).toBe(id);
  });

  test("JM9. 40자의 소리는 서로 다른 39개 파일(ㅇ과 ㅏ는 같은 아), 퀴즈 너 · 도를 더하면 41개", () => {
    const ids = new Set(
      JAMO_GROUPS.flatMap((group) => group.letters).map((l) =>
        letterAudioIdOf(jamoSoundOf(l.letter)),
      ),
    );
    expect(ids.size).toBe(39);
    expect(ids.has(null)).toBe(false);
    ids.add(letterAudioIdOf("너"));
    ids.add(letterAudioIdOf("도"));
    expect(ids.size).toBe(41);
  });

  test("JM10. 표에 없는 음절은 null", () => {
    expect(letterAudioIdOf("밥")).toBeNull();
  });
});

describe("소리 파일 목록(ADR-0173)", () => {
  test("JM11. 41개 · 겹침 없음 · 모두 소리 파일 id가 있다", () => {
    expect(LETTER_SOUND_SYLLABLES).toHaveLength(41);
    expect(new Set(LETTER_SOUND_SYLLABLES).size).toBe(41);
    for (const syllable of LETTER_SOUND_SYLLABLES) expect(letterAudioIdOf(syllable)).not.toBeNull();
    expect(new Set(LETTER_SOUND_SYLLABLES.map(letterAudioIdOf)).size).toBe(41);
  });

  test("JM12. 자모표 40자의 소리가 보드 순서로 먼저(아는 한 번), 퀴즈 너 · 도가 끝", () => {
    const chart: string[] = [];
    for (const group of JAMO_GROUPS)
      for (const letter of group.letters) {
        const sound = jamoSoundOf(letter.letter);
        if (chart.indexOf(sound) < 0) chart.push(sound);
      }
    expect(LETTER_SOUND_SYLLABLES).toEqual([...chart, "너", "도"]);
    expect(LETTER_SOUND_SYLLABLES.slice(0, 3)).toEqual(["가", "나", "다"]);
  });
});
