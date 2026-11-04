import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { catalogCoverAccessibilityLabel } from "./catalog-map";
import type { CatalogCoverMapItemProps } from "./catalog-map.contract";

import { SpecialUnitMapItem } from "./SpecialUnitMapItem";

import "./catalog-cover-illustration.css";

// 카탈로그 에피소드의 표지 노드입니다. 잠김이면 고름을 올리지 않습니다 — 가드는
// `SpecialUnitMapItem`이 집니다. 첫 유닛 안내는 합성으로 답니다 — `layer="guide"`로 들리고 말풍선은 자식으로 붙습니다.
// 라벨은 제목 한 줄(「Intro」)입니다. 일러스트(`illustration`)가 있으면 노드 뒤에 깝니다 — 노드 자리는 그대로이고
// 일러스트만 왼쪽(짝수 에피소드) · 오른쪽(홀수) 위로 물러납니다(ADR-0099). 장식이라 낭독 요소가 아닙니다.
export function CatalogCoverMapItem({
  episodeId,
  ordinal,
  status,
  onSelect,
  layer = "map",
  children,
  illustration = null,
}: CatalogCoverMapItemProps): ReactNode {
  const copy = useUiCopy();

  const item = (
    <SpecialUnitMapItem
      unitId={`catalog-cover-${episodeId}`}
      title={copy.catalogMap.coverTitle}
      accessibilityName={catalogCoverAccessibilityLabel(ordinal, copy)}
      status={status}
      layer={layer}
      label="title-only"
      onSelect={() => {
        "background only";
        onSelect(episodeId);
      }}
    >
      {children}
    </SpecialUnitMapItem>
  );
  if (illustration === null) return item;
  return (
    <view
      className={`catalog-cover-illustrated catalog-cover-illustrated-${illustration.side}`}
      data-testid={`catalog-cover-illustrated-${episodeId}`}
    >
      <image
        className={`catalog-cover-illustration${
          status === "locked" ? " catalog-cover-illustration-locked" : ""
        }`}
        data-testid={`catalog-cover-illustration-${episodeId}`}
        src={illustration.url}
        mode="aspectFit"
        accessibility-element={false}
      />
      {item}
    </view>
  );
}
