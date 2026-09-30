import { useUiCopy } from "../../lib/ui-copy";
import type { MessengerFinishButtonProps } from "./messenger.contract";
import "./messenger-finish-button.css";

// 끝난 대화의 하단 버튼입니다 — 학습 완료 화면(PERFECT LESSON)으로 갑니다. 이 유닛은
// 에피소드의 서사 기반 최종 테스트라, 끝나면 학습을 마치는 길로 이어집니다. 라벨은 다른
// 학습 화면의 마지막 버튼과 같은 `common.seeResults`입니다.
export function MessengerFinishButton({ onFinish }: MessengerFinishButtonProps) {
  const copy = useUiCopy();
  return (
    <view
      className="messenger-finish-button"
      data-testid="messenger-finish"
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={copy.common.seeResults}
      bindtap={onFinish}
    >
      <text className="messenger-finish-button-label">{copy.common.seeResults}</text>
    </view>
  );
}
