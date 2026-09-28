import { ChatBubble } from "@libitums/ui-lynx/chat-bubble";

import type { MessageBubbleProps } from "./messenger.contract";
import "./message-bubble.css";

// sender 판별 union에 따라 한 줄을 냅니다 — 지민은 왼쪽, 나는 오른쪽에 붙습니다. 말풍선
// 자체(면 색 · 번역 줄 · 접근성 이름)는 ui-lynx `ChatBubble`이 집니다(Figma 80-7082).
export function MessageBubble({ message }: MessageBubbleProps) {
  const isSelf = message.sender === "self";

  return (
    <view
      className={`message-bubble message-bubble-${message.sender}`}
      data-testid={`messenger-message-${message.id}`}
      data-sender={message.sender}
    >
      <ChatBubble
        direction={isSelf ? "outgoing" : "incoming"}
        speaker={isSelf ? "나" : "지민"}
        message={message.text}
        translation={message.translation}
        size="m"
        contentLanguage="learning"
        languageTag="ko"
      />
    </view>
  );
}
