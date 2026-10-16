import type { ReactNode } from "@lynx-js/react";

import lock from "@libitums/icons/lynx/lock";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

import { useUiCopy } from "../../lib/ui-copy";
import {
  catalogCaptionKindOf,
  catalogSectionDomId,
  catalogUnavailableAccessibilityLabel,
} from "./catalog-map";
import type { CatalogUnavailableSectionProps } from "./catalog-map.contract";

import "./episode-pending.css";
import "./catalog-map.css";

// 본문이 없거나 잠긴 에피소드의 구획입니다 — 구분선 · 흐린 자물쇠 표식 · 사유 캡션이고, 구획 전체가 낭독
// 요소 하나입니다(`EpisodePendingSection`과 같은 꼴). 머리는 그리지 않습니다.
export function CatalogUnavailableSection({ section }: CatalogUnavailableSectionProps): ReactNode {
  const copy = useUiCopy();
  const caption = copy.catalogMap.caption[catalogCaptionKindOf(section.reason)];

  return (
    <view
      // 구획 자리를 `#id` 선택자로 잴 수 있게 둡니다.
      id={catalogSectionDomId(section.episodeId)}
      className="journey-map-screen-episode"
      data-testid={`catalog-unavailable-${section.episodeId}`}
      accessibility-element={true}
      accessibility-label={catalogUnavailableAccessibilityLabel(section, copy)}
    >
      <view className="episode-pending-divider" />
      <view className="episode-pending-veil" accessibility-elements-hidden={true}>
        <LearningUnit accessibilityLabel={section.title} icon={lock} status="default" />
      </view>
      <text
        className="catalog-unavailable-caption"
        data-testid={`catalog-unavailable-caption-${section.episodeId}`}
      >
        {caption}
      </text>
    </view>
  );
}
