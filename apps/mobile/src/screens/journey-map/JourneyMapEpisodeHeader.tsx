import type { ReactNode } from "@lynx-js/react";

import { EpisodeHeader } from "@libitums/ui-lynx/episode-header";

import { completedMapItemCount } from "./journey-map";
import type { JourneyMapSection, JourneyProgress } from "./journey-map";

export type JourneyMapEpisodeHeaderProps = {
  /** 스크롤 자리가 고른 구획입니다. 없으면 머리 카드를 그리지 않습니다. */
  readonly section: JourneyMapSection | undefined;
  readonly progress: JourneyProgress;
};

/**
 * 맵 위에 겹치는 에피소드 머리 카드입니다(`JourneyMapScreen`에서 뗐습니다 — 300줄 한도).
 * 준비 중 에피소드는 라벨 · 제목만, 나머지는 `EpisodeHeader`에 진행 막대를 얹습니다.
 */
export function JourneyMapEpisodeHeader({
  section,
  progress,
}: JourneyMapEpisodeHeaderProps): ReactNode {
  return (
    <view className="journey-map-screen-episode-header">
      {section?.episode.kind === "pending" ? (
        <view className="episode-pending-card">
          <text className="episode-pending-card-label">{section.episode.label}</text>
          <text className="episode-pending-card-title">{section.episode.title}</text>
        </view>
      ) : section === undefined ? null : (
        <EpisodeHeader
          episodeLabel={section.episode.label}
          title={section.episode.title}
          completedUnitCount={completedMapItemCount(section.items, progress)}
          totalUnitCount={section.items.length}
        />
      )}
    </view>
  );
}
