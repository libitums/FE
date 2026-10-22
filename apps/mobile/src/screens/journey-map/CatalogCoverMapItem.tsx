import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { catalogCoverAccessibilityLabel } from "./catalog-map";
import type { CatalogCoverMapItemProps } from "./catalog-map.contract";

import { SpecialUnitMapItem } from "./SpecialUnitMapItem";

// 카탈로그 에피소드의 표지 노드입니다. 잠김이면 고름을 올리지 않습니다 — 가드는
// `SpecialUnitMapItem`이 집습니다. 첫 유닛 안내는 합성으로 답니다 — `layer="guide"`로 들리고 말풍선은 자식으로 붙습니다.
export function CatalogCoverMapItem({
  episodeId,
  ordinal,
  status,
  onSelect,
  layer = "map",
  children,
}: CatalogCoverMapItemProps): ReactNode {
  const copy = useUiCopy();

  return (
    <SpecialUnitMapItem
      unitId={`catalog-cover-${episodeId}`}
      title={copy.catalogMap.coverTitle}
      accessibilityName={catalogCoverAccessibilityLabel(ordinal, copy)}
      status={status}
      layer={layer}
      onSelect={() => {
        "background only";
        onSelect(episodeId);
      }}
    >
      {children}
    </SpecialUnitMapItem>
  );
}
