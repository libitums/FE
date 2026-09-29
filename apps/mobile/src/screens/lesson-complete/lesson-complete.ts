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
 * 제목은 세 갈래입니다 — 통과 · 만점 / 통과 · 만점 아님 / 미통과.
 *
 * 미통과가 `LESSON FAILED`인 것은 **결과를 감추지 않기 위해서**입니다. 「다시 해봐요」류로
 * 부드럽게 적으면 통과와 구별되지 않고, 이 화면이 하는 일이 정확히 그 구별입니다.
 *
 * **판정을 먼저 봅니다** — 실수 수로 먼저 가르면 「실수 없는 미통과」가 `PERFECT`로 뜨고,
 * 건너뛴 수가 그 순서를 뒤집지도 않습니다.
 *
 * 갈림의 기준이 실수 수 하나가 아니라 `isPerfectLesson`인 것이 D8입니다 — 건너뛴 문항이
 * 있으면 실수가 0이어도 만점이 아닙니다.
 */
export function lessonCompleteTitle(
  mistakeCount: number,
  verdict: AssessmentVerdict,
  skippedCount: number,
): string {
  if (verdict === "failed") return "LESSON FAILED";
  return isPerfectLesson(mistakeCount, skippedCount) ? "PERFECT LESSON!" : "LESSON COMPLETE!";
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
/**
 * ⚠ **건너뛴 수를 덧붙이는 것은 시각과 낭독이 갈리지 않게 하기 위해서입니다**(WCAG 1.3.1).
 * 제목에 `LESSON COMPLETE!`(만점 아님)가 서는데 낭독이 *"학습 완료, 실수 없음"* 에서
 * 멈추면, **보는 사람과 듣는 사람이 다른 정보**를 받습니다 — 듣는 쪽에만 만점처럼
 * 들립니다.
 *
 * 건너뛴 것이 없으면 덧붙지 않습니다 — 없는 수를 읽어 주지 않습니다.
 */
export function lessonCompleteAnnouncement(
  mistakeCount: number,
  verdict: AssessmentVerdict,
  skippedCount: number,
): string {
  const outcome = verdict === "failed" ? "학습 미통과" : "학습 완료";
  const mistakes = mistakeCount === 0 ? "실수 없음" : `실수 ${mistakeCount}개`;
  const skipped = skippedCount === 0 ? "" : `, 건너뛴 문항 ${skippedCount}개`;
  return `${outcome}, ${mistakes}${skipped}`;
}

/**
 * 흠 없이 끝냈는가입니다. **실수 0과 같은 말이 아닙니다** — 건너뛴 문항이 있으면 실수가
 * 없어도 만점이 아닙니다(D8). 두 수가 다른 것을 세기 때문입니다: 하나는 틀린 횟수,
 * 하나는 **재지 않은** 횟수입니다.
 *
 * ⚠ **부제(`lessonCompleteSubtitle`)는 이 함수를 보지 않습니다.** 그 문장이 세는 것은
 * 실수이고, 건너뛴 문항이 있어도 실수는 정말 0입니다 — 건너뛴 것을 실수로 세면
 * *"YOU MADE 3 MISTAKES"* 가 거짓말이 됩니다. 그래서 화면에 `LESSON COMPLETE!` +
 * `YOU MADE NO MISTAKES IN THIS LESSON` 조합이 설 수 있고, 그것이 참입니다 —
 * 「틀리지는 않았지만 다 풀지도 않았다」.
 */
export function isPerfectLesson(mistakeCount: number, skippedCount: number): boolean {
  return mistakeCount === 0 && skippedCount === 0;
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
