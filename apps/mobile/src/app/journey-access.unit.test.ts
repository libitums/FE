import { expect, test, vi } from "vitest";
import { canStartJourneyUnit, guardJourneyUnitStarts } from "./journey-access";
import { journeySeedBefore } from "./test-helpers/journey-seed";
import { completedVisualNovelUnitIdsFrom, productJourneySeed } from "./journey-progress";

const seed = journeySeedBefore("appointment-confirmation");
const progress = {
  ...seed,
  completedEpisodeIntroIds: ["tutorial-intro"] as const,
  completedVisualNovelUnitIds: completedVisualNovelUnitIdsFrom(seed.visualNovelProgress),
};

test("신규 사용자 씨앗은 완료 기록이 없다", () => {
  expect(productJourneySeed.completedStepCount).toBe(0);
  expect(productJourneySeed.completedMessengerUnitIds).toEqual([]);
  expect(productJourneySeed.completedPhoneCallUnitIds).toEqual([]);
  expect(productJourneySeed.completedEpisodeFinalIds).toEqual([]);
});

test("열린 유닛과 완료한 유닛만 실제 시작 콜백에 도달한다", () => {
  const starts = {
    onStartStep: vi.fn<(id: string) => void>(),
    onStartMessengerUnit: vi.fn<(id: string) => void>(),
    onStartPhoneCallUnit: vi.fn<(id: string) => void>(),
    onStartVisualNovelUnit: vi.fn<(id: string) => void>(),
  };
  const guarded = guardJourneyUnitStarts(starts, progress);
  guarded.onStartStep("greeting");
  guarded.onStartStep("directions");
  guarded.onStartMessengerUnit("appointment-confirmation");
  guarded.onStartPhoneCallUnit("appointment-confirmation-phone-call");
  guarded.onStartVisualNovelUnit("cafe-arrival-visual-novel");
  expect(starts.onStartStep.mock.calls).toEqual([["greeting"]]);
  expect(starts.onStartMessengerUnit).toHaveBeenCalledOnce();
  expect(starts.onStartPhoneCallUnit).not.toHaveBeenCalled();
  expect(starts.onStartVisualNovelUnit).not.toHaveBeenCalled();
  expect(canStartJourneyUnit("tutorial-final-test", progress)).toBe(false);
  expect(canStartJourneyUnit("unknown", progress)).toBe(false);
});
