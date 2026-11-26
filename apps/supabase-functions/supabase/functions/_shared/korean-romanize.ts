// 한글 → 국어의 로마자 표기법(2000) — 소리 나는 대로 적는 전사. 런타임 중립 · 순수.
// 친구 스토리의 로마자(ADR-0192 D8)를 모델이 쓰지 않고 여기서 만든다 — 모델이 쓴 로마자에는 없는 글자가 섞였다(2026-11-24 시험: 「neomgiquid」).
// 반영하는 소리 변화: 연음(받침 + 모음) · 구개음화(같이 → gachi) · ㅎ 탈락과 거센소리(좋아 → joa, 좋다 → jota) · 비음화(합니다 → hamnida) ·
// 유음화(설날 → seollal) · 받침의 대표음. 된소리되기는 적지 않는다(표기법 그대로). 받침 뒤의 ㅎ은 앱의 레슨 콘텐츠 표기를 따른다 —
// ㄱ · ㅂ · ㅈ 뒤는 거센소리로 합치고(예약해요 → yeyakaeyo) ㅅ · ㄷ 뒤는 밝혀 적는다(따뜻해요 → ttatteuthaeyo).
// 사전이 있어야 아는 것(ㄴ 첨가 · 합성어 · 한자어 예외)은 자주 나오는 말만 표(`RESPELL`)로 둔다 — 나머지는 최종 승인에서 사람이 고칠 수 있다.
// 낱말 사이(띄어쓰기)에서는 소리를 잇지 않는다. 한글이 아닌 글자(숫자 · 문장부호 · 로마자)는 그대로 둔다.

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
];
const VOWELS = [
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
];
/** 받침 번호 → 낱자들(겹받침은 둘). 0은 받침 없음. */
const FINALS = [
  "",
  "ㄱ",
  "ㄲ",
  "ㄱㅅ",
  "ㄴ",
  "ㄴㅈ",
  "ㄴㅎ",
  "ㄷ",
  "ㄹ",
  "ㄹㄱ",
  "ㄹㅁ",
  "ㄹㅂ",
  "ㄹㅅ",
  "ㄹㅌ",
  "ㄹㅍ",
  "ㄹㅎ",
  "ㅁ",
  "ㅂ",
  "ㅂㅅ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];
const INITIAL_JAMO = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];
/** 받침의 대표음(자음 앞 · 낱말 끝) — k · n · t · l · m · p · ng. 겹받침은 발음되는 쪽. */
const REPRESENT: Record<string, string> = {
  ㄱ: "k",
  ㄲ: "k",
  ㅋ: "k",
  ㄱㅅ: "k",
  ㄹㄱ: "k",
  ㄴ: "n",
  ㄴㅈ: "n",
  ㄴㅎ: "n",
  ㄷ: "t",
  ㅅ: "t",
  ㅆ: "t",
  ㅈ: "t",
  ㅊ: "t",
  ㅌ: "t",
  ㅎ: "t",
  ㄹ: "l",
  ㄹㅂ: "l",
  ㄹㅅ: "l",
  ㄹㅌ: "l",
  ㄹㅎ: "l",
  ㅁ: "m",
  ㄹㅁ: "m",
  ㅂ: "p",
  ㅍ: "p",
  ㅂㅅ: "p",
  ㄹㅍ: "p",
  ㅇ: "ng",
};
const ASPIRATE: Record<string, string> = { ㄱ: "ㅋ", ㄷ: "ㅌ", ㅈ: "ㅊ" };
const PALATAL: Record<string, string> = { ㄷ: "ㅈ", ㅌ: "ㅊ" };
/** 구개음화를 일으키는 모음(ㅣ와 ㅣ계 이중모음) — ㅑ ㅕ ㅛ ㅠ ㅣ. */
const PALATAL_VOWELS = new Set([2, 6, 12, 17, 20]);

type Syllable = { cho: string; jung: number; jong: string };

const syllableOf = (char: string): Syllable | null => {
  const code = char.charCodeAt(0) - 0xac00;
  if (char.length !== 1 || code < 0 || code > 11171) return null;
  return {
    cho: INITIAL_JAMO[Math.floor(code / 588)]!,
    jung: Math.floor((code % 588) / 28),
    jong: FINALS[code % 28]!,
  };
};

/** 한 낱말(이어진 한글 음절들)의 소리 변화를 적용한다 — 자리에서 고친다. */
function assimilate(word: Syllable[]): string[] {
  /** 음절마다 적을 받침 소리(로마자). */
  const codas: string[] = word.map(() => "");
  for (let i = 0; i < word.length; i += 1) {
    const here = word[i]!;
    const next = word[i + 1];
    if (here.jong === "") continue;
    if (next === undefined) {
      codas[i] = REPRESENT[here.jong] ?? "";
      continue;
    }
    const [first, second] = [here.jong[0]!, here.jong[1]];
    if (next.cho === "ㅇ") {
      // 연음 — 받침이 다음 음절의 첫소리로. ㅇ은 남고 ㅎ은 사라진다. 겹받침은 뒤 낱자만 넘어간다.
      if (here.jong === "ㅇ") codas[i] = "ng";
      else if (second === undefined) {
        if (first !== "ㅎ")
          next.cho = PALATAL_VOWELS.has(next.jung) ? (PALATAL[first] ?? first) : first;
      } else {
        codas[i] = REPRESENT[first] ?? "";
        if (second === "ㅎ") {
          next.cho = first;
          codas[i] = "";
        } else next.cho = PALATAL_VOWELS.has(next.jung) ? (PALATAL[second] ?? second) : second;
      }
      continue;
    }
    // 받침 ㄱ · ㅂ · ㅈ + ㅎ → 거센소리로 합친다(잡혀 → japyeo, 예약했어요 → yeyakaesseoyo). ㄷ · ㅌ + 「히 · 혀」는 구개음화(굳히다 → guchida).
    // 받침 ㅅ · ㄷ(대표음 t) + 하 · 해는 ㅎ을 밝혀 적는다(따뜻해요 → ttatteuthaeyo, 못해요 → mothaeyo) — 앱의 레슨 콘텐츠 표기
    // 1,265쌍과 맞췄다(2026-11-24, 94% 일치).
    if (next.cho === "ㅎ") {
      const tail = second ?? first;
      const merged = "ㄱㄲㅋ".includes(tail)
        ? "ㅋ"
        : "ㅂㅍ".includes(tail)
          ? "ㅍ"
          : "ㅈㅊ".includes(tail) || ("ㄷㅌ".includes(tail) && PALATAL_VOWELS.has(next.jung))
            ? "ㅊ"
            : null;
      if (merged !== null) {
        next.cho = merged;
        codas[i] = second === undefined ? "" : (REPRESENT[first] ?? "");
        continue;
      }
    }
    // ㅎ 받침(ㅎ · ㄶ · ㅀ) + ㄱ ㄷ ㅈ → 거센소리, + ㄴ → ㄴ, 그 밖에는 ㅎ이 사라진다.
    if (here.jong === "ㅎ" || second === "ㅎ") {
      const rest = second === "ㅎ" ? first : "";
      if (ASPIRATE[next.cho] !== undefined) next.cho = ASPIRATE[next.cho]!;
      codas[i] = rest === "" ? (next.cho === "ㄴ" ? "n" : "") : (REPRESENT[rest] ?? "");
    } else if (here.jong === "ㄹㄱ" && next.cho === "ㄱ") {
      // ㄺ은 ㄱ 앞에서 ㄹ로 소리 난다(읽고 → ilgo, 맑게 → malge).
      codas[i] = "l";
    } else codas[i] = REPRESENT[here.jong] ?? "";
    // 비음화 · 유음화.
    const coda = codas[i]!;
    if (next.cho === "ㄴ" || next.cho === "ㅁ") {
      if (coda === "k") codas[i] = "ng";
      else if (coda === "t") codas[i] = "n";
      else if (coda === "p") codas[i] = "m";
      else if (coda === "l" && next.cho === "ㄴ") next.cho = "ㄹ";
    } else if (next.cho === "ㄹ") {
      if (coda === "n") codas[i] = "l";
      else if (coda === "k") [codas[i], next.cho] = ["ng", "ㄴ"];
      else if (coda === "p") [codas[i], next.cho] = ["m", "ㄴ"];
      else if (coda === "m" || coda === "ng" || coda === "t") {
        if (coda === "t") codas[i] = "n";
        next.cho = "ㄴ";
      }
    }
  }
  return word.map((syllable, i) => {
    // ㄹㄹ은 ll, 첫소리 ㄹ은 r.
    const onset =
      syllable.cho === "ㄹ" && codas[i - 1] === "l"
        ? "l"
        : INITIALS[INITIAL_JAMO.indexOf(syllable.cho)]!;
    return `${onset}${VOWELS[syllable.jung]!}${codas[i]!}`;
  });
}

/** 홀로 쓴 낱자(ㅋㅋ · ㅎㅎ · ㅠㅠ) — 채팅에서 쓰는 것만. 그 밖의 낱자는 그대로 둔다. */
const LONE_JAMO: Record<string, string> = { ㅋ: "k", ㅎ: "h", ㅠ: "yu", ㅜ: "u", ㅇ: "o" };

/**
 * 규칙으로는 알 수 없는 소리(ㄴ 첨가 · 합성어의 받침) — 자주 나오는 말만 소리 나는 대로 바꿔 적어 둔다.
 * 날짜 · 나이에 늘 나오는 「십육 · 열여섯」과 역 이름, 「맛없다」가 여기 있다.
 */
const RESPELL: readonly (readonly [string, string])[] = [
  ["맛없", "마덦"],
  ["멋없", "머덦"],
  ["겉옷", "거돗"],
  ["서울역", "서울력"],
  ["지하철역", "지하철력"],
  ["깻잎", "깬닢"],
  ["꽃잎", "꼰닢"],
  ["한입", "한닙"],
  ["십육", "심뉵"],
  ["열여섯", "열려섯"],
  ["열여덟", "열려덟"],
  ["스물여섯", "스물려섯"],
  ["스물여덟", "스물려덟"],
  ["색연필", "생년필"],
];

/** 한글 글 → 로마자(소문자). 한글이 아닌 글자는 그대로. */
export function romanize(text: string): string {
  let out = "";
  let word: Syllable[] = [];
  const flush = () => {
    if (word.length > 0) out += assimilate(word).join("");
    word = [];
  };
  let source = text.normalize("NFC");
  for (const [from, to] of RESPELL) source = source.replaceAll(from, to);
  for (const char of source) {
    const syllable = syllableOf(char);
    if (syllable === null) {
      flush();
      out += LONE_JAMO[char] ?? char;
    } else word.push(syllable);
  }
  flush();
  return out.toLowerCase();
}
