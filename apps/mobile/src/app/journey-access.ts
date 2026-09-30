import { episodeFinalWiring, type EpisodeFinalWiringArgs } from "./episode-final-wiring";
import { completedVisualNovelUnitIdsFrom } from "./journey-progress";
import type { VisualNovelProgress } from "../screens/visual-novel/visual-novel.contract";
import {
  journeyMapSections,
  mapItemStatus,
  type JourneyProgress,
  type JourneyStepId,
} from "../screens/journey-map/journey-map";
import type { MessengerUnitId } from "../screens/messenger/messenger.contract";
import type { PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../screens/visual-novel/visual-novel.contract";

/** 맵·알림·푸시가 모두 같은 해금 규칙을 사용합니다. 알 수 없는 유닛도 열지 않습니다. */
export function canStartJourneyUnit(id: string, progress: JourneyProgress): boolean {
  for (const section of journeyMapSections) {
    const item = section.items.find((candidate) =>
      candidate.kind === "standard" ? candidate.step.id === id : candidate.id === id,
    );
    if (item) return mapItemStatus(item, section.items, progress) !== "locked";
  }
  return false;
}

type UnitStarts = {
  readonly onStartStep: (id: JourneyStepId) => void;
  readonly onStartMessengerUnit: (id: MessengerUnitId) => void;
  readonly onStartPhoneCallUnit: (id: PhoneCallUnitId) => void;
  readonly onStartVisualNovelUnit: (id: VisualNovelUnitId) => void;
};

export function guardJourneyUnitStarts(starts: UnitStarts, progress: JourneyProgress): UnitStarts {
  const guard =
    <Id extends string>(start: (id: Id) => void) =>
    (id: Id) => {
      "background only";
      if (canStartJourneyUnit(id, progress)) start(id);
    };
  return {
    onStartStep: guard(starts.onStartStep),
    onStartMessengerUnit: guard(starts.onStartMessengerUnit),
    onStartPhoneCallUnit: guard(starts.onStartPhoneCallUnit),
    onStartVisualNovelUnit: guard(starts.onStartVisualNovelUnit),
  };
}

/** 최종 테스트의 직접 진입에도 같은 잠금 규칙을 적용합니다. */
export function guardedEpisodeFinalWiring(
  args: EpisodeFinalWiringArgs &
    Omit<JourneyProgress, "completedVisualNovelUnitIds"> & {
      readonly visualNovelProgress: VisualNovelProgress;
    },
) {
  const wiring = episodeFinalWiring(args);
  const progress = {
    ...args,
    completedVisualNovelUnitIds: completedVisualNovelUnitIdsFrom(args.visualNovelProgress),
  };
  return {
    ...wiring,
    onStartEpisodeFinal: (id: Parameters<typeof wiring.onStartEpisodeFinal>[0]) => {
      "background only";
      if (canStartJourneyUnit(id, progress)) wiring.onStartEpisodeFinal(id);
    },
  };
}
