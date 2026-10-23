import type { ReactNode } from "@lynx-js/react";

import { CatalogMapSections } from "./CatalogMapSections";
import "./catalog-map.css";
import type {
  CatalogMapGuide,
  CatalogUnitSelect,
  JourneyMapCatalogProps,
} from "./catalog-map.contract";
import type { JourneyMapNodeAccess } from "./journey-map-load.contract";

type JourneyMapCatalogSlotProps = {
  readonly catalog: JourneyMapCatalogProps;
  readonly access: JourneyMapNodeAccess;
  /** 첫 유닛 안내입니다 — 떠 있는 동안 대상 구획 밖은 구획이 낭독에서 가립니다. */
  readonly guide: CatalogMapGuide;
  /** 열린 유닛 노드를 눌렀을 때 — 맵이 말풍선을 엽니다. */
  readonly onSelectUnit: CatalogUnitSelect;
};

// 맵의 카탈로그 자리입니다 — 튜토리얼을 지났는지를 사용자 기록에서 받은 사실(`legacyTutorialPassed`)로 구획의
// 문에 넘깁니다.
export function JourneyMapCatalogSlot({
  catalog,
  access,
  guide,
  onSelectUnit,
}: JourneyMapCatalogSlotProps): ReactNode {
  return (
    <view className="journey-map-screen-catalog-slot">
      <CatalogMapSections
        sections={catalog.sections}
        gate={{
          legacyTutorialPassed: catalog.legacyTutorialPassed,
          progress: catalog.progress,
          ...(catalog.ticketUnits === undefined ? {} : { ticketUnits: catalog.ticketUnits }),
        }}
        access={access}
        guide={guide}
        onStartCover={catalog.onStartCover}
        onSelectUnit={onSelectUnit}
      />
    </view>
  );
}
