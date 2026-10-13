import type { ReactNode } from "@lynx-js/react";

import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../episode-intro/episode-intro.contract";
import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";
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
  readonly guide: TutorialGuide;
  readonly actions: TutorialMapActions;
};

// 껍데기입니다 — 종류별 항목 컴포넌트로 옮기는 일은 구현 단계에서 채웁니다.
export function TutorialMapItem(_props: TutorialMapItemProps): ReactNode {
  return null;
}
