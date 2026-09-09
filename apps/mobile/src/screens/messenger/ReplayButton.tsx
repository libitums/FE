import type { ReplayButtonProps } from "./messenger.contract";
import "./replay-button.css";

// 완료된 대화를 첫 메시지부터 다시 시작하는 의도를 버튼으로 전달합니다.
export function ReplayButton({ onReplay }: ReplayButtonProps) {
  return (
    <view
      className="replay-button"
      data-testid="messenger-replay"
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label="처음부터 보기"
      bindtap={onReplay}
    >
      <text className="replay-button-label">처음부터 보기</text>
    </view>
  );
}
