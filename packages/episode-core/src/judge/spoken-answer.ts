// 앱의 말하기 문항(SPEAK_WORD) · 롤플레이 답의 판정입니다(순수). 인식 결과 한 줄을 받아 세 등급으로 가릅니다.
//
// - perfect: 낱말 그대로 맞거나(`judgeRoleplayReplyExact`) 발음형이 같습니다(띄어쓰기 · 연음 · 받침 표기 · 군말만 다름).
// - close: 발음형이 조금 다르지만 허용 오차 안입니다(`spokenPasses`). 화면은 맞음과 함께 모범 정답을 보입니다(ADR-0201).
// - incorrect: 그 밖.
//
// 판정(정오답)은 perfect · close가 correct입니다.

import type { AnswerResult } from "./answer-result";
import type { NonEmpty } from "./non-empty";
import { judgeRoleplayReplyExact } from "./roleplay-reply";
import { spokenPasses, spokenSimilarity } from "./spoken-lenient";

export type SpokenGrade = "perfect" | "close" | "incorrect";

export type SpokenAnswerJudgement = {
  readonly result: AnswerResult;
  readonly grade: SpokenGrade;
  /** 들은 말과 가장 가까운 정답 — close일 때 화면이 모범 정답으로 보입니다. */
  readonly expected: string;
  /** 0 ~ 1, 소수 셋째 자리. perfect는 1. */
  readonly similarity: number;
};

const RANK: Readonly<Record<SpokenGrade, number>> = { perfect: 2, close: 1, incorrect: 0 };
const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * 받아 주는 정답들 중 가장 좋은 등급(같으면 일치도가 높은, 그것도 같으면 먼저 온 정답)으로 판정합니다.
 * `wildcards`(이름 · 나라)가 든 낱말은 비교에서 뺍니다.
 */
export function judgeSpokenAnswer(
  accepted: NonEmpty<string>,
  heard: string,
  wildcards: readonly string[] = [],
): SpokenAnswerJudgement {
  let best: { grade: SpokenGrade; expected: string; similarity: number } | null = null;
  for (const sentence of accepted) {
    const score = spokenSimilarity(sentence, heard, wildcards);
    const exact = judgeRoleplayReplyExact([sentence], heard, wildcards) === "correct";
    const grade: SpokenGrade =
      exact || (score.length > 0 && score.distance === 0)
        ? "perfect"
        : spokenPasses(score)
          ? "close"
          : "incorrect";
    const similarity = grade === "perfect" ? 1 : score.similarity;
    if (
      best === null ||
      RANK[grade] > RANK[best.grade] ||
      (RANK[grade] === RANK[best.grade] && similarity > best.similarity)
    ) {
      best = { grade, expected: sentence, similarity };
    }
  }
  const { grade, expected, similarity } = best ?? {
    grade: "incorrect" as const,
    expected: accepted[0],
    similarity: 0,
  };
  return {
    result: grade === "incorrect" ? "incorrect" : "correct",
    grade,
    expected,
    similarity: round(similarity),
  };
}

/** 롤플레이 답의 정오답입니다 — `judgeSpokenAnswer`의 판정만 냅니다. */
export function judgeRoleplayReply(
  accepted: NonEmpty<string>,
  heard: string,
  wildcards: readonly string[],
): AnswerResult {
  return judgeSpokenAnswer(accepted, heard, wildcards).result;
}
