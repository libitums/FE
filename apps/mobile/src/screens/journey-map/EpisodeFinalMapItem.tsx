import type { EpisodeFinalMapItemProps } from "../episode-final/episode-final.contract";
import flag from "@libitums/icons/lynx/flag";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

import "./journey-special-unit.css";

// `LearningUnit`의 상태 어휘로 옮깁니다. 잠긴 동안은 `default`(자물쇠)이고, 열리면
// `available`, 끝내면 `clear`(체크)입니다.
const unitStatusByStatus = {
  locked: "default",
  available: "available",
  completed: "clear",
} as const;

// 최종 테스트의 맵 항목입니다 — 다른 특별 유닛과 같은 어댑터이고, 다른 것은 **잠김**이
// 있다는 것 하나입니다. 잠긴 동안은 눌러도 아무 일이 없습니다(스텝 노드의 잠김과 같습니다).
export function EpisodeFinalMapItem({ id, title, status, onSelect }: EpisodeFinalMapItemProps) {
  const handleSelect = () => {
    "background only";
    if (status !== "locked") {
      onSelect(id);
    }
  };

  return (
    <view className="journey-special-unit">
      <LearningUnit
        id={id}
        accessibilityLabel={title}
        icon={flag}
        status={unitStatusByStatus[status]}
        narrative="narrative"
        bindtap={handleSelect}
      />
      <text className="journey-special-unit-label">{title}</text>
    </view>
  );
}
