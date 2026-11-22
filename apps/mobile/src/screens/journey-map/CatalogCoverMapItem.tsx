import type { ReactNode } from "@lynx-js/react";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import { CATALOG_INTRO_KEY } from "../../lib/catalog-progress";
import { catalogCoverAccessibilityLabel } from "./catalog-map";
import { catalogMarkDomId } from "./map-footprints";
import type { CatalogCoverMapItemProps } from "./catalog-map.contract";
import { coverDownloadLabelOf, coverProgressRingSvg } from "./cover-download";

import { SpecialUnitMapItem } from "./SpecialUnitMapItem";

import "./catalog-cover-illustration.css";
import "./cover-download.css";

const ringColors = { track: color.border.disabled, arc: color.brand.primary };

// 카탈로그 에피소드의 표지 노드입니다. 잠김이면 고름을 올리지 않습니다 — 가드는
// `SpecialUnitMapItem`이 집니다. 첫 유닛 안내는 합성으로 답니다 — `layer="guide"`로 일러스트째 들리고 말풍선은 자식으로 붙습니다.
// 라벨은 제목 한 줄(「Intro」)입니다 — 다른 스페셜 노드도 같습니다. 일러스트(`illustration`)가 있으면 노드 뒤에 깝니다 — 노드 자리는 그대로이고
// 일러스트만 왼쪽(짝수 에피소드) · 오른쪽(홀수) 위로 물러납니다(ADR-0099). 장식이라 낭독 요소가 아닙니다.
// 받기 표시(`download`, ADR-0165)가 있으면 라벨 자리에 그 문구가 서고 낭독 이름 뒤에도 붙습니다. 받는 중이면 노드 둘레에
// 진행 고리(장식)를 겹칩니다.
export function CatalogCoverMapItem({
  episodeId,
  ordinal,
  status,
  onSelect,
  layer = "map",
  onTapBackdrop,
  children,
  illustration = null,
  download = { kind: "none" },
}: CatalogCoverMapItemProps): ReactNode {
  const copy = useUiCopy();
  const downloadLabel = coverDownloadLabelOf(download, copy.catalogMap);
  const name = catalogCoverAccessibilityLabel(ordinal, copy);

  const item = (
    <SpecialUnitMapItem
      unitId={`catalog-cover-${episodeId}`}
      title={downloadLabel ?? copy.catalogMap.coverTitle}
      accessibilityName={downloadLabel === null ? name : `${name}, ${downloadLabel}`}
      {...(download.kind === "getting-ready"
        ? {
            ring: (
              <svg
                key="ring"
                className="catalog-cover-ring"
                data-testid={`catalog-cover-ring-${episodeId}`}
                content={coverProgressRingSvg(download.percent, ringColors)}
                user-interaction-enabled={false}
                accessibility-element={false}
              />
            ),
          }
        : {})}
      status={status}
      layer={layer}
      markId={catalogMarkDomId(episodeId, CATALOG_INTRO_KEY)}
      onSelect={() => {
        "background only";
        onSelect(episodeId);
      }}
    >
      {children}
    </SpecialUnitMapItem>
  );
  if (illustration === null) return item;
  const guided = layer === "guide";
  // 들린 래퍼는 가림막을 덮으므로 그 자리의 탭을 가림막 대신 받습니다. 노드 탭도 여기로 올라오지만 닫기는 여러 번 불려도 같습니다.
  const handleTapBackdrop = () => {
    "background only";
    onTapBackdrop?.();
  };
  return (
    <view
      className={`catalog-cover-illustrated catalog-cover-illustrated-${illustration.side}${
        guided ? " catalog-cover-illustrated-guided" : ""
      }`}
      data-testid={`catalog-cover-illustrated-${episodeId}`}
      {...(guided ? { bindtap: handleTapBackdrop } : {})}
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
