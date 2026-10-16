import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { layoutHeightFrom } from "../learning/learning-shell.contract";
import { JourneyMapEpisodeHeader } from "./JourneyMapEpisodeHeader";
import { JourneyProgressLoadRow } from "./JourneyProgressLoadRow";
import type { JourneyMapHeaderSlotProps } from "./catalog-map.contract";
import { openedUnitOf } from "./episode-unit-label";
import { headerCardId } from "./journey-map-scroll";

// 띠 높이를 재기 전 첫 그림에서만 쓰는 값입니다.
const UNMEASURED_CARD_HEIGHT = 110;

// 머리 띠는 스텝 말풍선이 열린 동안만 섭니다 — 열린 스텝이 든 튜토리얼 구획을 그 스텝의 번호와 함께
// 말합니다(스크롤 자리와 무관합니다). 말풍선이 없으면 띠가 없고, 진행을 불러오는 줄은 칩 줄 아래에
// 섭니다. 띠가 함께 서면 줄은 띠 높이만큼 내려옵니다. 확인 중에는 노드를 누를 수 없어 말풍선이
// 열리지 않으므로 띠도 없습니다.
export function JourneyMapHeaderSlot({
  tutorialSections,
  progress,
  load,
  obscured = false,
  openStepId = null,
}: JourneyMapHeaderSlotProps): ReactNode {
  const [cardHeight, setCardHeight] = useState(UNMEASURED_CARD_HEIGHT);
  const handleCardLayout = (event: unknown): void => {
    "background only";
    const height = layoutHeightFrom(event);
    if (height !== undefined) setCardHeight(height);
  };
  const opened = openedUnitOf(tutorialSections, openStepId);

  const header =
    opened === undefined ? null : (
      <JourneyMapEpisodeHeader
        section={opened.section}
        unit={opened.unit}
        progress={progress}
        onLayoutChange={handleCardLayout}
      />
    );
  const row =
    load.status === "loading" || load.status === "retrying" ? (
      <JourneyProgressLoadRow status="loading" />
    ) : load.status === "failed" ? (
      <JourneyProgressLoadRow status="failed" onRetry={load.onRetry} obscured={obscured} />
    ) : null;
  // 줄은 띠와 따로 떠서 띠가 있으면 그 높이만큼 내려옵니다(둘을 한 상자로 묶으면 상자가 줄 폭만큼
  // 넓어져 곁의 노드 탭을 먹습니다). 띠 유무와 무관하게 같은 모양을 돌려줘 다시 마운트되지 않습니다.
  // 자동 스크롤 · 말풍선 자리는 `#headerCardId`의 아래 모서리에 맞춥니다. 띠가 없을 때도 잴 수 있게
  // 띠 자리에 손잡이를 늘 두고, 높이는 띠가 있으면 띠 높이 · 없으면 0입니다(탭은 받지 않습니다).
  return (
    <>
      <view
        id={headerCardId}
        className="journey-map-screen-header-anchor"
        data-testid="journey-map-screen-header-anchor"
        style={{ height: header === null ? "0px" : `${cardHeight}px` }}
        user-interaction-enabled={false}
      />
      {header}
      {row === null ? null : (
        <view
          className="journey-map-screen-progress-row"
          style={{ marginTop: header === null ? "0px" : `${cardHeight}px` }}
        >
          {row}
        </view>
      )}
    </>
  );
}
