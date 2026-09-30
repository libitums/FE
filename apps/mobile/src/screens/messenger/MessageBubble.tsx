import { ChatBubble } from "@libitums/ui-lynx/chat-bubble";

import { useUiCopy } from "../../lib/ui-copy";
import type { MessageBubbleProps } from "./messenger.contract";
import "./message-bubble.css";

// sender 판별 union에 따라 한 줄을 냅니다 — 지민은 왼쪽, 나는 오른쪽에 붙습니다. 말풍선
// 자체(면 색 · 번역 줄 · 접근성 이름)는 ui-lynx `ChatBubble`이 집니다(Figma 80-7082).
export function MessageBubble({
  message,
  animate = false,
  reducedMotion,
  onRevealComplete,
}: MessageBubbleProps) {
  const copy = useUiCopy();
  const isSelf = message.sender === "self";

  return (
    <view
      className={`message-bubble message-bubble-${message.sender}`}
      data-testid={`messenger-message-${message.id}`}
      data-sender={message.sender}
    >
      <ChatBubble
        direction={isSelf ? "outgoing" : "incoming"}
        speaker={isSelf ? copy.common.me : "Minseo"}
        message={message.text}
        translation={message.translation}
        reveal={animate && !isSelf ? "typewriter" : "instant"}
        reducedMotion={reducedMotion}
        onRevealComplete={onRevealComplete}
        size="m"
        contentLanguage="learning"
        languageTag="ko"
      />
    </view>
  );
}
