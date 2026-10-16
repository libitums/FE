import { describe, expect, test } from "vitest";

import { journeyMapSections } from "../screens/journey-map/journey-map-units";
import { productJourneySeed } from "./journey-progress";
import {
  catalogActivityCount,
  completedActivityCount,
  journeyProgressFrom,
  learningProgressSnapshotFrom,
  mergeJourneyProgress,
  trophyCountFrom,
} from "./learning-progress";
import type { JourneyProgressState } from "./learning-progress";

const defaultCompletion = () => ["RP"];

const empty: JourneyProgressState = {
  ...productJourneySeed,
  completedEpisodeIntroIds: [],
  catalogProgress: {},
};
const full: JourneyProgressState = {
  completedStepCount: 1000,
  completedEpisodeIntroIds: ["tutorial-intro"],
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
  catalogProgress: {},
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
    expect(trophyCountFrom(journeyMapSections, empty, defaultCompletion)).toBe(0);
    const trophies = trophyCountFrom(journeyMapSections, full, defaultCompletion);
    expect(trophies).toBeGreaterThanOrEqual(1);
    expect(trophies).toBeLessThanOrEqual(journeyMapSections.length);
  });

  test("트로피는 최종 테스트를 통과한 카탈로그 에피소드마다 하나씩 는다", () => {
    const base = trophyCountFrom(journeyMapSections, full, defaultCompletion);
    const lessonsOnly = { ...full, catalogProgress: { "u01-water": ["intro", "S1", "S9"] } };
    const onePassed = { ...full, catalogProgress: { "u01-water": ["intro", "RP"] } };
    const twoPassed = {
      ...full,
      catalogProgress: { "u01-water": ["RP"], "u02-checkin": ["RP"], "u03-mina": ["intro"] },
    };

    expect(trophyCountFrom(journeyMapSections, lessonsOnly, defaultCompletion)).toBe(base);
    expect(trophyCountFrom(journeyMapSections, onePassed, defaultCompletion)).toBe(base + 1);
    expect(trophyCountFrom(journeyMapSections, twoPassed, defaultCompletion)).toBe(base + 2);
  });
});

describe("LPF 트로피의 카탈로그 몫", () => {
  test("LPF1. 완료 키 해석기가 정한 키를 모두 끝낸 에피소드만 센다", () => {
    const progress = { "u01-water": ["RP"], "u02-checkin": ["S1", "RP"] };
    const state = { ...full, catalogProgress: progress };
    const base = trophyCountFrom(journeyMapSections, full, defaultCompletion);
    const strictForA = (episodeId: string) => (episodeId === "u01-water" ? ["S1", "RP"] : ["RP"]);

    expect(trophyCountFrom(journeyMapSections, state, strictForA)).toBe(base + 1);
    expect(trophyCountFrom(journeyMapSections, state, defaultCompletion)).toBe(base + 2);
    expect(trophyCountFrom(journeyMapSections, state, () => ["S1", "CULT", "RP"])).toBe(base);
  });
});

describe("LP-C 카탈로그 활동 수", () => {
  test("LP-C1. 활동 수는 에피소드별 끝낸 유닛 키 수의 합이고 활동 합계에 더해진다", () => {
    const progress = { a: ["intro", "S1"], b: ["intro"] };

    expect(catalogActivityCount({})).toBe(0);
    expect(catalogActivityCount(progress)).toBe(3);
    expect(completedActivityCount({ ...full, catalogProgress: progress })).toBe(
      completedActivityCount(full) + 3,
    );
    expect(completedActivityCount({ ...full, catalogProgress: {} })).toBe(
      completedActivityCount(full),
    );
  });
});

describe("L 카탈로그 진행", () => {
  const wire = JSON.parse(JSON.stringify(learningProgressSnapshotFrom(empty))) as Record<
    string,
    unknown
  >;

  test("L1 필드 없는 v1 스냅숏은 catalogProgress가 빈 객체다", () => {
    expect("catalogProgress" in wire).toBe(false);
    expect(journeyProgressFrom(wire)?.catalogProgress).toEqual({});
  });

  test("L2 필드 있는 v1 스냅숏은 정규화된 값을 싣는다", () => {
    const state = journeyProgressFrom({
      ...wire,
      catalogProgress: { a: ["intro", "intro", "", 3, "S1"], "": ["x"], b: "x", c: [] },
    });
    expect(state?.catalogProgress).toEqual({ a: ["intro", "S1"] });
  });

  test("L3 스냅숏은 카탈로그 진행이 비면 키를 생략하고, 있으면 그대로 싣는다", () => {
    expect("catalogProgress" in learningProgressSnapshotFrom(empty)).toBe(false);
    const filled = { ...empty, catalogProgress: { a: ["intro", "S1"] } };
    const snapshot = learningProgressSnapshotFrom(filled);
    expect(snapshot.catalogProgress).toEqual({ a: ["intro", "S1"] });
    expect(journeyProgressFrom(JSON.parse(JSON.stringify(snapshot)))).toEqual(filled);
  });

  test("L4 mergeJourneyProgress는 카탈로그 진행을 합집합으로 합친다", () => {
    const a = { ...empty, catalogProgress: { x: ["intro"], y: ["S1"] } };
    const b = { ...empty, catalogProgress: { x: ["S1"], z: ["intro"] } };
    expect(mergeJourneyProgress(a, b).catalogProgress).toEqual({
      x: ["intro", "S1"],
      y: ["S1"],
      z: ["intro"],
    });
    expect(mergeJourneyProgress(b, a).catalogProgress).toEqual({
      x: ["S1", "intro"],
      y: ["S1"],
      z: ["intro"],
    });
  });

  test("L5 카탈로그 필드 값이 잘못돼도 스냅숏 전체는 null이 아니고 다른 필드를 유지한다", () => {
    for (const bad of ["x", 1, [], [["a"]], { a: "x" }]) {
      const state = journeyProgressFrom({ ...wire, completedStepCount: 7, catalogProgress: bad });
      expect(state).not.toBeNull();
      expect(state?.completedStepCount).toBe(7);
      expect(state?.catalogProgress).toEqual({});
    }
  });
});
