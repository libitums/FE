import type { ReactNode } from "@lynx-js/react";

import { useMotion } from "@libitums/ui-lynx/motion";
import { Overlay } from "@libitums/ui-lynx/overlay";

import "./chat-overlays.css";

export type ChatModalFrameProps = {
  readonly testId: string;
  readonly title: string;
  readonly description: string;
  readonly children?: ReactNode;
  /** 버튼 줄입니다(Cancel · 주 버튼). 칸마다 `chat-modal-action` 감싸개를 둡니다. */
  readonly actions: ReactNode;
  /** 글 정렬입니다. 기본은 가운데(확인 대화상자), 입력이 든 대화상자는 `start`. */
  readonly align?: "center" | "start";
};

// ui-lynx `Dialog`는 제목 · 설명 · 버튼만 받아 입력 칸 · 잔액 줄을 끼울 수 없어, 같은 딤(`Overlay`) 위에 앱 쪽 상자를
// 짓습니다(`OutOfTicketsDialog` 선례). 상자는 dialog 역할이고, 움직임 줄이기면 열림 움직임이 없습니다.
export function ChatModalFrame({
  testId,
  title,
  description,
  children,
  actions,
  align = "center",
}: ChatModalFrameProps): ReactNode {
  const reduced = useMotion() === "reduced";
  return (
    <view
      className={`chat-modal chat-modal-align-${align}${reduced ? " chat-modal-motion-reduced" : ""}`}
      data-testid={testId}
      event-through={false}
    >
      <Overlay scope="screen" surface="dialog" dismiss="none" />
      <view className="chat-modal-container" accessibility-role-description="dialog">
        <text className="chat-modal-title" accessibility-traits="header">
          {title}
        </text>
        <text className="chat-modal-description">{description}</text>
        {children}
        <view className="chat-modal-actions">{actions}</view>
      </view>
    </view>
  );
}
