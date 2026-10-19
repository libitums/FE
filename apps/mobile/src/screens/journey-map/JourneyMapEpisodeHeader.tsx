import type { ReactNode } from "@lynx-js/react";

import { EpisodeHeader } from "@libitums/ui-lynx/episode-header";
import { sheetEntranceClasses, type SheetEntranceMotion } from "./journey-map-sheet-motion";

import "./step-sheet-motion.css";

export type JourneyMapEpisodeHeaderProps = {
  /** 설명 줄입니다 — `Episode 1, unit 03`. */
  readonly episodeLabel: string;
  readonly title: string;
  readonly completedUnitCount: number;
  readonly totalUnitCount: number;
  /** 띠 상자의 `layoutchange`입니다. 머리 슬롯이 띠 높이를 잽니다. */
  readonly onLayoutChange?: (event: unknown) => void;
  /** 띠의 등장 모션입니다. 없으면 `none`(모션 없음). */
  readonly entrance?: SheetEntranceMotion;
};

/**
 * 맵 위에 겹치는 에피소드 머리 띠입니다(`JourneyMapScreen`에서 뗐습니다 — 300줄 한도).
 * `EpisodeHeader`에 설명 줄 · 제목 · 진행 막대를 얹습니다. 값은 머리 슬롯이 튜토리얼 구획이나 카탈로그
 * 구획에서 골라 넘깁니다.
 */
export function JourneyMapEpisodeHeader({
  episodeLabel,
  title,
  completedUnitCount,
  totalUnitCount,
  onLayoutChange,
  entrance = "none",
}: JourneyMapEpisodeHeaderProps): ReactNode {
  const motion = sheetEntranceClasses(entrance);
  // 줄이기 표식은 움직이는 래퍼에 답니다 — 접근성 노드(`EpisodeHeader` 루트)에는 섞지 않습니다.
  return (
    <view
      className={motion.band}
      bindlayoutchange={onLayoutChange}
      {...(motion.motionReduced ? { "data-motion": "reduced" } : {})}
    >
      <EpisodeHeader
        episodeLabel={episodeLabel}
        title={title}
        completedUnitCount={completedUnitCount}
        totalUnitCount={totalUnitCount}
        progressEntrance={motion.bandProgress}
      />
    </view>
  );
}
