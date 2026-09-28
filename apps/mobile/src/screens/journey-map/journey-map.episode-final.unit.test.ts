import { describe, expect, it } from "vitest";

import {
  episodeFinalStatus,
  journeyMapSections,
  journeySteps,
  type JourneyMapItem,
  type JourneyProgress,
} from "./journey-map";

// `unit` 계층: 최종 테스트 항목의 자리와 잠김 파생을 봅니다.

const tutorial = journeyMapSections[0]!;
const finalItem = tutorial.items.find(
  (item): item is Extract<JourneyMapItem, { kind: "episode-final" }> =>
    item.kind === "episode-final",
)!;

const nothingDone: JourneyProgress = {
  completedStepCount: 0,
  completedMessengerUnitIds: [],
  completedPhoneCallUnitIds: [],
  completedVisualNovelUnitIds: [],
  completedEpisodeFinalIds: [],
};

const everythingElseDone: JourneyProgress = {
  completedStepCount: journeySteps.length,
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  completedVisualNovelUnitIds: ["cafe-arrival-visual-novel"],
  completedEpisodeFinalIds: [],
};

describe("최종 테스트 항목", () => {
  it("[EM1] 튜토리얼 구획의 마지막 항목이다", () => {
    expect(tutorial.items.at(-1)).toEqual({
      kind: "episode-final",
      id: "tutorial-final-test",
      title: "최종 테스트",
    });
  });

  it("[EM2] 다른 항목이 하나라도 남아 있으면 잠겨 있다", () => {
    expect(episodeFinalStatus(finalItem, tutorial.items, nothingDone)).toBe("locked");
    expect(
      episodeFinalStatus(finalItem, tutorial.items, {
        ...everythingElseDone,
        completedVisualNovelUnitIds: [],
      }),
    ).toBe("locked");
  });

  it("[EM3] 다른 항목을 모두 끝내면 열리고, 끝내면 completed다", () => {
    expect(episodeFinalStatus(finalItem, tutorial.items, everythingElseDone)).toBe("available");
    expect(
      episodeFinalStatus(finalItem, tutorial.items, {
        ...everythingElseDone,
        completedEpisodeFinalIds: ["tutorial-final-test"],
      }),
    ).toBe("completed");
  });
});
