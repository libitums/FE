import type { ReactNode } from "@lynx-js/react";

import { MapUnitCell, MapUnitRow } from "./MapUnitRow";
import { TutorialMapItem, type TutorialGuide, type TutorialMapActions } from "./TutorialMapItem";
import { episodeSectionId, mapUnitDomId } from "./journey-map-scroll";
import { mapRowItems, tutorialItemId, tutorialRowsOf } from "./journey-map-rows";
import type { JourneyProgress } from "./journey-map-progress";
import type { JourneyMapNodeAccess } from "./journey-map-load.contract";
import type { JourneyFilledEpisode, JourneyMapItem } from "./journey-map-types";
import { useMapColumns } from "./useMapColumns";

export type TutorialEpisodeSectionProps = {
  readonly episode: JourneyFilledEpisode;
  readonly items: readonly JourneyMapItem[];
  readonly progress: JourneyProgress;
  /** 노드를 누를 수 있는가입니다 — 진행을 확인하는 동안은 `checking`입니다. */
  readonly access: JourneyMapNodeAccess;
  readonly guide: TutorialGuide;
  readonly actions: TutorialMapActions;
};

// 채워진 튜토리얼 구획 하나를 줄로 세웁니다. 조각(Fragment)이 아니라 상자로 감쌉니다 — 줄 사이
// 간격은 맵이 주지만 에피소드 사이는 더 벌어져야 하고, 그 간격을 이 상자가 집니다.
// 첫 유닛 가이드가 떠 있으면 표지를 뺀 유닛을 낭독에서 가립니다 — 줄이 아니라 **유닛마다** 겁니다.
export function TutorialEpisodeSection({
  episode,
  items,
  progress,
  access,
  guide,
  actions,
}: TutorialEpisodeSectionProps): ReactNode {
  const columns = useMapColumns();
  return (
    // 구획 자리를 `#id` 선택자로 잴 수 있게 둡니다.
    <view id={episodeSectionId(episode.id)} className="journey-map-screen-episode">
      {tutorialRowsOf(items, columns).map((row) => {
        const rowItems = mapRowItems(row);
        return (
          <MapUnitRow key={rowItems.map(tutorialItemId).join("+")} kind={row.kind}>
            {rowItems.map((item) => {
              const itemId = tutorialItemId(item);
              return (
                <MapUnitCell key={itemId} domId={mapUnitDomId(itemId)} testKey={itemId}>
                  <view
                    className="journey-map-cell-body"
                    accessibility-elements-hidden={
                      guide.visible &&
                      !(item.kind === "episode-intro" && item.id === "tutorial-intro")
                    }
                  >
                    <TutorialMapItem
                      item={item}
                      sectionItems={items}
                      progress={progress}
                      access={access}
                      guide={guide}
                      actions={actions}
                    />
                  </view>
                </MapUnitCell>
              );
            })}
          </MapUnitRow>
        );
      })}
    </view>
  );
}
