// 문장 만들기 활동을 「스텝 이름 → 고정 문항」으로 부르는 테스트 안 어댑터입니다. 제품 코드가 import하지 않습니다.

import type { ReactNode } from "@lynx-js/react";

import type { AnswerResult } from "../../lib/answer-result";
import { SentenceOrderActivity } from "./SentenceOrderScreen";
import { stepQuestions } from "./sentence-order-steps.test-support";
import type { SentenceOrderStepId } from "./sentence-order-steps.test-support";

export type StepSentenceOrderProps = {
  readonly stepId: SentenceOrderStepId;
  readonly gemCount?: number;
  readonly onExit: () => void;
  readonly onFinish: (
    id: SentenceOrderStepId,
    results: readonly AnswerResult[],
    skippedCount: number,
  ) => void;
};

/** 스텝 이름으로 고정 문항을 골라 활동에 넘깁니다 — 활동의 끝 콜백에 스텝 이름을 덧붙입니다. */
export function StepSentenceOrder({
  stepId,
  gemCount = 0,
  onExit,
  onFinish,
}: StepSentenceOrderProps): ReactNode {
  return (
    <SentenceOrderActivity
      questions={stepQuestions[stepId]}
      gemCount={gemCount}
      onExit={onExit}
      onFinish={(results, skippedCount) => onFinish(stepId, results, skippedCount)}
    />
  );
}
