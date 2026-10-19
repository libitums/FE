import type { ReactNode } from "@lynx-js/react";
import { Fog } from "@libitums/ui-lynx/fog";

export function LearningShellActions({
  button,
  label,
  onAction,
  secondaryAction,
  inFlow,
}: {
  /** 주면 기본 버튼 대신 이것이 섭니다(활동이 세운 ui-lynx `Button`). */
  button?: ReactNode;
  label: string;
  onAction: () => void;
  secondaryAction?: ReactNode;
  inFlow: boolean;
}): ReactNode {
  return (
    <>
      {inFlow ? null : (
        <view className="learning-shell-fog" event-through={true}>
          <Fog direction="bottom" size="full" color="surface-default" />
        </view>
      )}
      <view
        className={
          inFlow
            ? "learning-shell-actions learning-shell-actions-in-flow"
            : "learning-shell-actions"
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
    </>
  );
}
