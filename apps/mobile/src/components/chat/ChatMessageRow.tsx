import type { ReactNode } from "@lynx-js/react";

import { Avatar } from "@libitums/ui-lynx/avatar";
import { ChatBubble } from "@libitums/ui-lynx/chat-bubble";

import type {
  ChatIncomingRowProps,
  ChatOutgoingRowProps,
  ChatPhotoProps,
  ChatTextBubbleProps,
} from "./chat.contract";

import "./chat.css";

// 상대 줄 — 왼쪽 위 아바타 + 쌓음(사진 · 말풍선).
export function ChatIncomingRow({ avatar, testId, children }: ChatIncomingRowProps): ReactNode {
  return (
    <view className="chat-row" data-testid={testId}>
      <Avatar
        name={avatar.name}
        imageSource={avatar.imageUrl ?? undefined}
        size="sm"
        accessibility="hidden"
      />
      <view className="chat-stack">{children}</view>
    </view>
  );
}

export function ChatOutgoingRow({ testId, children }: ChatOutgoingRowProps): ReactNode {
  return (
    <view className="chat-row chat-row-outgoing" data-testid={testId}>
      {children}
    </view>
  );
}

export function ChatTextBubble({
  direction,
  speaker,
  message,
  translation,
}: ChatTextBubbleProps): ReactNode {
  return (
    <ChatBubble
      direction={direction}
      message={message}
      speaker={speaker}
      size="m"
      contentLanguage="learning"
      languageTag="ko"
      translation={translation ?? undefined}
    />
  );
}

// 사진 메시지 — ChatBubble에 그림 갈래가 없어 말풍선 위 카드로 둡니다.
export function ChatPhoto({ src, aspect, testId }: ChatPhotoProps): ReactNode {
  return (
    <image
      className={aspect === "portrait-9x16" ? "chat-photo-9x16" : "chat-photo-3x4"}
      data-testid={testId}
      src={src}
      mode="aspectFill"
    />
  );
}
