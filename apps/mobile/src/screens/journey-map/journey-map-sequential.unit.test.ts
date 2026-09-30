import { expect, test } from "vitest";
import { journeyMapSections, mapItemStatus, type JourneyProgress } from "./journey-map";

const items = journeyMapSections[0]!.items;
const empty: JourneyProgress = {
  completedStepCount: 0,
  completedEpisodeIntroIds: [],
  completedMessengerUnitIds: [],
  completedPhoneCallUnitIds: [],
  completedVisualNovelUnitIds: [],
  completedEpisodeFinalIds: [],
};

// 제품의 상태 계산 함수를 사용하지 않고 실제 완료 순서에 해당하는 기록을 적습니다.
const stages: readonly JourneyProgress[] = [
  empty,
  { ...empty, completedEpisodeIntroIds: ["tutorial-intro"] },
];
const progressAt = (index: number): JourneyProgress => {
  if (index < 2) return stages[index]!;
  return {
    ...stages[1]!,
    completedStepCount: Math.min(index - 1, 4) + Math.max(0, Math.min(index - 8, 4)),
    completedMessengerUnitIds: index >= 6 ? ["appointment-confirmation"] : [],
    completedPhoneCallUnitIds: index >= 7 ? ["appointment-confirmation-phone-call"] : [],
    completedVisualNovelUnitIds: index >= 8 ? ["cafe-arrival-visual-novel"] : [],
    completedEpisodeFinalIds: index >= 13 ? ["tutorial-final-test"] : [],
  };
};

test.each(Array.from({ length: 14 }, (_, index) => index))(
  "%i개 완료 후 정확히 다음 한 유닛만 열리고 이후는 잠긴다",
  (count) => {
    expect(items).toHaveLength(13);
    expect(items.map((item) => mapItemStatus(item, items, progressAt(count)))).toEqual(
      Array.from({ length: 13 }, (_, index) =>
        index < count ? "completed" : index === count ? "available" : "locked",
      ),
    );
  },
);

test("예전에 순서 없이 완료한 기록은 유지하되 미완료 선행 유닛을 건너뛰지 않는다", () => {
  const saved: JourneyProgress = {
    ...progressAt(3),
    completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  };
  const statuses = items.map((item) => mapItemStatus(item, items, saved));
  expect(statuses[3]).toBe("available"); // Ordering
  expect(statuses[5]).toBe("locked"); // Messenger
  expect(statuses[6]).toBe("completed"); // Previously completed call
  expect(statuses[7]).toBe("locked"); // Cafe
  expect(saved.completedStepCount).toBe(2);
});
