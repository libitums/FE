// 말한 문장의 발음형입니다(순수). 인식기가 맞춤법을 달리 적어도(띄어쓰기 · 연음 · 받침 · 된소리) 같은 소리는 같은 열이 되게 합니다.
// 한글 음절을 유니코드 산술로 자모로 나누고 표준 발음 규칙 몇 가지만 적용합니다 — 사전 · 새 의존성 없이.

const INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const VOWELS = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const FINALS = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";

/** 낱말 전체가 이것(과 그 반복)이면 군말로 뗍니다. */
const FILLER = /^(?:어|음|아|그|으|흠|엄)+$/;

/** 겹받침 → [남는 앞 자음, 넘어가는 뒤 자음]. */
const CLUSTERS: Readonly<Record<string, readonly [string, string]>> = {
  ㄳ: ["ㄱ", "ㅅ"],
  ㄵ: ["ㄴ", "ㅈ"],
  ㄺ: ["ㄹ", "ㄱ"],
  ㄻ: ["ㄹ", "ㅁ"],
  ㄼ: ["ㄹ", "ㅂ"],
  ㄽ: ["ㄹ", "ㅅ"],
  ㄾ: ["ㄹ", "ㅌ"],
  ㄿ: ["ㄹ", "ㅍ"],
  ㅄ: ["ㅂ", "ㅅ"],
};
/** ㅎ이 든 받침 → ㅎ을 뗀 받침. */
const WITHOUT_H: Readonly<Record<string, string>> = { ㅎ: "", ㄶ: "ㄴ", ㅀ: "ㄹ" };
/** 예사소리 → 거센소리(ㅎ과 만날 때). */
const ASPIRATED: Readonly<Record<string, string>> = { ㄱ: "ㅋ", ㄷ: "ㅌ", ㅈ: "ㅊ", ㅂ: "ㅍ" };
/** 받침 7대표음. */
const REPRESENTATIVE: Readonly<Record<string, string>> = {
  ㄲ: "ㄱ",
  ㅋ: "ㄱ",
  ㄳ: "ㄱ",
  ㄺ: "ㄱ",
  ㄵ: "ㄴ",
  ㄶ: "ㄴ",
  ㅅ: "ㄷ",
  ㅆ: "ㄷ",
  ㅈ: "ㄷ",
  ㅊ: "ㄷ",
  ㅌ: "ㄷ",
  ㅎ: "ㄷ",
  ㄼ: "ㄹ",
  ㄽ: "ㄹ",
  ㄾ: "ㄹ",
  ㅀ: "ㄹ",
  ㄻ: "ㅁ",
  ㅍ: "ㅂ",
  ㅄ: "ㅂ",
  ㄿ: "ㅂ",
};
/** 비음화 — 받침 ㄱ · ㄷ · ㅂ이 ㄴ · ㅁ 앞에서. */
const NASAL: Readonly<Record<string, string>> = { ㄱ: "ㅇ", ㄷ: "ㄴ", ㅂ: "ㅁ" };
/** 된소리는 예사소리와 같은 소리로 봅니다(인식기가 둘을 자주 바꿔 적습니다). */
const PLAIN: Readonly<Record<string, string>> = {
  ㄲ: "ㄱ",
  ㄸ: "ㄷ",
  ㅃ: "ㅂ",
  ㅆ: "ㅅ",
  ㅉ: "ㅈ",
};
/** 소리가 겹치는 모음. */
const SAME_VOWEL: Readonly<Record<string, string>> = {
  ㅐ: "ㅔ",
  ㅒ: "ㅖ",
  ㅙ: "ㅚ",
  ㅞ: "ㅚ",
  ㅢ: "ㅣ",
};

type Syllable = { initial: string; vowel: string; final: string } | { other: string };

const toNfc = (text: string) =>
  typeof text.normalize === "function" ? text.normalize("NFC") : text;

function syllableOf(char: string): Syllable {
  const code = (char.codePointAt(0) ?? 0) - 0xac00;
  if (code < 0 || code >= 11172) return { other: char.toLowerCase() };
  return {
    initial: INITIALS[Math.floor(code / 588)] ?? "",
    vowel: VOWELS[Math.floor((code % 588) / 28)] ?? "",
    final: (FINALS[code % 28] ?? "").trim(),
  };
}

/** 군말 · 부호를 뗀 낱말들의 음절 열. `wordStart`는 들은 말의 낱말 첫 음절입니다(띄어쓰기는 경계로만 남습니다). */
function syllablesOf(text: string): { syllable: Syllable; wordStart: boolean }[] {
  return toNfc(text)
    .replace(/[^0-9A-Za-z가-힣\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word !== "" && !FILLER.test(word))
    .flatMap((word) =>
      Array.from(word, (char, index) => ({ syllable: syllableOf(char), wordStart: index === 0 })),
    );
}

type Hangul = Extract<Syllable, { initial: string }>;
const isHangul = (syllable: Syllable | undefined): syllable is Hangul =>
  syllable !== undefined && "initial" in syllable;

/** 이웃 두 음절 — ㅎ 탈락 · 축약 뒤 연음. */
function linkPair(left: Hangul, right: Hangul): void {
  const withoutH = WITHOUT_H[left.final];
  if (withoutH !== undefined) {
    if (right.initial === "ㅇ") left.final = withoutH;
    else if (ASPIRATED[right.initial] !== undefined) {
      right.initial = ASPIRATED[right.initial] ?? right.initial;
      left.final = withoutH;
    }
  } else if (right.initial === "ㅎ") {
    const sound = REPRESENTATIVE[left.final] ?? left.final;
    const aspirated = ASPIRATED[sound === "ㄷ" && left.final === "ㅈ" ? "ㅈ" : sound];
    if (aspirated !== undefined) {
      right.initial = aspirated;
      left.final = CLUSTERS[left.final]?.[0] === "ㄹ" ? "ㄹ" : "";
    }
  }
  if (left.final !== "" && left.final !== "ㅇ" && right.initial === "ㅇ") {
    const cluster = CLUSTERS[left.final];
    right.initial = cluster?.[1] ?? left.final;
    left.final = cluster?.[0] ?? "";
  }
}

/** 이웃 두 음절(받침은 이미 대표음) — ㄹ의 ㄴ 되기 · 비음화 · 유음화. */
function assimilatePair(left: Hangul, right: Hangul): void {
  if (right.initial === "ㄹ" && "ㅁㅇㄱㄷㅂ".includes(left.final) && left.final !== "") {
    right.initial = "ㄴ";
  }
  if ((right.initial === "ㄴ" || right.initial === "ㅁ") && NASAL[left.final] !== undefined) {
    left.final = NASAL[left.final] ?? left.final;
  }
  if (left.final === "ㄴ" && right.initial === "ㄹ") left.final = "ㄹ";
  else if (left.final === "ㄹ" && right.initial === "ㄴ") right.initial = "ㄹ";
}

/** 발음형 단위열과, 그 안에서 낱말이 시작하는 자리(단위 번호, 오름차순)입니다. */
export type SpokenTrack = {
  readonly units: readonly string[];
  readonly wordStarts: readonly number[];
};

/** 군말을 떼고 띄어쓰기 · 부호를 무시한 발음형 단위열과 낱말 경계. 연음은 낱말 경계 너머로도 일어납니다. */
export function spokenTrackOf(text: string): SpokenTrack {
  const tagged = syllablesOf(text);
  const syllables = tagged.map((entry) => entry.syllable);
  const pairs = (apply: (left: Hangul, right: Hangul) => void) => {
    for (let index = 0; index + 1 < syllables.length; index += 1) {
      const left = syllables[index];
      const right = syllables[index + 1];
      if (isHangul(left) && isHangul(right)) apply(left, right);
    }
  };
  pairs(linkPair);
  for (const syllable of syllables) {
    if (isHangul(syllable)) syllable.final = REPRESENTATIVE[syllable.final] ?? syllable.final;
  }
  pairs(assimilatePair);
  const units: string[] = [];
  const wordStarts: number[] = [];
  syllables.forEach((syllable, index) => {
    if (tagged[index]?.wordStart === true) wordStarts.push(units.length);
    if (!isHangul(syllable)) {
      units.push(syllable.other);
      return;
    }
    if (syllable.initial !== "ㅇ") units.push(PLAIN[syllable.initial] ?? syllable.initial);
    units.push(SAME_VOWEL[syllable.vowel] ?? syllable.vowel);
    if (syllable.final !== "") units.push(syllable.final);
  });
  return { units, wordStarts };
}

/** 군말을 떼고 띄어쓰기 · 부호를 무시한 발음형 단위열(초성 · 중성 · 받침 자모, 한글 밖은 소문자 글자). */
export function spokenUnitsOf(text: string): readonly string[] {
  return spokenTrackOf(text).units;
}
