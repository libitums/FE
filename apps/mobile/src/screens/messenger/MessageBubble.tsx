import type { MessageBubbleProps } from "./messenger.contract";
import "./message-bubble.css";

// sender 판별 union에 따라 화자와 말풍선의 시각·접근성 정보를 함께 냅니다.
export function MessageBubble({ message }: MessageBubbleProps) {
  const isSelf = message.sender === "self";
  const speaker = isSelf ? "나" : "지민";

  return (
    <view
      className={`message-bubble message-bubble-${message.sender}`}
      data-testid={`messenger-message-${message.id}`}
      data-sender={message.sender}
      accessibility-label={`${speaker}, ${message.text}`}
    >
      <text className="message-bubble-speaker">{speaker}</text>
      <text className="message-bubble-text">{message.text}</text>
    </view>
  );
}
