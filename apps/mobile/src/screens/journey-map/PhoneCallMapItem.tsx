import type { PhoneCallMapItemProps } from "../phone-call/phone-call.contract";
import phone from "@libitums/icons/lynx/phone";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

import "./journey-special-unit.css";

// `MessengerMapItem`과 같은 어댑터입니다 — 어휘와 아이콘만 다릅니다.
export function PhoneCallMapItem({ id, title, status, onSelect }: PhoneCallMapItemProps) {
  const handleSelect = () => {
    "background only";
    onSelect(id);
  };

  return (
    // 바깥 상자는 표식과 제목을 묶는 자리일 뿐입니다(MessengerMapItem과 같은 이유).
    <view className="journey-special-unit">
      <LearningUnit
        id={id}
        accessibilityLabel={title}
        icon={phone}
        status={status === "completed" ? "clear" : "available"}
        narrative="narrative"
        bindtap={handleSelect}
      />
      <text className="journey-special-unit-label">{title}</text>
    </view>
  );
}
