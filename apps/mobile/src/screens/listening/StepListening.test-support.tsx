// 듣기 활동을 「스텝 이름 → 고정 문항」으로 부르는 테스트 안 어댑터입니다. 튜토리얼 route와 그 문항 표가 사라진 뒤에도
// 활동 테스트가 같은 모양의 입력(문항 셋 · 보기 넷 · 음성 id)으로 서게 합니다. 제품 코드가 import하지 않습니다.

import type { ReactNode } from "@lynx-js/react";

import type { AnswerResult } from "../../lib/answer-result";
import type { SessionOptions } from "../../lib/session-options";
import { ListeningActivity } from "./ListeningScreen";
import { questionsForStep } from "./listening-steps.test-support";
import type { ListeningStepId } from "./listening-steps.test-support";

export type StepListeningProps = {
  readonly stepId: ListeningStepId;
  readonly onExit: () => void;
  readonly onFinish: (
    id: ListeningStepId,
    results: readonly AnswerResult[],
    skippedCount: number,
  ) => void;
  readonly sessionOptions: SessionOptions;
  readonly gemCount?: number;
};

/** 스텝 이름으로 고정 문항을 골라 활동에 넘깁니다 — 활동의 끝 콜백에 스텝 이름을 덧붙입니다. */
export function StepListening({
  stepId,
  onExit,
  onFinish,
  sessionOptions,
  gemCount = 0,
}: StepListeningProps): ReactNode {
  return (
    <ListeningActivity
      questions={questionsForStep(stepId)}
      onExit={onExit}
      onFinish={(results, skippedCount) => onFinish(stepId, results, skippedCount)}
      sessionOptions={sessionOptions}
      gemCount={gemCount}
    />
  );
}
