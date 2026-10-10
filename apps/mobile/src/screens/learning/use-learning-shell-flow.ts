import { useState } from "@lynx-js/react";

import { learningShellFlow } from "./learning-shell.contract";
import type { LearningShellFlow, LearningWorkspaceMode } from "./learning-shell.contract";

export type LearningShellFlowState = {
  readonly flow: LearningShellFlow;
  readonly reportViewportHeight: (height: number) => void;
};

/**
 * 측정값을 받아 몸통이 흐르는 방식을 기억합니다. 처음은 `split`이고, 판정은
 * `learningShellFlow`가 하며 이 훅은 결과가 달라질 때만 상태를 바꿉니다. 껍데기가 새로
 * 서면 `split`에서 다시 잽니다.
 */
export function useLearningShellFlow(workspaceMode: LearningWorkspaceMode): LearningShellFlowState {
  const [flow, setFlow] = useState<LearningShellFlow>("split");

  const reportViewportHeight = (height: number): void => {
    "background only";
    const next = learningShellFlow({ current: flow, workspaceMode, viewportHeight: height });
    if (next !== flow) {
      setFlow(next);
    }
  };

  return { flow, reportViewportHeight };
}
