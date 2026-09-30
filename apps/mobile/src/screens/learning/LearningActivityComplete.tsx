import type { ReactNode } from "@lynx-js/react";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";

import "./learning-activity-complete.css";

/** 활동 완료 안내입니다. 정답률이나 유닛 보상을 판정하지 않습니다. */
export function LearningActivityComplete({
  questionCount,
  testId,
}: {
  readonly questionCount: number;
  readonly testId: string;
}): ReactNode {
  const copy = useUiCopy();
  return (
    <view className="learning-activity-complete" data-testid="learning-activity-complete">
      <view className="learning-activity-complete-emblem" accessibility-elements-hidden={true}>
        <svg
          className="learning-activity-complete-icon"
          data-testid="learning-activity-complete-icon"
          content={tick}
          current-color={color.brand.strong}
        />
      </view>
      <text
        className="learning-activity-complete-title"
        data-testid={testId}
        accessibility-traits="header"
      >
        {copy.common.allQuestionsDone}
      </text>
      <text className="learning-activity-complete-description">
        {copy.learningShell.completionDescription}
      </text>
      {questionCount === 0 ? null : (
        <view className="learning-activity-complete-summary">
          <text className="learning-activity-complete-summary-text">
            {copy.learningShell.completedQuestions(questionCount)}
          </text>
        </view>
      )}
    </view>
  );
}
