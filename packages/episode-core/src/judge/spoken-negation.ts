// 정답과 들은 말의 부정 낱말이 어긋나는지 봅니다(순수). 발음이 가까워도 뜻이 반대면 정답이 아닙니다(ADR-0201 개정 ⟨부정어⟩).
//
// 부정은 한국어에서 짧은 낱말 하나(안 · 못)나 어간 하나(없 · 않 · 싫 · 모르 · 아니)로 붙습니다. 자모 몇 개라서
// 길이 허용 오차 안으로 들어오기 쉽고, 앞에 붙으면 「덧붙은 낱말」로 건너뛰어졌습니다. 그래서 낱말 단위로 따로 셉니다.
// 갈래마다 한쪽에만 있으면 어긋남입니다 — 들은 말에만 있어도(「안 좋아요」), 정답의 부정어를 빠뜨려도(「안 가요」 ← 「가요」).

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

/**
 * 정답의 부정어를 들은 말이 소리대로 적었을 때의 표지 — 인식기는 「없어요」를 「업서요」로도 적습니다. 들은 말에 이 글자가
 * 있으면 그 갈래를 빠뜨리지 않은 것으로 봅니다(빠뜨림 쪽만 너그럽게).
 */
const SOUND_MARKERS: Readonly<Record<Kind, readonly string[]>> = {
  an: ["안"],
  mot: ["못", "몯", "몬"],
  ani: ["아니", "아닌", "아닙", "아냐", "아뇨", "아녜"],
  eops: ["없", "업", "엄"],
  anh: ["않", "안"],
  silh: ["싫", "실"],
  moreu: ["모르", "몰"],
  mal: ["마", "말"],
};

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
  // 인식기가 붙여 적은 금지형(「하지마세요」 · 「가지마」).
  for (const tail of PROHIBITIVE) {
    if (word.length > tail.length + 1 && word.endsWith(`지${tail}`)) return "mal";
  }
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

/**
 * 부정 낱말의 갈래가 한쪽에만 있으면 true입니다. 들은 말이 비었으면 비교할 말이 없어 false(거리가 오답을 냅니다).
 */
export function negationMismatch(expected: string, heard: string): boolean {
  const expectedWords = speakingWords(expected);
  const heardWords = speakingWords(heard);
  if (heardWords.length === 0) return false;
  const expectedKinds = kindsOf(expectedWords, new Set(heardWords));
  const heardKinds = kindsOf(heardWords, new Set(expectedWords));
  for (const kind of heardKinds) {
    if (!expectedKinds.has(kind)) return true;
  }
  for (const kind of expectedKinds) {
    const sounded = heardWords.some((word) =>
      SOUND_MARKERS[kind].some((marker) => word.includes(marker)),
    );
    if (!heardKinds.has(kind) && !sounded) return true;
  }
  return false;
}
