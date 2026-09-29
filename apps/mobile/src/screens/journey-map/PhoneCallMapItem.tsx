import type { PhoneCallMapItemProps } from "../phone-call/phone-call.contract";
import phone from "@libitums/icons/lynx/phone";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

import "./journey-special-unit.css";

// `LearningUnit`의 상태 어휘로 옮깁니다 — `MessengerMapItem`과 **같은 표**입니다.
const unitStatusByStatus = {
  locked: "default",
  available: "available",
  completed: "clear",
} as const;

// `MessengerMapItem`과 같은 어댑터입니다 — 어휘와 아이콘만 다릅니다. 잠김도 같습니다:
// 그 구획의 표지를 끝내기 전에는 `locked`가 와서 자물쇠로 서고 눌러도 무동작입니다.
export function PhoneCallMapItem({ id, title, status, onSelect }: PhoneCallMapItemProps) {
  const handleSelect = () => {
    "background only";
    if (status !== "locked") {
      onSelect(id);
    }
  };

  return (
    // 바깥 상자는 표식과 제목을 묶는 자리일 뿐입니다(MessengerMapItem과 같은 이유).
    <view className="journey-special-unit">
      <LearningUnit
        id={id}
        accessibilityLabel={title}
        icon={phone}
        status={unitStatusByStatus[status]}
        narrative="narrative"
        bindtap={handleSelect}
      />
      <text className="journey-special-unit-label">{title}</text>
    </view>
  );
}
