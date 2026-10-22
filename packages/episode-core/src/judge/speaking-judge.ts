// 말한 문장을 채점하는 순수 규칙입니다. UI를 import하지 않습니다.
//
// 앱의 말하기 화면 · 에피소드 최종 테스트와 랜딩 체험판의 롤플레이가 같은 규칙으로 채점합니다.

import type { AnswerResult } from "./answer-result";

// 낱말로 가릅니다. 문장 부호는 인식기가 붙이기도 하고 안 붙이기도 해서 떼고 봅니다.
function words(text: string): string[] {
  return text
    .replace(/[.,!?~…"'“”‘’]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

export function speakingWords(sentence: string): readonly string[] {
  return words(sentence);
}

/**
 * 앞에서부터 **연달아** 맞은 낱말 수입니다. 화면은 이 수만큼 앞 낱말을 칠합니다 — 「어디까지
 * 말했나」를 보이는 값이라, 중간에 틀린 낱말 뒤는 맞아도 세지 않습니다.
 */
export function matchedWordCount(sentence: string, recognized: string): number {
  const target = words(sentence);
  const heard = words(recognized);
  let count = 0;
  while (count < target.length && heard[count] === target[count]) {
    count += 1;
  }
  return count;
}

/** 문장의 낱말을 전부 맞게 말했으면 정답입니다. */
export function judgeSpeaking(sentence: string, recognized: string): AnswerResult {
  return matchedWordCount(sentence, recognized) === words(sentence).length
    ? "correct"
    : "incorrect";
}

/** 보이는 조각 하나 — 부호가 붙은 채의 글자와 칠할지 여부입니다. */
export type SpeakingChunk = { readonly text: string; readonly matched: boolean };

/**
 * 문장을 공백으로만 자른 조각(빈 조각 제외)입니다. 조각 i의 matched = (조각 0..i의 `speakingWords`
 * 수 누계) > 0 && 누계 ≤ matchedCount.
 */
export function speakingChunks(sentence: string, matchedCount: number): readonly SpeakingChunk[] {
  let cumulative = 0;
  return sentence
    .split(/\s+/)
    .filter((chunk) => chunk.length > 0)
    .map((text) => {
      cumulative += words(text).length;
      return { text, matched: cumulative > 0 && cumulative <= matchedCount };
    });
}
