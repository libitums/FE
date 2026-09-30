import { Tooltip } from "@libitums/ui-lynx/tooltip";
import { useUiCopy } from "../../lib/ui-copy";
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
// **`locked`는 오늘 안 옵니다** — 표지 앞에는 걸 것이 없어 `mapItemStatus`가 표지에게
// 그 값을 내지 않습니다. 그래도 `status` 타입은 공용을 쓰므로(계약) 어댑터 표에 `locked`
// 행이 남고, **값이 오면 잠긴 것처럼 서고 눌리지 않아야 합니다**(아래 가드).
//
// ⟨2026-09-29⟩ 아이콘이 `bookmark`인 것은 **계약 기본값 `clapper`를 기각**했기
// 때문입니다: `LearningUnit`이 `narrative` 유닛에 찍는 배지가 이미 `clapper`라,
// 같은 표식 안에 같은 글리프가 둘 서게 됩니다(design.md §1).
export function EpisodeIntroMapItem({
  id,
  title,
  status,
  onSelect,
  guided = false,
}: EpisodeIntroMapItemProps & { guided?: boolean }) {
  const copy = useUiCopy();
  // 잠김이면 고르지 않습니다 — 특별 유닛 항목 넷과 **같은 모양**입니다.
  //
  // ⟨2026-09-30, 리뷰 반영⟩ 처음에는 이 가드를 **일부러 뺐습니다**: 표지는 구획의 첫
  // 항목이라 `mapItemStatus`가 `locked`를 내지 않으므로 닿을 수 없는 갈래라고 봤습니다.
  // 그런데 「안 오는 값」을 확인하는 엣지 케이스가 실제로 있고, 그것이 통과하는 이유가
  // **`LearningUnit`이 `default`에서 탭을 안 흘리기 때문**이었습니다 — 이 컴포넌트가
  // 스스로 막은 것이 아닙니다. 그 조각의 내부 동작이 바뀌면 넷은 버티고 여기만 깨집니다.
  const handleSelect = () => {
    "background only";
    if (status !== "locked") {
      onSelect(id);
    }
  };

  return (
    <view
      className={
        guided ? "journey-special-unit journey-special-unit-guided" : "journey-special-unit"
      }
    >
      <LearningUnit
        id={id}
        accessibilityLabel={title}
        icon={bookmark}
        status={unitStatusByStatus[status]}
        narrative="narrative"
        bindtap={handleSelect}
      />
      <text className="journey-special-unit-label">{title}</text>
      {guided ? (
        <view className="first-unit-map-tooltip" bindtap={handleSelect}>
          <Tooltip
            message={copy.episodeIntro.guide.map}
            tone="brand"
            placement="bottom"
            visibility="visible"
          />
        </view>
      ) : null}
    </view>
  );
}
