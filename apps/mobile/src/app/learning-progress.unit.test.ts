import { describe, expect, test } from "vitest";

import { emptyLegacyTutorialRecord } from "./legacy-tutorial-progress";
import type { ContractProgressState } from "./test-helpers/progress-state-api";
import {
  emptyContractState as empty,
  progressApi,
  serverAcceptsSnapshot,
} from "./test-helpers/progress-state-api";
import { legacyPassedRecord } from "./test-helpers/progress-seed";

// `unit` 계층: 진행 상태(옛 튜토리얼 기록 + 카탈로그 진행 + 티켓) ↔ 스냅숏 v1. 와이어 호환이 계약이다.

const { journeyProgressFrom, learningProgressSnapshotFrom, mergeJourneyProgress } = progressApi;

const passed: ContractProgressState = { legacyTutorial: legacyPassedRecord, catalogProgress: {} };

// 옛 코드가 같은 진행으로 쓰던 문자열입니다 — 키 순서 · 생략 규칙까지 바이트가 계약입니다.
const PASSED_WIRE =
  '{"version":1,"completedStepCount":8,"completedEpisodeIntroIds":["tutorial-intro"],"completedMessengerUnitIds":["appointment-confirmation"],"completedPhoneCallUnitIds":["appointment-confirmation-phone-call"],"visualNovel":{"status":"completed","beatIndex":2},"completedEpisodeFinalIds":["tutorial-final-test"]}';
const EMPTY_WIRE =
  '{"version":1,"completedStepCount":0,"completedEpisodeIntroIds":[],"completedMessengerUnitIds":[],"completedPhoneCallUnitIds":[],"visualNovel":{"status":"active","beatIndex":0},"completedEpisodeFinalIds":[]}';

const wireOf = (state: ContractProgressState): string =>
  JSON.stringify(learningProgressSnapshotFrom(state));

describe("스냅숏 쓰기", () => {
  test("LP1. 옛 통과 기록 + 빈 카탈로그의 스냅숏은 옛 코드가 쓰던 문자열과 바이트가 같다", () => {
    expect(wireOf(passed)).toBe(PASSED_WIRE);
  });

  test("LP2. 빈 진행은 옛 필드 여섯을 0 · [] · {active,0}으로 싣는다", () => {
    expect(wireOf(empty)).toBe(EMPTY_WIRE);
  });

  test("LP3. 카탈로그 진행 · 덜 찬 티켓이 있으면 그 둘이 끝에 그 순서로 실린다", () => {
    const tickets = { refillAtMs: 5_000, grantedMs: 0, grantDay: "" };
    const state = { ...passed, catalogProgress: { "u00-tutorial": ["intro", "S1"] }, tickets };
    expect(wireOf(state)).toBe(
      `${PASSED_WIRE.slice(0, -1)},"catalogProgress":{"u00-tutorial":["intro","S1"]},"tickets":{"refillAtMs":5000,"grantedMs":0,"grantDay":""}}`,
    );
  });

  test("LP10. 새 앱이 쓰는 모든 스냅숏은 서버 RPC의 검증 조건을 통과한다", () => {
    const tickets = { refillAtMs: 5_000, grantedMs: 0, grantDay: "" };
    for (const state of [
      empty,
      passed,
      { ...passed, catalogProgress: { "u00-tutorial": ["intro"] }, tickets },
      { ...empty, catalogProgress: { "u00-tutorial": ["intro"] } },
    ]) {
      expect(serverAcceptsSnapshot(learningProgressSnapshotFrom(state))).toBe(true);
    }
  });
});

describe("스냅숏 읽기", () => {
  test("LP4. 옛 앱이 쓴 스냅숏(옛 필드 + catalogProgress + tickets)은 상태 → 스냅숏 왕복이 같은 값이다", () => {
    const tickets = { refillAtMs: 9_000, grantedMs: 100, grantDay: "2026-10-21" };
    const raw = {
      ...JSON.parse(PASSED_WIRE),
      catalogProgress: { "u01-water": ["intro", "S1"] },
      tickets,
    } as unknown;
    const state = journeyProgressFrom(raw);
    expect(state).toEqual({
      legacyTutorial: legacyPassedRecord,
      catalogProgress: { "u01-water": ["intro", "S1"] },
      tickets,
    });
    expect(JSON.parse(JSON.stringify(learningProgressSnapshotFrom(state as never)))).toEqual(raw);
    for (const each of [empty, passed]) {
      expect(journeyProgressFrom(JSON.parse(wireOf(each)))).toEqual(each);
    }
  });

  test("LP5. 버전 2 · 배열 · null · 옛 필드 모양 오류는 null이다", () => {
    const base = JSON.parse(PASSED_WIRE) as Record<string, unknown>;
    expect(journeyProgressFrom({ ...base, version: 2 })).toBeNull();
    expect(journeyProgressFrom([])).toBeNull();
    expect(journeyProgressFrom(null)).toBeNull();
    expect(journeyProgressFrom({ ...base, completedStepCount: -1 })).toBeNull();
    expect(journeyProgressFrom({ ...base, completedStepCount: 1.5 })).toBeNull();
    expect(journeyProgressFrom({ ...base, completedEpisodeFinalIds: "x" })).toBeNull();
    expect(
      journeyProgressFrom({ ...base, visualNovel: { status: "active", beatIndex: 5 } }),
    ).toBeNull();
    const { completedStepCount: _omitted, ...withoutLegacyField } = base;
    expect(journeyProgressFrom(withoutLegacyField)).toBeNull();
  });

  test("LP6. catalogProgress 모양만 틀리면 그 부분만 {}이고 옛 기록은 남는다", () => {
    const base = JSON.parse(PASSED_WIRE) as Record<string, unknown>;
    for (const bad of ["x", 1, [], [["a"]], { a: "x" }]) {
      const state = journeyProgressFrom({ ...base, catalogProgress: bad });
      expect(state?.catalogProgress).toEqual({});
      expect(state?.legacyTutorial).toEqual(legacyPassedRecord);
    }
    expect(
      journeyProgressFrom({
        ...base,
        catalogProgress: { a: ["intro", "intro", "", 3, "S1"], "": ["x"], b: "x", c: [] },
      })?.catalogProgress,
    ).toEqual({ a: ["intro", "S1"] });
  });
});

describe("합치기 · 덮음 · 활동 수", () => {
  test("LP7. 합치기는 옛 기록(합집합 · 최댓값 · 더 나아간 장면)과 카탈로그 키별 합집합을 따르고 방향과 무관하다", () => {
    const a: ContractProgressState = {
      legacyTutorial: {
        ...emptyLegacyTutorialRecord,
        completedStepCount: 5,
        visualNovel: { status: "active", beatIndex: 1 },
      },
      catalogProgress: { x: ["intro"], y: ["S1"] },
    };
    const b: ContractProgressState = {
      legacyTutorial: {
        ...emptyLegacyTutorialRecord,
        completedStepCount: 3,
        completedMessengerUnitIds: ["appointment-confirmation"],
      },
      catalogProgress: { x: ["S1"], z: ["intro"] },
    };
    const merged = mergeJourneyProgress(a, b);
    expect(merged.legacyTutorial).toEqual({
      ...emptyLegacyTutorialRecord,
      completedStepCount: 5,
      completedMessengerUnitIds: ["appointment-confirmation"],
      visualNovel: { status: "active", beatIndex: 1 },
    });
    expect(merged.catalogProgress).toEqual({ x: ["intro", "S1"], y: ["S1"], z: ["intro"] });
    expect(mergeJourneyProgress(b, a).legacyTutorial).toEqual(merged.legacyTutorial);
    expect(mergeJourneyProgress(empty, passed).legacyTutorial.visualNovel.status).toBe("completed");
    expect(mergeJourneyProgress(passed, passed)).toEqual(passed);
  });

  test("LP8. 덮음은 옛 기록 · 카탈로그 · 티켓 셋 다 덮어야 참이다", () => {
    const { journeyProgressCovers } = progressApi;
    const withCatalog = { ...passed, catalogProgress: { "u00-tutorial": ["intro"] } };
    expect(journeyProgressCovers(passed, passed)).toBe(true);
    expect(journeyProgressCovers(withCatalog, passed)).toBe(true);
    expect(journeyProgressCovers(passed, withCatalog)).toBe(false);
    expect(journeyProgressCovers(empty, passed)).toBe(false);
    expect(journeyProgressCovers(passed, empty)).toBe(true);
    const used = { refillAtMs: 5_000, grantedMs: 0, grantDay: "" };
    expect(journeyProgressCovers(passed, { ...passed, tickets: used })).toBe(false);
    expect(journeyProgressCovers({ ...passed, tickets: used }, passed)).toBe(true);
  });

  test("LP9. 활동 수는 옛 활동 수에 카탈로그 키 수를 더한 값이다", () => {
    const { completedActivityCount, catalogActivityCount } = progressApi;
    expect(completedActivityCount(passed)).toBe(13);
    expect(completedActivityCount(empty)).toBe(0);
    expect(catalogActivityCount({})).toBe(0);
    expect(catalogActivityCount({ a: ["intro", "S1"], b: ["intro"] })).toBe(3);
    expect(
      completedActivityCount({ ...passed, catalogProgress: { a: ["intro", "S1"], b: ["intro"] } }),
    ).toBe(16);
  });
});
