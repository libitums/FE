import type { ReactNode } from "@lynx-js/react";

import { EpisodeHeader } from "@libitums/ui-lynx/episode-header";

export type JourneyMapEpisodeHeaderProps = {
  /** 설명 줄입니다 — `Episode 1, unit 03`. */
  readonly episodeLabel: string;
  readonly title: string;
  readonly completedUnitCount: number;
  readonly totalUnitCount: number;
  /** 띠 상자의 `layoutchange`입니다. 머리 슬롯이 띠 높이를 잽니다. */
  readonly onLayoutChange?: (event: unknown) => void;
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
}: JourneyMapEpisodeHeaderProps): ReactNode {
  return (
    <view className="journey-map-screen-episode-header" bindlayoutchange={onLayoutChange}>
      <EpisodeHeader
        episodeLabel={episodeLabel}
        title={title}
        completedUnitCount={completedUnitCount}
        totalUnitCount={totalUnitCount}
      />
    </view>
  );
}
