import { memo } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import type { JourneyMapCatalogProps, CatalogUnitSelect } from "./catalog-map.contract";
import { EpisodePendingSection } from "./EpisodePendingSection";
import { journeyMapSections } from "./journey-map";
import type { JourneyMapNodeAccess } from "./journey-map-load.contract";
import type { JourneyProgress } from "./journey-map-progress";
import { JourneyMapCatalogSlot } from "./JourneyMapCatalogSlot";
import { TutorialEpisodeSection } from "./TutorialEpisodeSection";
import type { TutorialMapActions } from "./TutorialMapItem";

/** 맵 본문이 부르는 동작들입니다 — 화면이 렌더마다 최신 함수를 넣는 ref라 본문이 다시 그려질 이유가 되지 않습니다. */
export type JourneyMapBodyHandlers = TutorialMapActions & {
  readonly onSelectCatalogUnit: CatalogUnitSelect;
  readonly dismissGuide: () => void;
};

export type JourneyMapBodyProps = {
  readonly progress: JourneyProgress;
  readonly access: JourneyMapNodeAccess;
  readonly guideVisible: boolean;
  readonly catalog: JourneyMapCatalogProps | undefined;
  readonly completedEpisodeFinalIds: readonly EpisodeFinalUnitId[];
  readonly handlers: { readonly current: JourneyMapBodyHandlers };
};

/**
 * 맵의 구획들(튜토리얼 · 준비 중 · 카탈로그)입니다. **스크롤 한 프레임마다 다시 그리지 않게 떼어 `memo`로 감쌉니다** —
 * 말풍선이 열린 동안 화면은 스크롤을 따라 말풍선 자리만 바꾸는데, 본문이 화면 안에 있으면 노드 수십 개가 매 프레임
 * 다시 그려져 스크롤이 끊겼습니다. 동작은 `handlers` ref를 거쳐 부르므로 함수가 새로 만들어져도 본문은 그대로입니다.
 */
function JourneyMapBodyView({
  progress,
  access,
  guideVisible,
  catalog,
  completedEpisodeFinalIds,
  handlers,
}: JourneyMapBodyProps): ReactNode {
  const actions: TutorialMapActions = {
    onSelectStep: (id, tapY) => handlers.current.onSelectStep(id, tapY),
    onStartEpisodeIntroUnit: (id) => handlers.current.onStartEpisodeIntroUnit(id),
    onStartMessengerUnit: (id) => handlers.current.onStartMessengerUnit(id),
    onStartPhoneCallUnit: (id) => handlers.current.onStartPhoneCallUnit(id),
    onStartVisualNovelUnit: (id) => handlers.current.onStartVisualNovelUnit(id),
    onStartEpisodeFinal: (id) => handlers.current.onStartEpisodeFinal(id),
  };
  const guide = { visible: guideVisible, dismiss: () => handlers.current.dismissGuide() };
  return (
    <>
      {journeyMapSections.map((section) =>
        // 에피소드 하나가 헤더 + 유닛 줄입니다. 준비 중 에피소드는 머리만 읽히고 그 아래가 가려집니다.
        section.episode.kind === "pending" ? (
          <EpisodePendingSection key={section.episode.id} episode={section.episode} />
        ) : (
          <TutorialEpisodeSection
            key={section.episode.id}
            episode={section.episode}
            items={section.items}
            progress={progress}
            access={access}
            guide={guide}
            actions={actions}
          />
        ),
      )}
      <JourneyMapCatalogSlot
        catalog={catalog}
        completedEpisodeFinalIds={completedEpisodeFinalIds}
        hidden={guideVisible}
        access={access}
        onSelectUnit={(episodeId, unitKey, tapY) =>
          handlers.current.onSelectCatalogUnit(episodeId, unitKey, tapY)
        }
      />
    </>
  );
}

export const JourneyMapBody = memo(JourneyMapBodyView);
