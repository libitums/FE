// 학습 완료 화면(Figma 65-466)의 순수 어휘입니다. 화면은 이 결과를 그리기만 합니다.
//
// 디자인은 「실수 없음」 한 가지뿐입니다. 실수가 있는 통과는 같은 틀에 제목 · 설명만
// 바꿔 씁니다 — 그 문구는 디자인이 아직 없어 이 모듈이 임시로 정한 것입니다.

import type { AnswerResult } from "../../lib/answer-result";

export function lessonMistakeCount(results: readonly AnswerResult[]): number {
  return results.filter((result) => result !== "correct").length;
}

export function lessonCompleteTitle(mistakeCount: number): string {
  return mistakeCount === 0 ? "PERFECT LESSON!" : "LESSON COMPLETE!";
}

export function lessonCompleteSubtitle(mistakeCount: number): string {
  if (mistakeCount === 0) return "YOU MADE NO MISTAKES IN THIS LESSON";
  return `YOU MADE ${mistakeCount} ${mistakeCount === 1 ? "MISTAKE" : "MISTAKES"} IN THIS LESSON`;
}

export function lessonStreakLabel(streakDays: number): string {
  return `${streakDays} Day Streak`;
}

/** 화면이 뜰 때 한 번 낭독합니다. 영문 제목 대신 판정을 한국어로 알립니다. */
export function lessonCompleteAnnouncement(mistakeCount: number): string {
  return mistakeCount === 0 ? "학습 완료, 실수 없음" : `학습 완료, 실수 ${mistakeCount}개`;
}

export type LessonReward = {
  /** 이번 학습으로 얻은 다이아 수입니다. */
  readonly diamondAmount: number;
  /** 트로피 카드의 등급 문구입니다. */
  readonly grade: string;
};

/**
 * 보상의 임시값입니다. 다이아 · 등급의 계산 규칙이 아직 없어 디자인 예시 값을 그대로
 * 둡니다. 규칙이 정해지면 이 상수 대신 계산 결과를 넘깁니다.
 */
export const lessonRewardPlaceholder: LessonReward = { diamondAmount: 12, grade: "AMAZING" };
