import type { VisualNovelMapItemProps } from "../visual-novel/visual-novel.contract";
import book from "@libitums/icons/lynx/book";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

import "./journey-special-unit.css";

// `MessengerMapItem`과 같은 어댑터입니다 — 어휘와 아이콘만 다릅니다.
export function VisualNovelMapItem({ id, title, status, onSelect }: VisualNovelMapItemProps) {
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
        icon={book}
        status={status === "completed" ? "clear" : "available"}
        narrative="narrative"
        bindtap={handleSelect}
      />
      <text className="journey-special-unit-label">{title}</text>
    </view>
  );
}
