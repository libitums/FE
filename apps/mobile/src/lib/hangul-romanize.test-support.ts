// 테스트 전용입니다 — 제품 번들에 싣지 않습니다. 나라 표의 로마자가 이 규칙의 출력과 같음을 unit이 지킵니다.

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
const FINAL_COUNT = 28;
const MEDIAL_COUNT = 21;

const INITIALS = [
  "g",
  "kk",
  "n",
  "d",
  "tt",
  "r",
  "m",
  "b",
  "pp",
  "s",
  "ss",
  "",
  "j",
  "jj",
  "ch",
  "k",
  "t",
  "p",
  "h",
] as const;

const MEDIALS = [
  "a",
  "ae",
  "ya",
  "yae",
  "eo",
  "e",
  "yeo",
  "ye",
  "o",
  "wa",
  "wae",
  "oe",
  "yo",
  "u",
  "wo",
  "we",
  "wi",
  "yu",
  "eu",
  "ui",
  "i",
] as const;

const IEUNG_INITIAL = 11;
const NIEUN_INITIAL = 2;
const RIEUL_INITIAL = 5;
const MIEUM_INITIAL = 6;

/** 받침의 대표음과, 뒤 음절이 모음(ㅇ)일 때 이어 읽는 몫(남는 받침 · 다음 음절 첫소리)입니다. */
type Final = { rep: string; link: readonly [remain: string, onset: string] | null };

const FINALS: Readonly<Record<number, Final>> = {
  1: { rep: "k", link: ["", "g"] },
  2: { rep: "k", link: ["", "kk"] },
  3: { rep: "k", link: ["k", "s"] },
  4: { rep: "n", link: ["", "n"] },
  5: { rep: "n", link: ["n", "j"] },
  6: { rep: "n", link: ["n", ""] },
  7: { rep: "t", link: ["", "d"] },
  8: { rep: "l", link: ["", "r"] },
  9: { rep: "k", link: ["l", "g"] },
  10: { rep: "m", link: ["l", "m"] },
  11: { rep: "l", link: ["l", "b"] },
  12: { rep: "l", link: ["l", "s"] },
  13: { rep: "l", link: ["l", "t"] },
  14: { rep: "p", link: ["l", "p"] },
  15: { rep: "l", link: ["l", ""] },
  16: { rep: "m", link: ["", "m"] },
  17: { rep: "p", link: ["", "b"] },
  18: { rep: "p", link: ["p", "s"] },
  19: { rep: "t", link: ["", "s"] },
  20: { rep: "t", link: ["", "ss"] },
  21: { rep: "ng", link: null },
  22: { rep: "t", link: ["", "j"] },
  23: { rep: "t", link: ["", "ch"] },
  24: { rep: "k", link: ["", "k"] },
  25: { rep: "t", link: ["", "t"] },
  26: { rep: "p", link: ["", "p"] },
  27: { rep: "t", link: ["", ""] },
};

const NASAL_OF: Readonly<Record<string, string>> = { k: "ng", t: "n", p: "m" };

type Syllable = { initial: number; medial: number; final: number };

function syllablesOf(word: string): Syllable[] {
  return Array.from(word).map((char) => {
    const code = char.codePointAt(0) ?? 0;
    if (code < HANGUL_FIRST || code > HANGUL_LAST) {
      throw new Error(`한글 음절이 아닌 글자가 있습니다: ${JSON.stringify(char)}`);
    }
    const offset = code - HANGUL_FIRST;
    return {
      initial: Math.floor(offset / (MEDIAL_COUNT * FINAL_COUNT)),
      medial: Math.floor(offset / FINAL_COUNT) % MEDIAL_COUNT,
      final: offset % FINAL_COUNT,
    };
  });
}

/** 한글 음절로만 된 낱말을 국어의 로마자 표기법(표준 발음, 소문자)으로 적습니다. 한글 음절이 아닌 글자가 있으면 던집니다. */
export function romanizeHangul(word: string): string {
  const syllables = syllablesOf(word);
  if (syllables.length === 0) {
    throw new Error("빈 낱말입니다");
  }
  // 음절마다 [첫소리, 받침] 로마자를 정한 뒤, 경계마다 이어 읽기 · 소리 바뀜을 적용합니다.
  const onsets: string[] = syllables.map((syllable) => INITIALS[syllable.initial] ?? "");
  const codas = syllables.map((syllable) => FINALS[syllable.final]?.rep ?? "");
  syllables.forEach((syllable, index) => {
    const next = syllables[index + 1];
    const info = FINALS[syllable.final];
    if (next === undefined || info === undefined) {
      return;
    }
    if (next.initial === IEUNG_INITIAL && info.link !== null) {
      codas[index] = info.link[0];
      onsets[index + 1] = info.link[1];
      return;
    }
    const coda = info.rep;
    const nasal = NASAL_OF[coda];
    if (nasal !== undefined && (next.initial === NIEUN_INITIAL || next.initial === MIEUM_INITIAL)) {
      codas[index] = nasal;
    } else if (next.initial === RIEUL_INITIAL) {
      if (coda === "n" || coda === "l") {
        codas[index] = "l";
        onsets[index + 1] = "l";
      } else {
        codas[index] = nasal ?? coda;
        onsets[index + 1] = "n";
      }
    } else if (coda === "l" && next.initial === NIEUN_INITIAL) {
      onsets[index + 1] = "l";
    }
  });
  return syllables
    .map((syllable, index) => `${onsets[index]}${MEDIALS[syllable.medial]}${codas[index]}`)
    .join("");
}
