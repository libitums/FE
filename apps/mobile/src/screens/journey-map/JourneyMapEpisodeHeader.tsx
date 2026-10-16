import type { ReactNode } from "@lynx-js/react";

import { EpisodeHeader } from "@libitums/ui-lynx/episode-header";

import { useUiCopy } from "../../lib/ui-copy";
import { completedMapItemCount } from "./journey-map";
import type { JourneyMapSection, JourneyProgress } from "./journey-map";

export type JourneyMapEpisodeHeaderProps = {
  /** 열린 스텝이 든 튜토리얼 구획입니다. */
  readonly section: JourneyMapSection;
  /** 열린 스텝의 구획 안 자리(0부터)입니다 — 설명 줄의 unit 번호입니다. */
  readonly unit: number;
  readonly progress: JourneyProgress;
  /** 띠 상자의 `layoutchange`입니다. 머리 슬롯이 띠 높이를 잽니다. */
  readonly onLayoutChange?: (event: unknown) => void;
};

/**
 * 맵 위에 겹치는 에피소드 머리 띠입니다(`JourneyMapScreen`에서 뗐습니다 — 300줄 한도).
 * `EpisodeHeader`에 설명 줄 · 제목 · 진행 막대를 얹습니다.
 */
export function JourneyMapEpisodeHeader({
  section,
  unit,
  progress,
  onLayoutChange,
}: JourneyMapEpisodeHeaderProps): ReactNode {
  const copy = useUiCopy();
  return (
    <view className="journey-map-screen-episode-header" bindlayoutchange={onLayoutChange}>
      <EpisodeHeader
        episodeLabel={copy.journeyMap.episodeUnitLabel(section.episode.label, unit)}
        title={section.episode.title}
        completedUnitCount={completedMapItemCount(section.items, progress)}
        totalUnitCount={section.items.length}
      />
    </view>
  );
}
