import type { MessengerMapItemProps } from "../messenger/messenger.contract";
import message02 from "@libitums/icons/lynx/message-02";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

import "./journey-special-unit.css";

// `LearningUnit`의 상태 어휘로 옮깁니다 — `EpisodeFinalMapItem`·`EpisodeIntroMapItem`과
// **같은 표**입니다. 어휘가 하나 늘면 세 표가 함께 `tsc`에 섭니다.
const unitStatusByStatus = {
  locked: "default",
  available: "available",
  completed: "clear",
} as const;

// 특별 유닛은 스텝 진행과 독립적으로 열려 있습니다 — 다만 **표지 뒤에서만** 그렇습니다
// (ADR-0024 D6). 그 구획의 표지를 끝내기 전에는 `locked`가 와서 자물쇠로 섭니다.
// ⚠ 전에는 `status === "completed" ? "clear" : "available"` 삼항이라 **`locked`가
// `available`로 그려졌습니다** — 타입만 공용으로 바뀌고 어댑터가 따라오지 않으면
// 잠김이 화면에서 조용히 사라집니다.
//
// 표식은 ui-lynx `LearningUnit`이 그립니다. 여기서는 메신저 유닛의 어휘를 그 컴포넌트의
// 어휘로 옮기고 제목 라벨을 아래에 붙이는 일만 합니다. `narrative`는 이 유닛이 이야기에
// 걸린 갈래라는 표시입니다 — 끊긴 링과 배지가 일반 스텝과 갈라 줍니다.
export function MessengerMapItem({ id, title, status, onSelect }: MessengerMapItemProps) {
  // custom prop(`LearningUnit`의 `bindtap`)을 거쳐 `bindtap`에 닿는 핸들러라
  // `'background only'`를 둡니다(docs/specs/messenger-special-unit.md).
  const handleSelect = () => {
    "background only";
    if (status !== "locked") {
      onSelect(id);
    }
  };

  return (
    // 바깥 상자는 표식과 제목을 묶는 자리일 뿐입니다 — 탭도 접근성 요소도
    // `LearningUnit`이 집니다. 그래서 `data-testid`를 두지 않습니다.
    <view className="journey-special-unit">
      <LearningUnit
        id={id}
        accessibilityLabel={title}
        icon={message02}
        status={unitStatusByStatus[status]}
        narrative="narrative"
        bindtap={handleSelect}
      />
      <text className="journey-special-unit-label">{title}</text>
    </view>
  );
}
