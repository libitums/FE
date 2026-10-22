import type { ReactNode } from "@lynx-js/react";

import type { AnswerResult } from "../../lib/answer-result";

export type LearningShellPromptProps = {
  readonly instruction: string;
  /** 주면 지시문 자리에 판정 배지가 겹쳐 섭니다. */
  readonly verdict?: AnswerResult;
};

// 지시문 줄입니다(판정 배지가 겹쳐 서는 자리). 껍데기만 있는 단계입니다 — 아직 셸이 쓰지 않습니다.
export function LearningShellPrompt({ instruction }: LearningShellPromptProps): ReactNode {
  return (
    <view data-testid="learning-shell-prompt">
      <text>{instruction}</text>
    </view>
  );
}
