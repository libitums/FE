import type { ReactNode } from "@lynx-js/react";

import { Avatar } from "@libitums/ui-lynx/avatar";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";

import type { ChatTypingRowProps } from "./chat.contract";

import "./chat.css";

// 입력 중 줄 — 점 셋. 줄 전체가 한 요소로 읽히고, 움직임 줄이기에서는 점이 멈춥니다.
export function ChatTypingRow({ avatar, label, testId }: ChatTypingRowProps): ReactNode {
  const reducedMotion = resolveReducedMotion(undefined, useMotion());
  return (
    <view
      className="chat-row"
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={label}
    >
      <Avatar
        name={avatar.name}
        imageSource={avatar.imageUrl ?? undefined}
        size="sm"
        accessibility="hidden"
      />
      <view className={`chat-typing${reducedMotion ? " chat-typing-still" : ""}`}>
        <view className="chat-dot" />
        <view className="chat-dot chat-dot-2" />
        <view className="chat-dot chat-dot-3" />
      </view>
    </view>
  );
}
