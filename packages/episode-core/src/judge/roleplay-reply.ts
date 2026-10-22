// 롤플레이 말하기 답의 판정입니다 — 앱의 에피소드 롤플레이와 랜딩 체험판이 같은 규칙을 씁니다(순수).

import type { AnswerResult } from "./answer-result";
import type { NonEmpty } from "./non-empty";
import { judgeSpeaking, speakingWords } from "./speaking-judge";

function containsWildcard(word: string, wildcards: readonly string[]): boolean {
  return wildcards.some((wildcard) => wildcard !== "" && word.includes(wildcard));
}

// 이름 · 나라가 든 낱말은 빼고, 남은 낱말이 들은 문장에 차례대로 있으면 맞습니다.
function matchesWithWildcards(sentence: string, heard: string, wildcards: readonly string[]) {
  const pieces = wildcards.flatMap((wildcard) => speakingWords(wildcard));
  const required = speakingWords(sentence).filter((word) => !containsWildcard(word, pieces));
  const heardWords = speakingWords(heard);
  // 정답이 이름 · 나라뿐이면 남는 낱말이 없습니다 — 그때는 무언가 말했어야 맞습니다.
  if (required.length === 0) return heardWords.length > 0;
  let cursor = 0;
  for (const word of required) {
    const found = heardWords.indexOf(word, cursor);
    if (found < 0) return false;
    cursor = found + 1;
  }
  return true;
}

/**
 * 들은 문장을 받아들이는 정답들과 맞춥니다. 이름 · 나라가 없는 정답은 말하기 학습형과 같은 규칙
 * (`judgeSpeaking`)이고, 들어 있는 정답은 그 낱말만 빼고 봅니다.
 */
export function judgeRoleplayReply(
  accepted: NonEmpty<string>,
  heard: string,
  wildcards: readonly string[],
): AnswerResult {
  const pieces = wildcards.flatMap((wildcard) => speakingWords(wildcard));
  const correct = accepted.some((sentence) =>
    speakingWords(sentence).some((word) => containsWildcard(word, pieces))
      ? matchesWithWildcards(sentence, heard, wildcards)
      : judgeSpeaking(sentence, heard) === "correct",
  );
  return correct ? "correct" : "incorrect";
}
