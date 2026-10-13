import type { AnswerResult } from "../../lib/answer-result";

/**
 * 학습 활동이 끝났을 때 결과를 올리는 콜백입니다. 어느 스텝·유닛의 활동인지는 활동이
 * 모르고, 부르는 쪽(튜토리얼 어댑터 · 카탈로그 결선)이 압니다. 건너뛴 수는 건너뛰기가
 * 없는 활동에서 늘 0입니다.
 */
export type ActivityFinish = (results: readonly AnswerResult[], skippedCount: number) => void;

/**
 * 한 레슨(카탈로그 유닛)이 여러 학습형 활동으로 이어질 때 이 활동이 레슨 안의 어디인가입니다.
 * 튜토리얼처럼 활동 하나가 곧 한 세션이면 주지 않습니다.
 */
export type LessonPosition = {
  /** 앞선 활동들의 문항 수 합입니다. */
  readonly offset: number;
  /** 레슨 전체 문항 수입니다 — 셸 카운터와 진행 막대의 분모입니다. */
  readonly total: number;
  /** 레슨의 마지막 활동인가입니다. 아니면 마지막 문항 뒤 완료 카드 없이 다음 활동으로 이어집니다. */
  readonly last: boolean;
};

/** 셸 카운터에 넘길 순번(0부터)과 문항 수입니다 — 레슨 안이면 오프셋을 더하고 전체를 분모로 합니다. */
export function lessonCounter(
  lesson: LessonPosition | undefined,
  questionIndex: number,
  questionCount: number,
): { readonly questionIndex: number; readonly questionCount: number } {
  if (lesson === undefined) return { questionIndex, questionCount };
  return { questionIndex: lesson.offset + questionIndex, questionCount: lesson.total };
}

/** 이 문항을 마치면 완료 카드를 거치지 않고 바로 결과를 올려 다음 활동으로 넘겨야 하는가입니다. */
export function handsOffAfter(
  lesson: LessonPosition | undefined,
  questionIndex: number,
  questionCount: number,
): boolean {
  return lesson !== undefined && !lesson.last && questionIndex === questionCount - 1;
}
