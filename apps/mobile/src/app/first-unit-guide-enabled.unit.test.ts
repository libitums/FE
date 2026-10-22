import { describe, expect, test } from "vitest";

import type { CatalogProgress } from "../lib/catalog-progress";
import { firstUnitGuideEnabled } from "./first-unit-guide-enabled";
import { emptyLegacyTutorialRecord } from "./legacy-tutorial-progress";
import type { LegacyTutorialRecord } from "./legacy-tutorial-progress";
import { legacyPassedRecord, tutorialCoverDoneProgress } from "./test-helpers/progress-seed";

// `unit` 계층: 첫 유닛 안내를 켤지 — 서버 진행을 불러왔고 옛 기록 활동 0 · 카탈로그 진행 0일 때만.

type ContractInput = {
  readonly hasLoadedProgress: boolean;
  readonly legacyTutorial: LegacyTutorialRecord;
  readonly catalogProgress: CatalogProgress;
};

const enabled = firstUnitGuideEnabled as unknown as (progress: ContractInput) => boolean;

const fresh: ContractInput = {
  hasLoadedProgress: true,
  legacyTutorial: emptyLegacyTutorialRecord,
  catalogProgress: {},
};

describe("firstUnitGuideEnabled", () => {
  test("FG1. 불러옴 · 빈 옛 기록 · 빈 카탈로그면 켠다", () => {
    expect(enabled(fresh)).toBe(true);
  });

  test("FG2. 서버 진행을 불러오기 전에는 켜지 않는다", () => {
    expect(enabled({ ...fresh, hasLoadedProgress: false })).toBe(false);
  });

  test("FG3. 옛 기록에 활동이 있으면(통과 기록 · 비주얼 노벨 장면만) 켜지 않는다", () => {
    expect(enabled({ ...fresh, legacyTutorial: legacyPassedRecord })).toBe(false);
    expect(
      enabled({
        ...fresh,
        legacyTutorial: {
          ...emptyLegacyTutorialRecord,
          visualNovel: { status: "active", beatIndex: 1 },
        },
      }),
    ).toBe(false);
  });

  test("FG4. 카탈로그 키가 하나라도 있으면 켜지 않고, 빈 배열만 있는 에피소드 키는 켠다", () => {
    expect(enabled({ ...fresh, catalogProgress: tutorialCoverDoneProgress() })).toBe(false);
    expect(enabled({ ...fresh, catalogProgress: { "u00-tutorial": [] } })).toBe(true);
  });
});
