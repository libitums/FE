import type { ReactNode } from "@lynx-js/react";

import { EpisodeHeader } from "@libitums/ui-lynx/episode-header";

import { useUiCopy } from "../../lib/ui-copy";
import { catalogSectionProgress } from "./catalog-map";
import { catalogTitleLines } from "./catalog-title";
import type { CatalogEpisodeHeaderProps } from "./catalog-map.contract";

import "./episode-pending.css";

// 카드 폭(151px)에서 한 줄에 기본 크기로 들어가는 글자 수입니다.
const TITLE_MAX_CHARS_PER_LINE = 8;

// 맵 위에 겹치는 카탈로그 머리 카드입니다. 본문이 있으면 진행 막대가 있는 `EpisodeHeader`(제목은 띄어쓰기에서 최대 두 줄로
// 나누고 넘치면 작은 글자 단계로 내립니다), 없으면 번호 · 이름 두 줄입니다.
export function CatalogEpisodeHeader({ section, progress }: CatalogEpisodeHeaderProps): ReactNode {
  const copy = useUiCopy();
  const label = copy.catalogMap.episodeLabel(section.ordinal);

  if (section.kind === "catalog-unavailable") {
    return (
      <view className="journey-map-screen-episode-header">
        <view className="episode-pending-card" data-testid="catalog-header-unavailable">
          <text className="episode-pending-card-label">{label}</text>
          <text className="episode-pending-card-title">{section.title}</text>
        </view>
      </view>
    );
  }

  const { completed, total } = catalogSectionProgress(section, progress);
  const titleLines = catalogTitleLines(section.title, TITLE_MAX_CHARS_PER_LINE);
  return (
    <view className="journey-map-screen-episode-header">
      <EpisodeHeader
        episodeLabel={label}
        title={section.title}
        completedUnitCount={completed}
        totalUnitCount={total}
        titleLines={titleLines.lines}
        titleSize={titleLines.size}
      />
    </view>
  );
}
