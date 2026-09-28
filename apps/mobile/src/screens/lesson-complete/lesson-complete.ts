// 학습 결과 화면(Figma 65-466)의 순수 어휘입니다. 화면은 이 결과를 그리기만 합니다.
//
// 디자인은 「통과 · 실수 없음」 한 가지뿐입니다. 나머지 둘(실수 있는 통과 · 미통과)은
// 같은 틀에 제목 · 설명만 바꿔 씁니다 — 그 문구는 디자인이 아직 없어 이 모듈이 임시로
// 정한 것입니다.
//
// ⟨2026-09-28⟩ **미통과가 이 틀로 들어왔습니다.** 그전에는 통과만 이 화면이고 미통과는
// 옆의 평가 화면이라, 같은 순간의 두 결과가 **전혀 다른 화면**으로 보였습니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { AssessmentVerdict } from "../assessment/assessment";

export function lessonMistakeCount(results: readonly AnswerResult[]): number {
  return results.filter((result) => result !== "correct").length;
}

/**
 * 제목은 세 갈래입니다 — 통과 · 실수 없음 / 통과 · 실수 있음 / 미통과.
 *
 * 미통과가 `LESSON FAILED`인 것은 **결과를 감추지 않기 위해서**입니다. 「다시 해봐요」류로
 * 부드럽게 적으면 통과와 구별되지 않고, 이 화면이 하는 일이 정확히 그 구별입니다.
 */
export function lessonCompleteTitle(mistakeCount: number, verdict: AssessmentVerdict): string {
  if (verdict === "failed") return "LESSON FAILED";
  return mistakeCount === 0 ? "PERFECT LESSON!" : "LESSON COMPLETE!";
}

/** 실수 수를 세는 문장은 통과 · 미통과가 같습니다 — 센 것이 같기 때문입니다. */
export function lessonCompleteSubtitle(mistakeCount: number): string {
  if (mistakeCount === 0) return "YOU MADE NO MISTAKES IN THIS LESSON";
  return `YOU MADE ${mistakeCount} ${mistakeCount === 1 ? "MISTAKE" : "MISTAKES"} IN THIS LESSON`;
}

export function lessonStreakLabel(streakDays: number): string {
  return `${streakDays} Day Streak`;
}

/**
 * 화면이 뜰 때 한 번 낭독합니다. 영문 제목 대신 판정을 한국어로 알립니다.
 *
 * **통과 여부를 맨 앞에 둡니다** — 실수 수보다 먼저 알아야 하는 것이 그것이고, 낭독은
 * 앞부터 들립니다.
 */
export function lessonCompleteAnnouncement(
  mistakeCount: number,
  verdict: AssessmentVerdict,
): string {
  const outcome = verdict === "failed" ? "학습 미통과" : "학습 완료";
  return mistakeCount === 0 ? `${outcome}, 실수 없음` : `${outcome}, 실수 ${mistakeCount}개`;
}

/**
 * 흠 없이 끝냈는가입니다. **실수 0과 같은 말이 아닙니다** — 건너뛴 문항이 있으면 실수가
 * 없어도 만점이 아닙니다(D8). 두 수가 다른 것을 세기 때문입니다: 하나는 틀린 횟수,
 * 하나는 **재지 않은** 횟수입니다.
 *
 * 자리 표시자입니다. 호출되면 실패합니다 — `logic` 변형이 실동작으로 교체합니다
 * (logic-scaffold). `lessonCompleteTitle`은 아직 이 함수를 보지 않습니다 — 그 배선도
 * `logic` 변형의 몫입니다.
 */
export function isPerfectLesson(_mistakeCount: number, _skippedCount: number): boolean {
  throw new Error("isPerfectLesson: not implemented (logic-scaffold)");
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
