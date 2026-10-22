import { describe, expect, test } from "vitest";

import {
  LEGACY_TUTORIAL_FINAL_ID,
  emptyLegacyTutorialRecord,
  hasLegacyTutorialActivity,
  legacyTutorialActivityCount,
  legacyTutorialPassed,
  legacyTutorialRecordCovers,
  legacyTutorialRecordFrom,
  mergeLegacyTutorialRecords,
} from "./legacy-tutorial-progress";
import type { LegacyTutorialRecord } from "./legacy-tutorial-progress";
import { legacyPassedRecord } from "./test-helpers/progress-seed";

// `unit` 계층: 옛 튜토리얼 진행 기록(스냅숏 v1의 옛 필드 여섯)을 읽고 · 합치고 · 덮음을 판정하는 순수 함수.

const wire = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  completedStepCount: 3,
  completedEpisodeIntroIds: ["tutorial-intro"],
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: [],
  visualNovel: { status: "active", beatIndex: 1 },
  completedEpisodeFinalIds: [],
  ...over,
});

const record = (over: Partial<LegacyTutorialRecord> = {}): LegacyTutorialRecord => ({
  ...emptyLegacyTutorialRecord,
  ...over,
});

describe("legacyTutorialRecordFrom", () => {
  test("LT1. 옛 필드 여섯이 모두 유효하면 같은 값의 기록이다(목록 순서 유지)", () => {
    expect(
      legacyTutorialRecordFrom(wire({ completedEpisodeFinalIds: [LEGACY_TUTORIAL_FINAL_ID] })),
    ).toEqual({
      completedStepCount: 3,
      completedEpisodeIntroIds: ["tutorial-intro"],
      completedMessengerUnitIds: ["appointment-confirmation"],
      completedPhoneCallUnitIds: [],
      visualNovel: { status: "active", beatIndex: 1 },
      completedEpisodeFinalIds: ["tutorial-final-test"],
    });
    expect(legacyTutorialRecordFrom({ ...legacyPassedRecord })).toEqual(legacyPassedRecord);
  });

  test("LT2. 모르는 id · 빈 문자열 · 문자열 아님은 버리고 겹침은 하나로 둔다", () => {
    const read = legacyTutorialRecordFrom(
      wire({
        completedEpisodeIntroIds: ["tutorial-intro", "gone", "", 3, null, "tutorial-intro"],
        completedMessengerUnitIds: ["toString", "appointment-confirmation"],
        completedEpisodeFinalIds: ["tutorial-final-test", "tutorial-final-test", "x"],
      }),
    );
    expect(read?.completedEpisodeIntroIds).toEqual(["tutorial-intro"]);
    expect(read?.completedMessengerUnitIds).toEqual(["appointment-confirmation"]);
    expect(read?.completedEpisodeFinalIds).toEqual(["tutorial-final-test"]);
  });

  test("LT3. completedStepCount가 음수 · 소수 · 문자열 · 없음이면 null이다", () => {
    for (const bad of [-1, 1.5, "3", undefined, null]) {
      expect(legacyTutorialRecordFrom(wire({ completedStepCount: bad }))).toBeNull();
    }
  });

  test("LT4. 목록이 배열이 아니면 null, 비주얼 노벨은 읽기 규칙대로 정규화하거나 null이다", () => {
    for (const key of [
      "completedEpisodeIntroIds",
      "completedMessengerUnitIds",
      "completedPhoneCallUnitIds",
      "completedEpisodeFinalIds",
    ]) {
      expect(legacyTutorialRecordFrom(wire({ [key]: "x" }))).toBeNull();
    }
    expect(
      legacyTutorialRecordFrom(wire({ visualNovel: { status: "active", beatIndex: 2 } })),
    ).toBeNull();
    expect(legacyTutorialRecordFrom(wire({ visualNovel: undefined }))).toBeNull();
    expect(
      legacyTutorialRecordFrom(wire({ visualNovel: { status: "x", beatIndex: 0 } })),
    ).toBeNull();
    expect(
      legacyTutorialRecordFrom(wire({ visualNovel: { status: "completed", beatIndex: 9 } }))
        ?.visualNovel,
    ).toEqual({ status: "completed", beatIndex: 2 });
    expect(
      legacyTutorialRecordFrom(wire({ visualNovel: { status: "completed", beatIndex: 1 } }))
        ?.visualNovel,
    ).toEqual({ status: "completed", beatIndex: 2 });
  });
});

describe("mergeLegacyTutorialRecords", () => {
  const a = record({
    completedStepCount: 5,
    completedEpisodeIntroIds: ["tutorial-intro"],
    visualNovel: { status: "active", beatIndex: 1 },
  });
  const b = record({
    completedStepCount: 3,
    completedMessengerUnitIds: ["appointment-confirmation"],
    visualNovel: { status: "active", beatIndex: 0 },
  });

  test("LT5. 목록은 합집합(앞쪽 순서), 스텝은 큰 쪽, 비주얼 노벨은 completed 우선 아니면 더 나아간 쪽", () => {
    const expected = record({
      completedStepCount: 5,
      completedEpisodeIntroIds: ["tutorial-intro"],
      completedMessengerUnitIds: ["appointment-confirmation"],
      visualNovel: { status: "active", beatIndex: 1 },
    });
    expect(mergeLegacyTutorialRecords(a, b)).toEqual(expected);
    expect(mergeLegacyTutorialRecords(b, a)).toEqual(expected);
    expect(
      mergeLegacyTutorialRecords(emptyLegacyTutorialRecord, legacyPassedRecord).visualNovel.status,
    ).toBe("completed");
    expect(mergeLegacyTutorialRecords(legacyPassedRecord, a).visualNovel.status).toBe("completed");
    expect(
      mergeLegacyTutorialRecords(
        record({ completedEpisodeFinalIds: ["tutorial-final-test"] }),
        record({ completedEpisodeIntroIds: ["tutorial-intro"] }),
      ).completedEpisodeFinalIds,
    ).toEqual(["tutorial-final-test"]);
  });

  test("LT5. 입력은 바뀌지 않는다", () => {
    const snapshotA = JSON.stringify(a);
    const snapshotB = JSON.stringify(b);
    mergeLegacyTutorialRecords(a, b);
    expect(JSON.stringify(a)).toBe(snapshotA);
    expect(JSON.stringify(b)).toBe(snapshotB);
  });
});

describe("legacyTutorialRecordCovers", () => {
  test("LT6. server가 local을 덮으면 true, 새 id · 큰 스텝 · 더 나아간 장면이 하나라도 있으면 false", () => {
    expect(legacyTutorialRecordCovers(legacyPassedRecord, legacyPassedRecord)).toBe(true);
    expect(legacyTutorialRecordCovers(legacyPassedRecord, emptyLegacyTutorialRecord)).toBe(true);
    expect(legacyTutorialRecordCovers(emptyLegacyTutorialRecord, legacyPassedRecord)).toBe(false);
    expect(
      legacyTutorialRecordCovers(
        record({ completedStepCount: 2 }),
        record({ completedStepCount: 3 }),
      ),
    ).toBe(false);
    expect(
      legacyTutorialRecordCovers(
        record({ visualNovel: { status: "active", beatIndex: 0 } }),
        record({ visualNovel: { status: "active", beatIndex: 1 } }),
      ),
    ).toBe(false);
    expect(
      legacyTutorialRecordCovers(
        record({ completedEpisodeIntroIds: ["tutorial-intro"] }),
        record({ completedMessengerUnitIds: ["appointment-confirmation"] }),
      ),
    ).toBe(false);
  });
});

describe("통과 · 활동", () => {
  test("LT7. legacyTutorialPassed는 completedEpisodeFinalIds에 tutorial-final-test가 있을 때만 true다", () => {
    expect(legacyTutorialPassed(legacyPassedRecord)).toBe(true);
    expect(legacyTutorialPassed(emptyLegacyTutorialRecord)).toBe(false);
    expect(legacyTutorialPassed(record({ completedStepCount: 8 }))).toBe(false);
  });

  test("LT8. 활동 수는 스텝 + 목록 넷 길이 + 비주얼 노벨 완료다", () => {
    expect(legacyTutorialActivityCount(legacyPassedRecord)).toBe(8 + 1 + 1 + 1 + 1 + 1);
  });

  test("LT9. 빈 기록은 0 · [] · [] · [] · {active,0} · []이고 활동이 없다", () => {
    expect(emptyLegacyTutorialRecord).toEqual({
      completedStepCount: 0,
      completedEpisodeIntroIds: [],
      completedMessengerUnitIds: [],
      completedPhoneCallUnitIds: [],
      visualNovel: { status: "active", beatIndex: 0 },
      completedEpisodeFinalIds: [],
    });
    expect(legacyTutorialActivityCount(emptyLegacyTutorialRecord)).toBe(0);
    expect(hasLegacyTutorialActivity(emptyLegacyTutorialRecord)).toBe(false);
  });

  test("LT10. 활동 수가 0이어도 비주얼 노벨 장면이 있으면 활동이 있다", () => {
    expect(
      hasLegacyTutorialActivity(record({ visualNovel: { status: "active", beatIndex: 1 } })),
    ).toBe(true);
    expect(hasLegacyTutorialActivity(legacyPassedRecord)).toBe(true);
    expect(hasLegacyTutorialActivity(record({ completedStepCount: 1 }))).toBe(true);
  });
});
