import { describe, expect, it } from "vitest";

import {
  journeyMapSections,
  journeySteps,
  mapItemStatus,
  type JourneyMapItem,
  type JourneyProgress,
} from "./journey-map";

// `unit` 계층: 최종 테스트 항목의 자리와 잠김 파생을 봅니다.
//
// ⟨개정⟩ 잠김을 묻는 자리가 `episodeFinalStatus`에서 **`mapItemStatus`로 옮겨 갔습니다** —
// 그 함수가 이 안으로 접혔습니다(D6). 남겨 두면 최종 테스트의 잠김을 세는 자리가 둘이
// 됩니다. 뜻은 그대로입니다: 같은 구획의 **다른 항목이 모두** 끝나야 열립니다. 바뀐 것은
// 그 「다른 항목」에 **표지가 낀다**는 것 하나입니다.

const tutorial = journeyMapSections[0]!;
const finalItem = tutorial.items.find(
  (item): item is Extract<JourneyMapItem, { kind: "episode-final" }> =>
    item.kind === "episode-final",
)!;

const nothingDone: JourneyProgress = {
  completedStepCount: 0,
  completedEpisodeIntroIds: [],
  completedMessengerUnitIds: [],
  completedPhoneCallUnitIds: [],
  completedVisualNovelUnitIds: [],
  completedEpisodeFinalIds: [],
};

const everythingElseDone: JourneyProgress = {
  completedStepCount: journeySteps.length,
  completedEpisodeIntroIds: ["tutorial-intro"],
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
      title: "Final test",
    });
  });

  it("[EM2] 다른 항목이 하나라도 남아 있으면 잠겨 있다", () => {
    expect(mapItemStatus(finalItem, tutorial.items, nothingDone)).toBe("locked");
    expect(
      mapItemStatus(finalItem, tutorial.items, {
        ...everythingElseDone,
        completedVisualNovelUnitIds: [],
      }),
    ).toBe("locked");
  });

  // ⚠ **표지가 그 「다른 항목」에 낍니다.** 표지를 빼고 아홉을 다 끝내도 열리지
  // 않습니다 — 표지는 이제 구획의 첫 **항목**이고, 최종 테스트는 앞을 다 지나야
  // 여는 자리입니다. 표지 미완료가 나머지를 잠그는 것(U-L1)과는 다른 축입니다:
  // 이쪽은 표지를 끝냈는지가 아니라 **표지도 완료 항목에 세어지는가**입니다.
  it("[EM2] 표지를 끝내지 않았으면 나머지를 다 끝내도 잠겨 있다", () => {
    expect(
      mapItemStatus(finalItem, tutorial.items, {
        ...everythingElseDone,
        completedEpisodeIntroIds: [],
      }),
    ).toBe("locked");
  });

  it("[EM3] 다른 항목을 모두 끝내면 열리고, 끝내면 completed다", () => {
    expect(mapItemStatus(finalItem, tutorial.items, everythingElseDone)).toBe("available");
    expect(
      mapItemStatus(finalItem, tutorial.items, {
        ...everythingElseDone,
        completedEpisodeFinalIds: ["tutorial-final-test"],
      }),
    ).toBe("completed");
  });
});
