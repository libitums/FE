import type { ReplyButtonProps } from "./messenger.contract";
import "./reply-button.css";

// 고정 답장 하나를 버튼으로 노출합니다. bindtap 핸들러는 백그라운드에서 실행됩니다.
export function ReplyButton({ reply, onReply }: ReplyButtonProps) {
  return (
    <view
      className="reply-button"
      data-testid={`messenger-reply-${reply.id}`}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={reply.text}
      bindtap={onReply}
    >
      <text className="reply-button-label">{reply.text}</text>
    </view>
  );
}
