import type { ReactNode } from "@lynx-js/react";

import lock from "@libitums/icons/lynx/lock";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import { catalogSectionDomId } from "./catalog-map";

import "./episode-pending.css";
import "./catalog-coming-soon.css";

export type CatalogComingSoonSectionProps = {
  /** 이 구획의 에피소드 번호 — 마지막 열린 에피소드 + 1(`catalogComingSoonOrdinal`), 또는 받는 중인 에피소드의 번호. */
  readonly ordinal: number;
  /**
   * 받는 중(`pending`)인 에피소드의 id입니다. 있으면 그 구획의 자리(`catalogSectionDomId`)와 testid
   * `catalog-pending-<id>`를 답니다 — 다 받으면 같은 자리에 열린 구획이 섭니다(ADR-0071 D4). 없으면 맨 끝 구획입니다.
   */
  readonly episodeId?: string;
  /** 참이면 구획 전체를 낭독에서 가립니다(첫 유닛 안내가 다른 구획을 가리키는 동안). */
  readonly hidden?: boolean;
};

// 빈 지도의 줄입니다 — 표지 하나, 두 열 두 줄(실제 배치와 같습니다). 줄마다 조금씩 더 흐립니다.
const ghostRows = [["cover"], ["a", "b"], ["c", "d"]] as const;

// 카탈로그 맨 끝 「다음 에피소드 준비 중」 구획입니다(시안 C1). 실제 배치 그대로의 점선 빈 지도가 아래로 흐려지고,
// 그 위에 흰 카드가 `Episode n.` · `Coming soon` · 한 줄 안내를 싣습니다. 누를 수 없고, 구획 전체가 낭독 요소
// 하나입니다(`CatalogUnavailableSection`과 같은 꼴) — 안쪽은 장식이라 가립니다.
export function CatalogComingSoonSection({
  ordinal,
  episodeId,
  hidden,
}: CatalogComingSoonSectionProps): ReactNode {
  const copy = useUiCopy();
  const episodeLabel = copy.catalogMap.episodeLabel(ordinal);

  return (
    <view
      {...(episodeId === undefined ? {} : { id: catalogSectionDomId(episodeId) })}
      className="journey-map-screen-episode"
      data-testid={episodeId === undefined ? "catalog-coming-soon" : `catalog-pending-${episodeId}`}
      accessibility-element={true}
      accessibility-label={copy.catalogMap.comingSoon.label(episodeLabel)}
      {...(hidden === undefined ? {} : { "accessibility-elements-hidden": hidden })}
    >
      <view className="episode-pending-divider" />
      <view className="catalog-coming-soon-stage" accessibility-elements-hidden={true}>
        <view className="catalog-coming-soon-ghosts">
          {ghostRows.map((row, depth) => (
            <view key={row.join("+")} className="catalog-coming-soon-row">
              {row.map((slot) => (
                <view
                  key={slot}
                  className={`catalog-coming-soon-ghost catalog-coming-soon-ghost-${depth}`}
                >
                  <view className="catalog-coming-soon-ghost-fill" />
                </view>
              ))}
            </view>
          ))}
        </view>
        <view className="catalog-coming-soon-fade" />
        <view className="catalog-coming-soon-card-slot">
          <view className="catalog-coming-soon-card">
            <view className="catalog-coming-soon-heading">
              <svg
                className="catalog-coming-soon-lock"
                content={lock}
                current-color={color.brand.primary}
              />
              <text className="catalog-coming-soon-label" data-testid="catalog-coming-soon-label">
                {episodeLabel}
              </text>
            </view>
            <text className="catalog-coming-soon-title" data-testid="catalog-coming-soon-title">
              {copy.catalogMap.comingSoon.title}
            </text>
            <text className="catalog-coming-soon-body" data-testid="catalog-coming-soon-body">
              {copy.catalogMap.comingSoon.body}
            </text>
          </view>
        </view>
      </view>
    </view>
  );
}
