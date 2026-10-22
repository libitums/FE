import type { ReactNode } from "@lynx-js/react";
import { Fog } from "@libitums/ui-lynx/fog";

import { LearningShellFeedbackPanel } from "./LearningShellFeedbackPanel";
import type { LearningShellFeedback } from "./learning-shell-props";

export function LearningShellActions({
  button,
  label,
  onAction,
  secondaryAction,
  inFlow,
  feedback,
}: {
  /** 주면 기본 버튼 대신 이것이 섭니다(활동이 세운 ui-lynx `Button`). */
  button?: ReactNode;
  label: string;
  onAction: () => void;
  secondaryAction?: ReactNode;
  inFlow: boolean;
  /** 주면 버튼 행이 흐름 안으로 오고 그 위에 해설 판이 서서 행을 감쌉니다. */
  feedback?: LearningShellFeedback;
}): ReactNode {
  const flowed = inFlow || feedback !== undefined;
  const row = (
    <view
      className={
        flowed ? "learning-shell-actions learning-shell-actions-in-flow" : "learning-shell-actions"
      }
      data-testid="learning-shell-actions"
    >
      {secondaryAction}
      {button === undefined ? (
        <view
          className="learning-shell-action"
          data-testid="learning-shell-action"
          accessibility-element={true}
          accessibility-label={label}
          accessibility-traits="button"
          bindtap={onAction}
        >
          <text className="learning-shell-action-label">{label}</text>
        </view>
      ) : (
        <view className="learning-shell-action-slot">{button}</view>
      )}
    </view>
  );
  if (feedback !== undefined) {
    return <LearningShellFeedbackPanel feedback={feedback}>{row}</LearningShellFeedbackPanel>;
  }
  return (
    <>
      {flowed ? null : (
        <view className="learning-shell-fog" event-through={true}>
          <Fog direction="bottom" size="full" color="surface-default" />
        </view>
      )}
      {row}
    </>
  );
}
