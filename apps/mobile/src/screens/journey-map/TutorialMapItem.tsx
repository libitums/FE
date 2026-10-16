import type { ReactNode } from "@lynx-js/react";

import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../episode-intro/episode-intro.contract";
import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";
import { EpisodeFinalMapItem } from "./EpisodeFinalMapItem";
import { EpisodeIntroMapItem } from "./EpisodeIntroMapItem";
import { JourneyStepNode } from "./JourneyStepNode";
import { MessengerMapItem } from "./MessengerMapItem";
import { PhoneCallMapItem } from "./PhoneCallMapItem";
import { VisualNovelMapItem } from "./VisualNovelMapItem";
import { journeyStepOrdinal, mapItemStatus } from "./journey-map";
import { mapNodeStatusUnder, stepNodeStatusUnder } from "./journey-map-load";
import type { JourneyMapNodeAccess } from "./journey-map-load.contract";
import type { JourneyMapItem, JourneyStepId } from "./journey-map";
import type { JourneyProgress } from "./journey-map-progress";

export type TutorialMapActions = {
  readonly onSelectStep: (id: JourneyStepId, tapY: number) => void;
  readonly onStartEpisodeIntroUnit: (id: EpisodeIntroUnitId) => void;
  readonly onStartMessengerUnit: (id: MessengerUnitId) => void;
  readonly onStartPhoneCallUnit: (id: PhoneCallUnitId) => void;
  readonly onStartVisualNovelUnit: (id: VisualNovelUnitId) => void;
  readonly onStartEpisodeFinal: (id: EpisodeFinalUnitId) => void;
};

export type TutorialGuide = { readonly visible: boolean; readonly dismiss: () => void };

export type TutorialMapItemProps = {
  readonly item: JourneyMapItem;
  readonly sectionItems: readonly JourneyMapItem[];
  readonly progress: JourneyProgress;
  readonly access: JourneyMapNodeAccess;
  readonly guide: TutorialGuide;
  readonly actions: TutorialMapActions;
};

// 튜토리얼 맵 항목 하나를 종류에 맞는 컴포넌트로 옮깁니다. 모든 잠김은 `mapItemStatus`에서
// 파생하고, `default` 없는 switch로 새 종류의 누락을 잡습니다.
export function TutorialMapItem({
  item,
  sectionItems,
  progress,
  access,
  guide,
  actions,
}: TutorialMapItemProps): ReactNode {
  const itemStatus = mapItemStatus(item, sectionItems, progress);
  // 진행을 확인하는 동안은 화면 경계에서 「확인 중」으로 덮습니다(파생 함수는 그대로).
  const status = mapNodeStatusUnder(access, itemStatus);
  switch (item.kind) {
    case "episode-intro": {
      return (
        <EpisodeIntroMapItem
          id={item.id}
          title={item.title}
          status={status}
          guided={guide.visible && item.id === "tutorial-intro"}
          onSelect={(id) => {
            guide.dismiss();
            actions.onStartEpisodeIntroUnit(id);
          }}
        />
      );
    }
    case "messenger": {
      return (
        <MessengerMapItem
          id={item.id}
          title={item.title}
          status={status}
          onSelect={actions.onStartMessengerUnit}
        />
      );
    }
    case "phone-call": {
      return (
        <PhoneCallMapItem
          id={item.id}
          title={item.title}
          status={status}
          onSelect={actions.onStartPhoneCallUnit}
        />
      );
    }
    case "visual-novel": {
      return (
        <VisualNovelMapItem
          id={item.id}
          title={item.title}
          status={status}
          onSelect={actions.onStartVisualNovelUnit}
        />
      );
    }
    case "episode-final": {
      return (
        <EpisodeFinalMapItem
          id={item.id}
          title={item.title}
          status={status}
          onSelect={actions.onStartEpisodeFinal}
        />
      );
    }
    case "standard": {
      return (
        <JourneyStepNode
          id={item.step.id}
          title={item.step.title}
          /* 표지 미완료면 `locked`로 덮는 한 겹이 앞에 붙습니다 — 그 아래는 씨앗이
             남긴 완료가 **지워진 것이 아니라 가려진 것**이고, 표지를 끝내면 그대로
             드러납니다. */
          status={stepNodeStatusUnder(
            access,
            itemStatus,
            journeyStepOrdinal(item.step.id) - 1,
            progress.completedStepCount,
          )}
          onSelect={actions.onSelectStep}
        />
      );
    }
  }
}
