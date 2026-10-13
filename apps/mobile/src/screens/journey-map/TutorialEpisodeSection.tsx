import type { ReactNode } from "@lynx-js/react";

import type { JourneyFilledEpisode, JourneyMapItem } from "./journey-map-types";
import type { JourneyProgress } from "./journey-map-progress";
import type { TutorialGuide, TutorialMapActions } from "./TutorialMapItem";

export type TutorialEpisodeSectionProps = {
  readonly episode: JourneyFilledEpisode;
  readonly items: readonly JourneyMapItem[];
  readonly progress: JourneyProgress;
  readonly guide: TutorialGuide;
  readonly actions: TutorialMapActions;
};

// 껍데기입니다 — 구획 상자와 줄 나누기는 구현 단계에서 채웁니다.
export function TutorialEpisodeSection(_props: TutorialEpisodeSectionProps): ReactNode {
  return null;
}
