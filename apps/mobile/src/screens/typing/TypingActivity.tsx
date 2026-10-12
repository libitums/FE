import type { ReactNode } from "@lynx-js/react";

import type { TypingActivityProps } from "./typing.contract";

import "./typing-activity.css";

// 한글 자판으로 정답을 쳐서 답하는 활동입니다(카탈로그 받아쓰기 · 한국어로 쓰기).
export function TypingActivity(_props: TypingActivityProps): ReactNode {
  return <view className="typing-activity-content" data-testid="typing-activity-content" />;
}
