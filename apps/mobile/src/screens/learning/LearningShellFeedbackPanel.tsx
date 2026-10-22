import type { ReactNode } from "@lynx-js/react";

import cross from "@libitums/icons/lynx/cross";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { useMotion } from "@libitums/ui-lynx/motion";

import { learningShellFeedbackLabel } from "./learning-shell.contract";
import type { LearningShellFeedback } from "./learning-shell-props";

export type LearningShellFeedbackPanelProps = {
  readonly feedback: LearningShellFeedback;
  /** 판 안 아래 버튼 행입니다. */
  readonly children?: ReactNode;
};

// 답한 뒤 아래에서 올라오는 해설 판입니다. 화면 가장자리까지 닿고 셸 아래 여백 안까지 내려옵니다. 판 전체가 하나의
// 낭독 이름(제목 + 줄들)은 글만 감싸는 안쪽 view가 지고, 아래 버튼 행은 그 형제라 따로 닿습니다(ADR-0016 D5 — 조작
// 단위를 접근성 요소 안에 넣지 않습니다). 글 부분만 높이 상한 안에서 스크롤해 큰 글꼴에서도 버튼이 화면 안에 남습니다.
// 판정 색 채널은 면 색 · 아이콘 모양 · 제목 글이 함께 집니다(WCAG 1.4.1).
export function LearningShellFeedbackPanel({
  feedback,
  children,
}: LearningShellFeedbackPanelProps): ReactNode {
  const reduced = useMotion() === "reduced";
  const className = [
    "learning-shell-feedback",
    `learning-shell-feedback-${feedback.tone}`,
    reduced ? "learning-shell-feedback-motion-reduced" : undefined,
  ]
    .filter((token): token is string => token !== undefined)
    .join(" ");
  return (
    <view className={className} data-testid="learning-shell-feedback" data-tone={feedback.tone}>
      <scroll-view
        className="learning-shell-feedback-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view
          className="learning-shell-feedback-body"
          data-testid="learning-shell-feedback-body"
          accessibility-element={true}
          accessibility-label={learningShellFeedbackLabel(feedback)}
        >
          <view className="learning-shell-feedback-head">
            <view
              className={`learning-shell-feedback-icon learning-shell-feedback-icon-${feedback.tone}`}
            >
              <svg
                className="learning-shell-feedback-icon-mark"
                content={feedback.tone === "correct" ? tick : cross}
                current-color={color.white}
              />
            </view>
            <text className="learning-shell-feedback-title">{feedback.title}</text>
          </view>
          {feedback.lines.map((line, index) => (
            <text
              key={`${line.lang}-${index}`}
              className={`learning-shell-feedback-line learning-shell-feedback-line-${line.lang}`}
              data-lang={line.lang}
            >
              {line.text}
            </text>
          ))}
        </view>
      </scroll-view>
      {children}
    </view>
  );
}
