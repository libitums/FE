// 내 스토리(단어 · 카드)에 인물이 다는 반응의 지시(ADR-0179). 런타임 중립 — Deno Edge Function과 vitest 둘 다에서 돈다.
// 반응은 붙인 단어를 꼭 넣는다 — 모델 답에 단어(어간)가 없으면 핸들러가 버린다(다시 부르지 않음, 비용 상한).

import type { Segment } from "./chat-send.contract.ts";

export type ReactionStory = {
  readonly kind: "word" | "card";
  readonly ko: string;
  readonly roman: string;
  readonly meaning: string;
  readonly exampleKo: string | null;
};

const quoted = (text: string) => `"${text.replace(/\s+/gu, " ").trim()}"`;

/** 이번 반응의 지시 — 시스템 프롬프트의 「For this reply」 자리에 들어간다. */
export function reactionDirective(story: ReactionStory): string {
  const what = story.kind === "card" ? "a lesson card" : "a word card";
  const example =
    story.exampleKo === null ? "" : ` The card's example sentence is ${quoted(story.exampleKo)}.`;
  return (
    `The learner just shared ${what} as their story today: the Korean word ${quoted(story.ko)}` +
    ` (${story.roman === "" ? "" : `${story.roman}, `}meaning "${story.meaning}").${example}` +
    ` Reply to their story as a friend who just saw it. You must use the word ${quoted(story.ko)}` +
    " (a conjugated form is fine) in a short, natural Korean sentence the learner can follow." +
    " Write 1 or 2 short lines. You may ask at most one light question, or give a tiny quiz using the word." +
    " Do not explain grammar."
  );
}

/** 유저 말 자리 — 앱 안내(학습자가 실제로 한 말이 아님). */
export function reactionUserText(story: ReactionStory): string {
  return `(앱 안내: 학습자가 오늘 스토리로 단어 「${story.ko}」를 올렸다. 친구로서 이 단어를 넣어 짧게 반응한다.)`;
}

/** 단어의 어간 — 용언은 '-하다' · '-다'를 떼고, 이름씨는 그대로. 두 글자 이상일 때만 뗀다("다" 한 글자는 그대로). */
export function wordStemOf(word: string): string {
  const trimmed = word.trim();
  if (trimmed.endsWith("하다") && trimmed.length > 2) return trimmed.slice(0, -2);
  if (trimmed.endsWith("다") && trimmed.length > 1) return trimmed.slice(0, -1);
  return trimmed;
}

const compact = (text: string) => text.replace(/\s+/gu, "");

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
type Syllable = { readonly initial: number; readonly vowel: number };

/** 한글 음절의 초성 · 중성 번호(유니코드 산술). 한글 음절이 아니면 null. */
function syllableOf(char: string | undefined): Syllable | null {
  const code = char?.codePointAt(0);
  if (code === undefined || code < HANGUL_FIRST || code > HANGUL_LAST) return null;
  const offset = code - HANGUL_FIRST;
  return { initial: Math.floor(offset / 588), vowel: Math.floor((offset % 588) / 28) };
}

/** 한 음절 어간의 모음이 활용에서 줄어 바뀌는 꼴 — ㅏ(하)→ㅐ · ㅗ→ㅘ · ㅜ→ㅝ · ㅡ→ㅓ · ㅣ→ㅕ. */
const CONTRACTED: Readonly<Record<number, number>> = { 0: 1, 8: 9, 13: 14, 18: 4, 20: 6 };

const sameSound = (a: Syllable | null, b: Syllable | null) =>
  a !== null && b !== null && a.initial === b.initial && a.vowel === b.vowel;

/**
 * 용언 어간이 활용형으로 들어갔는가(ADR-0179 D4) — 줄어든 꼴(갔어 · 봤어 · 배워 · 마셔)과 불규칙(추워 · 들어 · 몰라)을 받는다.
 * - 두 음절 이상: 앞 음절들은 초성 · 중성이 같고(받침은 봄 — 몰라의 「몰」), 끝 음절은 초성만 같다(배우 → 배「워」, 모르 → 몰「라」).
 * - 한 음절: 초성이 같고 중성이 같거나 줄어든 꼴이며, **바로 뒤에 한글 음절이 붙어야** 한다 — 조사 「가」(친구가 ·), 한 글자 낱말에 걸리지 않게.
 *   「가방」처럼 같은 음절로 시작하는 다른 낱말에는 걸릴 수 있다(받아들인 거짓 양성 — 지시가 단어를 쓰라고 하고, 출력 검사는 따로 있다).
 */
function includesConjugated(text: string, stem: string): boolean {
  const want = [...stem].map(syllableOf);
  if (want.length === 0 || want.some((syllable) => syllable === null)) return false;
  const chars = [...text];
  for (let at = 0; at + want.length <= chars.length; at += 1) {
    const got = chars.slice(at, at + want.length).map(syllableOf);
    if (want.length === 1) {
      const [one] = want as Syllable[];
      const first = got[0] ?? null;
      const vowelOk =
        first !== null && (first.vowel === one.vowel || CONTRACTED[one.vowel] === first.vowel);
      if (
        first !== null &&
        first.initial === one.initial &&
        vowelOk &&
        syllableOf(chars[at + 1]) !== null
      )
        return true;
      continue;
    }
    const head = want
      .slice(0, -1)
      .every((syllable, index) => sameSound(syllable, got[index] ?? null));
    const last = want[want.length - 1] as Syllable;
    const tail = got[got.length - 1] ?? null;
    if (head && tail !== null && tail.initial === last.initial) return true;
  }
  return false;
}

/** 반응 글에 단어가 들어갔는가(띄어쓰기 무시) — 그대로 있거나, 용언(「-다」)이면 활용형으로. 이름씨는 그대로만. */
export function includesWord(text: string, word: string): boolean {
  const said = compact(text);
  const whole = compact(word.trim());
  if (whole === "") return false;
  if (said.includes(whole)) return true;
  if (!whole.endsWith("다") || whole.length < 2) return false;
  // 「-하다」(이름씨 + 하다)는 이름씨 부분이 띄어쓰기를 뺀 글에 있으면 받는다 — 「도착 했어」(재리뷰 m-a).
  if (whole.endsWith("하다") && whole.length > 3 && said.includes(whole.slice(0, -2))) return true;
  // 「-하다」도 「하」를 남겨 끝 음절(하 → 해 · 했)로 본다. 띄어쓰기는 남긴 글로 본다 — 「친구가 왔어」의 조사 「가」 뒤 띄어쓰기.
  return includesConjugated(text.trim(), whole.slice(0, -1));
}

/** 반응으로 보일 글 — 말(speech)만 이어 붙인다. */
export function reactionTextOf(segments: readonly Segment[]): string {
  return segments
    .filter((segment) => segment.kind === "speech")
    .map((segment) => segment.text.trim())
    .filter((text) => text !== "")
    .join(" ");
}
