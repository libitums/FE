import type { MessengerMapItemProps } from "../messenger/messenger.contract";
import message02 from "@libitums/icons/lynx/message-02";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

import "./journey-special-unit.css";

// 특별 유닛은 일반 스텝 상태와 독립적으로 언제나 선택할 수 있습니다 — 그래서
// `LearningUnit`의 잠김 상태(`default`)를 쓰지 않습니다.
//
// 표식은 ui-lynx `LearningUnit`이 그립니다. 여기서는 메신저 유닛의 어휘를 그 컴포넌트의
// 어휘로 옮기고 제목 라벨을 아래에 붙이는 일만 합니다. `narrative`는 이 유닛이 이야기에
// 걸린 갈래라는 표시입니다 — 끊긴 링과 배지가 일반 스텝과 갈라 줍니다.
export function MessengerMapItem({ id, title, status, onSelect }: MessengerMapItemProps) {
  // custom prop(`LearningUnit`의 `bindtap`)을 거쳐 `bindtap`에 닿는 핸들러라
  // `'background only'`를 둡니다(docs/specs/messenger-special-unit.md).
  const handleSelect = () => {
    "background only";
    onSelect(id);
  };

  return (
    // 바깥 상자는 표식과 제목을 묶는 자리일 뿐입니다 — 탭도 접근성 요소도
    // `LearningUnit`이 집니다. 그래서 `data-testid`를 두지 않습니다.
    <view className="journey-special-unit">
      <LearningUnit
        id={id}
        accessibilityLabel={title}
        icon={message02}
        status={status === "completed" ? "clear" : "available"}
        narrative="narrative"
        bindtap={handleSelect}
      />
      <text className="journey-special-unit-label">{title}</text>
    </view>
  );
}
