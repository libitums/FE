import { describe, expect, test } from "vitest";

import { journeyMapSections } from "../screens/journey-map/journey-map-units";
import { productJourneySeed } from "./journey-progress";
import {
  completedActivityCount,
  journeyProgressFrom,
  learningProgressSnapshotFrom,
  mergeJourneyProgress,
  trophyCountFrom,
} from "./learning-progress";
import type { JourneyProgressState } from "./learning-progress";

const empty: JourneyProgressState = { ...productJourneySeed, completedEpisodeIntroIds: [] };
const full: JourneyProgressState = {
  completedStepCount: 1000,
  completedEpisodeIntroIds: ["tutorial-intro"],
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

describe("LP1 스냅숏 왕복", () => {
  test("스냅숏을 다시 읽으면 같은 진행이다", () => {
    for (const state of [empty, full]) {
      const raw = JSON.parse(JSON.stringify(learningProgressSnapshotFrom(state))) as unknown;
      expect(journeyProgressFrom(raw)).toEqual(state);
    }
  });

  test("모르는 유닛 · 중복은 버리고, 버전 · 모양이 틀리면 null", () => {
    const snapshot = learningProgressSnapshotFrom(full);
    expect(
      journeyProgressFrom({
        ...snapshot,
        completedMessengerUnitIds: ["appointment-confirmation", "gone", "appointment-confirmation"],
      })?.completedMessengerUnitIds,
    ).toEqual(["appointment-confirmation"]);
    expect(journeyProgressFrom({ ...snapshot, version: 2 })).toBeNull();
    expect(journeyProgressFrom({ ...snapshot, completedStepCount: -1 })).toBeNull();
    expect(journeyProgressFrom({ ...snapshot, completedStepCount: 1.5 })).toBeNull();
    expect(
      journeyProgressFrom({ ...snapshot, visualNovel: { status: "active", beatIndex: 5 } }),
    ).toBeNull();
    expect(journeyProgressFrom({ ...snapshot, completedEpisodeFinalIds: "x" })).toBeNull();
    expect(journeyProgressFrom(null)).toBeNull();
    expect(journeyProgressFrom([])).toBeNull();
  });
});

describe("LP2 mergeJourneyProgress", () => {
  test("목록은 합집합, 스텝은 큰 쪽, 비주얼 노벨은 더 나아간 쪽 — 방향과 무관하다", () => {
    const a: JourneyProgressState = {
      ...empty,
      completedStepCount: 5,
      completedEpisodeIntroIds: ["tutorial-intro"],
      visualNovelProgress: { status: "active", beatIndex: 1 },
    };
    const b: JourneyProgressState = {
      ...empty,
      completedStepCount: 3,
      completedMessengerUnitIds: ["appointment-confirmation"],
      visualNovelProgress: { status: "active", beatIndex: 0 },
    };
    const expected: JourneyProgressState = {
      ...empty,
      completedStepCount: 5,
      completedEpisodeIntroIds: ["tutorial-intro"],
      completedMessengerUnitIds: ["appointment-confirmation"],
      visualNovelProgress: { status: "active", beatIndex: 1 },
    };
    expect(mergeJourneyProgress(a, b)).toEqual(expected);
    expect(mergeJourneyProgress(b, a)).toEqual(expected);
    expect(mergeJourneyProgress(empty, full).visualNovelProgress.status).toBe("completed");
    expect(mergeJourneyProgress(full, full)).toEqual(full);
  });
});

describe("LP3 파생 수", () => {
  test("활동 수는 스텝 · 표지 · 특별 유닛 · 끝낸 비주얼 노벨 · 최종 테스트의 합이다", () => {
    expect(completedActivityCount(full)).toBe(1000 + 1 + 1 + 1 + 1 + 1);
    expect(
      completedActivityCount({ ...empty, visualNovelProgress: { status: "active", beatIndex: 1 } }),
    ).toBe(empty.completedStepCount);
  });

  test("트로피는 모든 항목을 끝낸 에피소드 수다", () => {
    expect(trophyCountFrom(journeyMapSections, empty)).toBe(0);
    const trophies = trophyCountFrom(journeyMapSections, full);
    expect(trophies).toBeGreaterThanOrEqual(1);
    expect(trophies).toBeLessThanOrEqual(journeyMapSections.length);
  });
});
