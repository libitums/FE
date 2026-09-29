import type { EpisodeIntroMapItemProps } from "../episode-intro/episode-intro.contract";
import bookmark from "@libitums/icons/lynx/bookmark";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

import "./journey-special-unit.css";

// `LearningUnit`의 상태 어휘로 옮깁니다 — `EpisodeFinalMapItem`과 **같은 표**입니다.
// 두 벌을 두면 한쪽만 고쳐질 자리라, 어휘가 하나 더 늘면 둘 다 `tsc`가 세웁니다
// (spec §3 N12).
const unitStatusByStatus = {
  locked: "default",
  available: "available",
  completed: "clear",
} as const;

// 에피소드 표지의 맵 항목입니다 — 구획의 **첫 항목**이고, 이것을 끝내야 그 에피소드의
// 나머지가 열립니다(D6).
//
// **잠김 갈래를 두지 않습니다.** 표지 앞에는 걸 것이 없어 `mapItemStatus`가 표지에게는
// `locked`를 내지 않습니다. 그래도 `status` 타입은 공용을 쓰므로(계약) 어댑터 표에는
// `locked` 행이 남습니다 — 값이 안 올 뿐입니다.
//
// ⟨2026-09-29⟩ 아이콘이 `bookmark`인 것은 **계약 기본값 `clapper`를 기각**했기
// 때문입니다: `LearningUnit`이 `narrative` 유닛에 찍는 배지가 이미 `clapper`라,
// 같은 표식 안에 같은 글리프가 둘 서게 됩니다(design.md §1).
export function EpisodeIntroMapItem({ id, title, status, onSelect }: EpisodeIntroMapItemProps) {
  const handleSelect = () => {
    "background only";
    onSelect(id);
  };

  return (
    <view className="journey-special-unit">
      <LearningUnit
        id={id}
        accessibilityLabel={title}
        icon={bookmark}
        status={unitStatusByStatus[status]}
        narrative="narrative"
        bindtap={handleSelect}
      />
      <text className="journey-special-unit-label">{title}</text>
    </view>
  );
}
