// 발음 기준의 너그러운 말하기 판정입니다(순수). 앱 채점(`judgeSpeaking` · `judgeRoleplayReply`)은 바꾸지 않고,
// 웹 체험판처럼 받아쓰기 차이를 너그럽게 볼 곳만 이 함수를 씁니다.
//
// 정답을 문장 부호로 마디(「안녕하세요 · 네 · 처음이에요」)로 나누고, 마디마다 들은 문장 안의 가장 비슷한 연속 구간과
// 발음형 자모 편집 거리를 잽니다. 앞뒤에 덧붙은 말 · 마디 순서 바뀜은 허용하고, 마디 하나를 통째로 빠뜨리면 하한이 막습니다.

import { spokenUnitsOf } from "./hangul-pronunciation";
import type { NonEmpty } from "./non-empty";
import { judgeRoleplayReply } from "./roleplay-reply";

/** 문장 일치도가 이 값 이상이면 발음 기준 정답입니다. */
export const SPOKEN_LENIENT_THRESHOLD = 0.75;
/** 정답의 마디(부호로 자른 조각) 하나라도 이 값 아래면 정답이 아닙니다 — 절반만 말한 경우를 막습니다. */
export const SPOKEN_SEGMENT_FLOOR = 0.5;

export type SpokenOutcome = "strict" | "lenient" | "incorrect";
export type SpokenSimilarity = { readonly similarity: number; readonly weakest: number };
export type SpokenJudgement = {
  readonly outcome: SpokenOutcome;
  /** 0 ~ 1, 소수 셋째 자리. */
  readonly similarity: number;
  /** 판정에 쓴 대안(incorrect면 첫 대안, 없으면 ""). */
  readonly heard: string;
  /** 가장 가까운 정답. */
  readonly expected: string;
};

/** `pattern`과 `text` 안 어느 연속 구간 사이의 최소 편집 거리(앞뒤 덧붙은 말은 공짜). */
function windowDistance(pattern: readonly string[], text: readonly string[]): number {
  let previous: number[] = Array.from({ length: text.length + 1 }, () => 0);
  for (let row = 1; row <= pattern.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= text.length; column += 1) {
      const substitute =
        (previous[column - 1] ?? 0) + (pattern[row - 1] === text[column - 1] ? 0 : 1);
      current.push(
        Math.min((previous[column] ?? 0) + 1, (current[column - 1] ?? 0) + 1, substitute),
      );
    }
    previous = current;
  }
  return Math.min(...previous);
}

const round = (value: number) => Math.round(value * 1000) / 1000;

export function spokenSimilarity(expected: string, heard: string): SpokenSimilarity {
  const text = typeof expected.normalize === "function" ? expected.normalize("NFC") : expected;
  const segments = text
    .split(/[.,!?…~]+/)
    .map(spokenUnitsOf)
    .filter((units) => units.length > 0);
  const heardUnits = spokenUnitsOf(heard);
  let distance = 0;
  let length = 0;
  let weakest = 1;
  for (const segment of segments) {
    const gap = windowDistance(segment, heardUnits);
    distance += gap;
    length += segment.length;
    weakest = Math.min(weakest, 1 - gap / segment.length);
  }
  if (length === 0) return { similarity: 0, weakest: 0 };
  return { similarity: Math.max(0, 1 - distance / length), weakest: Math.max(0, weakest) };
}

const passes = ({ similarity, weakest }: SpokenSimilarity) =>
  similarity >= SPOKEN_LENIENT_THRESHOLD && weakest >= SPOKEN_SEGMENT_FLOOR;

/**
 * 엄격 규칙(`judgeRoleplayReply`)으로 맞는 대안이 있으면 strict, 아니면 (정답 × 대안) 중 통과하는 가장 높은 쌍으로
 * lenient, 없으면 incorrect. 같은 값이면 먼저 온 정답 · 대안입니다.
 */
export function judgeSpokenLenient(
  accepted: NonEmpty<string>,
  alternatives: readonly string[],
): SpokenJudgement {
  const closest = (heard: string) =>
    accepted
      .map((sentence) => ({ sentence, score: spokenSimilarity(sentence, heard) }))
      .reduce((best, entry) => (entry.score.similarity > best.score.similarity ? entry : best));
  const strict = alternatives.find(
    (heard) => judgeRoleplayReply(accepted, heard, []) === "correct",
  );
  if (strict !== undefined) {
    return { outcome: "strict", similarity: 1, heard: strict, expected: closest(strict).sentence };
  }
  let best = { heard: alternatives[0] ?? "", sentence: accepted[0], similarity: 0, pass: false };
  for (const heard of alternatives) {
    for (const sentence of accepted) {
      const score = spokenSimilarity(sentence, heard);
      const pass = passes(score);
      const better = pass === best.pass ? score.similarity > best.similarity : pass;
      if (better) best = { heard, sentence, similarity: score.similarity, pass };
    }
  }
  return {
    outcome: best.pass ? "lenient" : "incorrect",
    similarity: round(best.similarity),
    heard: best.pass ? best.heard : (alternatives[0] ?? ""),
    expected: best.sentence,
  };
}
