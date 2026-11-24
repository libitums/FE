// 한글 → 로마자 변환입니다(ADR-0188 D4). 콘텐츠에 로마자가 없을 때만 쓰는 대체 원천이고, 국어의 로마자 표기법(2000)과
// 표준 발음의 소리 바뀜 가운데 아래 규칙만 적습니다. 소리 바뀜은 낱말(한글 음절이 이어진 덩어리) 안에서만 일어납니다.
//
//   R1 음절표 — 초성 · 중성 · 받침 대표음(k · n · t · l · m · p · ng).
//   R2 연음 — 받침 + ㅇ 초성은 받침이 다음 음절 첫소리로 넘어갑니다(겹받침은 뒤 자음만, ㅎ은 소리 나지 않음).
//   R3 비음화 — k · t · p 받침 + ㄴ · ㅁ → ng · n · m.
//   R4 유음화 — ㄴ + ㄹ · ㄹ + ㄴ · ㄹ + ㄹ → ll.
//   R5 ㄹ의 비음화 — ㄴ · ㄹ 아닌 받침 + ㄹ → ㄹ은 n(받침 k · t · p는 R3처럼 ng · n · m).
//   R6 거센소리 — ㅎ 받침(ㅎ · ㄶ · ㅀ) + ㄱ · ㄷ · ㅈ → k · t · ch, + ㅅ → ss. 받침 ㄱ · ㄷ · ㅂ · ㅈ + ㅎ → k · t · p · ch.
//      (문장 모드만. 체언의 ㄱ · ㄷ · ㅂ + ㅎ을 밝혀 적는 표기법 예외는 낱말 모드가 따릅니다 — 북한 bukhan.)
//   R7 구개음화 — ㄷ · ㅌ 받침 + 이 → ji · chi, ㄷ + 히 → chi(문장 모드만).
//   R8 된소리는 적지 않습니다(학교 hakgyo).
// 적지 않는 것: ㄴ 첨가, 사이시옷, 한자어 ㄹ 예외(의견란 uigyeollan 등), 띄어쓰기를 넘는 소리 바뀜.

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

const GIYEOK_INITIAL = 0;
const NIEUN_INITIAL = 2;
const DIGEUT_INITIAL = 3;
const RIEUL_INITIAL = 5;
const MIEUM_INITIAL = 6;
const SIOT_INITIAL = 9;
const IEUNG_INITIAL = 11;
const JIEUT_INITIAL = 12;
const HIEUT_INITIAL = 18;
const I_MEDIAL = 20;

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
  15: { rep: "l", link: ["", "r"] },
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

/** ㅎ 받침(ㅎ · ㄶ · ㅀ) — 남는 받침입니다(R6). */
const HIEUT_FINAL_REMAIN: Readonly<Record<number, string>> = { 27: "", 6: "n", 15: "l" };
/** ㅎ 받침 뒤 초성이 거센소리가 되는 자리(R6). */
const ASPIRATED_AFTER_HIEUT: Readonly<Record<number, string>> = {
  [GIYEOK_INITIAL]: "k",
  [DIGEUT_INITIAL]: "t",
  [JIEUT_INITIAL]: "ch",
  [SIOT_INITIAL]: "ss",
};
/** 받침의 이어 읽는 첫소리가 ㅎ과 만나 되는 거센소리(R6). */
const ASPIRATED_ONSET: Readonly<Record<string, string>> = {
  g: "k",
  kk: "k",
  k: "k",
  d: "t",
  t: "t",
  s: "t",
  ss: "t",
  ch: "t",
  j: "ch",
  b: "p",
  p: "p",
};
/** ㄷ · ㅌ · ㄾ 받침의 구개음화(R7): 이 → [남는 받침, 첫소리]. */
const PALATAL: Readonly<Record<number, readonly [remain: string, onset: string]>> = {
  7: ["", "j"],
  25: ["", "ch"],
  13: ["l", "ch"],
};

type Syllable = { initial: number; medial: number; final: number };
type Mode = { readonly sentence: boolean };

function isSyllable(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return code >= HANGUL_FIRST && code <= HANGUL_LAST;
}

function syllableOf(char: string): Syllable {
  const offset = (char.codePointAt(0) ?? 0) - HANGUL_FIRST;
  return {
    initial: Math.floor(offset / (MEDIAL_COUNT * FINAL_COUNT)),
    medial: Math.floor(offset / FINAL_COUNT) % MEDIAL_COUNT,
    final: offset % FINAL_COUNT,
  };
}

// 경계 하나(앞 음절 받침 · 뒤 음절 첫소리)의 소리 바뀜입니다. 바뀌었으면 true.
function sentenceBoundary(
  syllable: Syllable,
  next: Syllable,
  info: Final,
  codas: string[],
  onsets: string[],
  index: number,
): boolean {
  const hieutRemain = HIEUT_FINAL_REMAIN[syllable.final];
  if (hieutRemain !== undefined) {
    const aspirated = ASPIRATED_AFTER_HIEUT[next.initial];
    if (aspirated !== undefined) {
      codas[index] = hieutRemain;
      onsets[index + 1] = aspirated;
      return true;
    }
  }
  const palatal = PALATAL[syllable.final];
  if (palatal !== undefined && next.medial === I_MEDIAL) {
    if (next.initial === IEUNG_INITIAL) {
      codas[index] = palatal[0];
      onsets[index + 1] = palatal[1];
      return true;
    }
    if (next.initial === HIEUT_INITIAL) {
      codas[index] = palatal[0];
      onsets[index + 1] = "ch";
      return true;
    }
  }
  if (next.initial === HIEUT_INITIAL && info.link !== null && hieutRemain === undefined) {
    const aspirated = ASPIRATED_ONSET[info.link[1]];
    if (aspirated !== undefined) {
      codas[index] = info.link[0];
      onsets[index + 1] = aspirated;
      return true;
    }
  }
  return false;
}

function romanizeWord(syllables: readonly Syllable[], mode: Mode): string {
  // 음절마다 [첫소리, 받침] 로마자를 정한 뒤, 경계마다 이어 읽기 · 소리 바뀜을 적용합니다.
  const onsets: string[] = syllables.map((syllable) => INITIALS[syllable.initial] ?? "");
  const codas = syllables.map((syllable) => FINALS[syllable.final]?.rep ?? "");
  syllables.forEach((syllable, index) => {
    const next = syllables[index + 1];
    const info = FINALS[syllable.final];
    if (next === undefined || info === undefined) {
      return;
    }
    if (mode.sentence && sentenceBoundary(syllable, next, info, codas, onsets, index)) {
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

/**
 * 한글 음절로만 된 낱말을 적습니다(체언 규칙 — R6 · R7 없음). 나라 표가 씁니다. 한글 음절이 아닌 글자가 있거나 비면
 * 던집니다.
 */
export function romanizeHangul(word: string): string {
  const chars = Array.from(word);
  if (chars.length === 0) {
    throw new Error("빈 낱말입니다");
  }
  const bad = chars.find((char) => !isSyllable(char));
  if (bad !== undefined) {
    throw new Error(`한글 음절이 아닌 글자가 있습니다: ${JSON.stringify(bad)}`);
  }
  return romanizeWord(chars.map(syllableOf), { sentence: false });
}

/**
 * 문장을 적습니다 — 한글 음절이 이어진 덩어리마다 R1 ~ R8로 바꾸고, 그 밖의 글자(공백 · 문장부호 · 라틴 · 숫자 · 자모)는
 * 그대로 둡니다. 소리 바뀜은 덩어리를 넘지 않습니다.
 */
export function romanizeKorean(text: string): string {
  let out = "";
  let run: Syllable[] = [];
  const flush = () => {
    if (run.length > 0) out += romanizeWord(run, { sentence: true });
    run = [];
  };
  for (const char of Array.from(text)) {
    if (isSyllable(char)) {
      run.push(syllableOf(char));
    } else {
      flush();
      out += char;
    }
  }
  flush();
  return out;
}
