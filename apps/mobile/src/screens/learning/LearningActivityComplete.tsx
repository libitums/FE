import { useEffect } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { useMotion } from "@libitums/ui-lynx/motion";

import { useUiCopy } from "../../lib/ui-copy";
import { playSound } from "../../lib/sound-effects";
import type { LessonPosition } from "./activity-finish";
import {
  activityCompleteClassName,
  activityCompleteMotionOf,
  activityCompleteSummaryOf,
} from "./learning-activity-complete";

import "./learning-activity-complete.css";

/**
 * 활동 완료 안내입니다(시안 A — 링 + 체크). 정답률이나 유닛 보상을 판정하지 않습니다 — 판정은 다음 결과
 * 화면의 몫이라 제목도 「끝냈다」(`All questions done`)이지 「통과했다」가 아닙니다. 폭죽은 결과 화면에만
 * 있고 여기에는 없습니다(사용자 결정). XP 자리도 없습니다.
 *
 * 레슨 안이면(`lesson`) 칩 `Lesson n`과 레슨 전체 문항 수 · 활동 수 타일을 보입니다. 레슨이 모르는 값은
 * 지어내지 않고 그 칩 · 타일을 세우지 않습니다.
 */
export function LearningActivityComplete({
  questionCount,
  testId,
  lesson,
}: {
  readonly questionCount: number;
  readonly testId: string;
  readonly lesson?: LessonPosition;
}): ReactNode {
  const copy = useUiCopy();
  const kind = activityCompleteMotionOf(useMotion());
  const summary = activityCompleteSummaryOf(questionCount, lesson);
  const part = (name: Parameters<typeof activityCompleteClassName>[0]) =>
    activityCompleteClassName(name, kind);
  const showQuestions = summary.questionCount > 0;
  const showActivities = summary.activityCount !== null && summary.activityCount > 0;
  useEffect(() => {
    playSound("lesson_complete");
  }, []);
  return (
    <view
      className="learning-activity-complete"
      data-testid="learning-activity-complete"
      {...(kind === "still" ? { "data-motion": "reduced" } : {})}
    >
      {/* 장식 표식입니다 — 완료는 아래 제목이 말합니다. 링은 두 반쪽 회전 마스크로 차오릅니다(CSS 머리말). */}
      <view
        className="learning-activity-complete-emblem"
        data-testid="learning-activity-complete-ring"
        accessibility-elements-hidden={true}
      >
        <view className="learning-activity-complete-ring">
          <view className="learning-activity-complete-ring-track" />
          <view className="learning-activity-complete-ring-clip learning-activity-complete-ring-clip-right">
            <view className={part("ring-right")}>
              <view className="learning-activity-complete-ring-half learning-activity-complete-ring-half-left">
                <view className="learning-activity-complete-ring-arc" />
              </view>
            </view>
          </view>
          <view className="learning-activity-complete-ring-clip learning-activity-complete-ring-clip-left">
            <view className={part("ring-left")}>
              <view className="learning-activity-complete-ring-half learning-activity-complete-ring-half-right">
                <view className="learning-activity-complete-ring-arc learning-activity-complete-ring-arc-shifted" />
              </view>
            </view>
          </view>
        </view>
        <view className={part("fill")}>
          <view className={part("check")}>
            <svg
              className="learning-activity-complete-icon"
              data-testid="learning-activity-complete-icon"
              content={tick}
              current-color={color.white}
            />
          </view>
        </view>
      </view>
      {summary.lessonOrdinal === null ? null : (
        <view className="learning-activity-complete-chip">
          <text
            className="learning-activity-complete-chip-text"
            data-testid="learning-activity-complete-lesson"
          >
            {copy.catalogMap.lessonTitle(summary.lessonOrdinal)}
          </text>
        </view>
      )}
      <view className={part("rise")}>
        <text
          className="learning-activity-complete-title"
          data-testid={testId}
          accessibility-traits="header"
        >
          {copy.common.allQuestionsDone}
        </text>
      </view>
      <text className="learning-activity-complete-description">
        {copy.learningShell.completionDescription}
      </text>
      {showQuestions || showActivities ? (
        <view
          className={`learning-activity-complete-stats ${part("rise")}`}
          data-testid="learning-activity-complete-stats"
        >
          {showQuestions ? (
            <view
              className="learning-activity-complete-stat"
              data-testid="learning-activity-complete-questions"
              accessibility-element={true}
              accessibility-label={copy.learningShell.completedQuestions(summary.questionCount)}
            >
              <text className="learning-activity-complete-stat-value">
                {String(summary.questionCount)}
              </text>
              <text className="learning-activity-complete-stat-label">
                {copy.learningShell.completionStats.questions}
              </text>
            </view>
          ) : null}
          {showActivities ? (
            <view
              className="learning-activity-complete-stat"
              data-testid="learning-activity-complete-activities"
              accessibility-element={true}
              accessibility-label={copy.learningShell.completedActivities(
                summary.activityCount ?? 0,
              )}
            >
              <text className="learning-activity-complete-stat-value learning-activity-complete-stat-value-positive">
                {String(summary.activityCount)}
              </text>
              <text className="learning-activity-complete-stat-label">
                {copy.learningShell.completionStats.activities}
              </text>
            </view>
          ) : null}
        </view>
      ) : null}
    </view>
  );
}
