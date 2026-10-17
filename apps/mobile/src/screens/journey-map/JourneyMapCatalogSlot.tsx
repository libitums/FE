import type { ReactNode } from "@lynx-js/react";

import { CatalogMapSections } from "./CatalogMapSections";
import { tutorialPassedFrom } from "./catalog-map";
import "./catalog-map.css";
import type { CatalogUnitSelect, JourneyMapCatalogProps } from "./catalog-map.contract";
import type { JourneyMapNodeAccess } from "./journey-map-load.contract";
import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";

type JourneyMapCatalogSlotProps = {
  /** 없으면 카탈로그 구획이 없는 맵(튜토리얼만)입니다. */
  readonly catalog: JourneyMapCatalogProps | undefined;
  readonly completedEpisodeFinalIds: readonly EpisodeFinalUnitId[];
  /** 첫 유닛 안내가 떠 있는 동안 구획 전체를 낭독에서 가립니다. */
  readonly hidden: boolean;
  readonly access: JourneyMapNodeAccess;
  /** 열린 유닛 노드를 눌렀을 때 — 맵이 말풍선을 엽니다. */
  readonly onSelectUnit: CatalogUnitSelect;
};

// 맵의 카탈로그 자리입니다 — 튜토리얼을 지났는지를 완료한 최종 테스트에서 파생해 구획에 넘기고, 첫 유닛
// 안내가 떠 있는 동안에는 구획 전체를 낭독에서 가립니다(튜토리얼 항목과 같은 규칙).
export function JourneyMapCatalogSlot({
  catalog,
  completedEpisodeFinalIds,
  hidden,
  access,
  onSelectUnit,
}: JourneyMapCatalogSlotProps): ReactNode {
  if (catalog === undefined) return null;
  return (
    <view className="journey-map-screen-catalog-slot" accessibility-elements-hidden={hidden}>
      <CatalogMapSections
        sections={catalog.sections}
        gate={{
          tutorialPassed: tutorialPassedFrom(completedEpisodeFinalIds),
          progress: catalog.progress,
        }}
        access={access}
        onStartCover={catalog.onStartCover}
        onSelectUnit={onSelectUnit}
      />
    </view>
  );
}
