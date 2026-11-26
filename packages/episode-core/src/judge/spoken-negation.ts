// 들은 말에만 있는 부정 낱말을 찾습니다(순수). 발음이 가까워도 뜻이 반대면 정답이 아닙니다(ADR-0201 개정 ⟨부정어⟩).
//
// 부정은 한국어에서 짧은 낱말 하나(안 · 못)나 어간 하나(없 · 않 · 싫 · 모르 · 아니)로 붙습니다. 자모 몇 개라서
// 길이 허용 오차 안으로 들어오기 쉽고, 앞에 붙으면 「덧붙은 낱말」로 건너뛰어졌습니다. 그래서 낱말 단위로 따로 셉니다.
// 정답 쪽에 같은 갈래의 부정어가 있으면 그 갈래는 보지 않고 평소처럼 비교합니다.

import { speakingWords } from "./speaking-judge";

type Kind = "an" | "mot" | "ani" | "eops" | "anh" | "silh" | "moreu" | "mal";

/** 「-지 마세요」 금지형의 뒤 낱말 — 앞 낱말이 「-지」로 끝날 때만 부정입니다. */
const PROHIBITIVE = new Set([
  "마",
  "마요",
  "마세요",
  "마십시오",
  "말아요",
  "말아",
  "말고",
  "마라",
  "말자",
  "맙시다",
]);
const ANI_PREFIXES = ["아니", "아닌", "아닙", "아냐", "아뇨", "아녜"];
const MOREU_PREFIXES = ["모르", "몰라", "몰랐", "모릅", "모를"];

const startsWithAny = (word: string, prefixes: readonly string[]) =>
  prefixes.some((prefix) => word.startsWith(prefix));

/**
 * 낱말 하나의 부정 갈래입니다. 「안」 · 「못」은 홀로 선 낱말이거나, 인식기가 붙여 적어 뒤가 상대 쪽 낱말과 같을 때만
 * 부정입니다(「안좋아요」 ↔ 「좋아요」) — 「안녕하세요」의 「안」은 세지 않습니다.
 */
function kindOf(
  word: string,
  previous: string | undefined,
  others: ReadonlySet<string>,
): Kind | null {
  for (const [head, kind] of [
    ["안", "an"],
    ["못", "mot"],
  ] as const) {
    if (word === head || (word.startsWith(head) && others.has(word.slice(head.length)))) {
      return kind;
    }
  }
  if (startsWithAny(word, ANI_PREFIXES)) return "ani";
  if (startsWithAny(word, MOREU_PREFIXES)) return "moreu";
  if (word.includes("없")) return "eops";
  if (word.includes("않")) return "anh";
  if (word.includes("싫")) return "silh";
  if (PROHIBITIVE.has(word) && previous !== undefined && previous.endsWith("지")) return "mal";
  return null;
}

function kindsOf(words: readonly string[], others: ReadonlySet<string>): Set<Kind> {
  const kinds = new Set<Kind>();
  words.forEach((word, index) => {
    const kind = kindOf(word, words[index - 1], others);
    if (kind !== null) kinds.add(kind);
  });
  return kinds;
}

/** 들은 말에 정답에 없는 갈래의 부정 낱말이 있으면 true입니다. */
export function addsNegation(expected: string, heard: string): boolean {
  const expectedWords = speakingWords(expected);
  const heardWords = speakingWords(heard);
  const expectedKinds = kindsOf(expectedWords, new Set(heardWords));
  for (const kind of kindsOf(heardWords, new Set(expectedWords))) {
    if (!expectedKinds.has(kind)) return true;
  }
  return false;
}
