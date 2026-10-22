import type { ReactNode } from "@lynx-js/react";

import type { LearningShellFeedback } from "./learning-shell-props";

export type LearningShellFeedbackPanelProps = {
  readonly feedback: LearningShellFeedback;
  /** 판 안 아래 버튼입니다. */
  readonly children?: ReactNode;
};

// 답한 뒤 아래에서 올라오는 해설 판입니다. 껍데기만 있는 단계입니다 — 아직 셸이 쓰지 않습니다.
export function LearningShellFeedbackPanel({
  feedback,
  children,
}: LearningShellFeedbackPanelProps): ReactNode {
  return (
    <view data-testid="learning-shell-feedback" data-tone={feedback.tone}>
      {children}
    </view>
  );
}
