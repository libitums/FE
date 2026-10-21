import { describe, expect, test } from "vitest";

import { emptyLegacyTutorialRecord } from "./legacy-tutorial-progress";
import type { LegacyTutorialRecord } from "./legacy-tutorial-progress";
import type { ContractProgressState } from "./test-helpers/progress-state-api";
import { emptyContractState as empty, progressApi } from "./test-helpers/progress-state-api";

const { journeyProgressCovers, learningProgressSnapshotFrom, mergeJourneyProgress } = progressApi;
const { trophyCountFrom } = progressApi;

// 트로피 판정의 완료 규칙 — 이 파일의 진행에는 카탈로그 에피소드가 없어 기본 규칙(최종 테스트)이면 된다.
const defaultCompletion = (): readonly string[] => ["RP"];

// 기존 learning-progress.unit.test.ts가 300줄에 가까워 판정 · 단조성 절은 이 파일에 둔다.
// 기존 파일의 「LP-C1」(카탈로그 활동 수)과 id가 겹치지 않도록 이 파일의 케이스는 「LP-C」 뒤에 covers를 붙인다.

const legacy = (over: Partial<LegacyTutorialRecord>): LegacyTutorialRecord => ({
  ...emptyLegacyTutorialRecord,
  ...over,
});
const with_ = (over: Partial<ContractProgressState>): ContractProgressState => ({
  ...empty,
  ...over,
});

// 기준 empty보다 정확히 한 가지만 더 가진 진행 아홉(LP-C3 · LP-C4).
const oneMore: readonly (readonly [string, ContractProgressState])[] = [
  ["스텝 +1", with_({ legacyTutorial: legacy({ completedStepCount: 1 }) })],
  ["표지", with_({ legacyTutorial: legacy({ completedEpisodeIntroIds: ["tutorial-intro"] }) })],
  [
    "메신저",
    with_({ legacyTutorial: legacy({ completedMessengerUnitIds: ["appointment-confirmation"] }) }),
  ],
  [
    "전화",
    with_({
      legacyTutorial: legacy({
        completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
      }),
    }),
  ],
  [
    "최종 테스트",
    with_({ legacyTutorial: legacy({ completedEpisodeFinalIds: ["tutorial-final-test"] }) }),
  ],
  [
    "비주얼 노벨 한 걸음",
    with_({ legacyTutorial: legacy({ visualNovel: { status: "active", beatIndex: 1 } }) }),
  ],
  [
    "비주얼 노벨 완료",
    with_({ legacyTutorial: legacy({ visualNovel: { status: "completed", beatIndex: 2 } }) }),
  ],
  ["카탈로그 유닛 하나", with_({ catalogProgress: { u01: ["intro"] } })],
  ["카탈로그 에피소드 하나", with_({ catalogProgress: { u02: ["S1"] } })],
];

describe("LP-C covers 판정", () => {
  test("LP-C1 covers. 같은 진행 · 빈 둘은 참", () => {
    const same = with_({
      legacyTutorial: legacy({ completedStepCount: 2 }),
      catalogProgress: { u01: ["intro", "S1"] },
    });
    expect(journeyProgressCovers(same, same)).toBe(true);
    expect(journeyProgressCovers(empty, empty)).toBe(true);
  });

  test("LP-C2 covers. 순서만 다른 카탈로그 진행은 참", () => {
    const local = with_({ catalogProgress: { u01: ["intro", "S1", "S3"], u02: ["intro"] } });
    const server = with_({ catalogProgress: { u02: ["intro"], u01: ["S1", "S3", "intro"] } });
    expect(journeyProgressCovers(server, local)).toBe(true);
  });

  test.each(oneMore)("LP-C3 covers. local이 %s를 더 가지면 거짓", (_label, local) => {
    expect(journeyProgressCovers(empty, local)).toBe(false);
  });

  test.each(oneMore)("LP-C4 covers. server가 %s를 더 가지면 참", (_label, server) => {
    expect(journeyProgressCovers(server, empty)).toBe(true);
  });

  test("LP-C6 covers. 입력을 바꾸지 않는다", () => {
    const server = with_({ catalogProgress: { u01: ["intro", "S1"] } });
    const local = with_({
      catalogProgress: { u01: ["S1", "intro"] },
      legacyTutorial: legacy({ completedStepCount: 1 }),
    });
    const before = structuredClone([server, local]);
    journeyProgressCovers(server, local);
    expect([server, local]).toEqual(before);
  });

  test("LP-C6 covers. 중복이 든 배열은 중복을 무시하고 판정한다", () => {
    const server = with_({ catalogProgress: { u01: ["intro", "S1"] } });
    const local = with_({ catalogProgress: { u01: ["S1", "S1", "intro", "intro"] } });
    expect(journeyProgressCovers(server, local)).toBe(true);
  });
});

// 고정 진행 열둘 — 순서가 다른 쌍 · 앞서는 쌍 · 서로 엇갈리는 쌍이 섞이도록 고른다.
const a1 = with_({
  legacyTutorial: legacy({ completedStepCount: 2, completedEpisodeIntroIds: ["tutorial-intro"] }),
});
const a2 = with_({
  legacyTutorial: legacy({
    completedStepCount: 3,
    completedMessengerUnitIds: ["appointment-confirmation"],
  }),
});
const a3 = with_({ catalogProgress: { u01: ["intro", "S1"], u02: ["RP"] } });
const a4 = with_({ catalogProgress: { u02: ["RP"], u01: ["S1", "intro"] } });
const a5 = with_({ catalogProgress: { u01: ["S2"], u03: ["intro"] } });
const a6 = with_({ legacyTutorial: legacy({ visualNovel: { status: "active", beatIndex: 0 } }) });
const a7 = with_({
  legacyTutorial: legacy({
    visualNovel: { status: "active", beatIndex: 1 },
    completedStepCount: 1,
  }),
});
const a8 = with_({
  legacyTutorial: legacy({ visualNovel: { status: "completed", beatIndex: 2 } }),
});
const a9 = with_({
  legacyTutorial: legacy({
    completedStepCount: 1000,
    completedEpisodeIntroIds: ["tutorial-intro"],
    completedMessengerUnitIds: ["appointment-confirmation"],
    completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
    completedEpisodeFinalIds: ["tutorial-final-test"],
    visualNovel: { status: "completed", beatIndex: 2 },
  }),
  catalogProgress: { u01: ["RP"] },
});
const pairs: readonly (readonly [ContractProgressState, ContractProgressState])[] = [
  [a1, a2],
  [a2, a1],
  [a3, a4],
  [a4, a3],
  [a3, a5],
  [a5, a4],
  [a6, a7],
  [a7, a8],
  [a8, a6],
  [a9, a1],
  [a1, a9],
  [empty, a3],
];

// 집합 뜻의 정규화 — 배열은 정렬, 카탈로그 키도 정렬.
function normalized(state: ContractProgressState): string {
  const snapshot = learningProgressSnapshotFrom(state);
  const catalog = Object.fromEntries(
    Object.entries(snapshot.catalogProgress ?? {})
      .map(([id, units]) => [id, [...units].sort()] as const)
      .sort(([x], [y]) => (x < y ? -1 : 1)),
  );
  return JSON.stringify({
    ...snapshot,
    completedEpisodeIntroIds: [...snapshot.completedEpisodeIntroIds].sort(),
    completedMessengerUnitIds: [...snapshot.completedMessengerUnitIds].sort(),
    completedPhoneCallUnitIds: [...snapshot.completedPhoneCallUnitIds].sort(),
    completedEpisodeFinalIds: [...snapshot.completedEpisodeFinalIds].sort(),
    catalogProgress: catalog,
  });
}

describe("LP-C5 합치기와의 일치", () => {
  test("LP-C5. 쌍은 12개다", () => {
    expect(pairs).toHaveLength(12);
  });

  test.each(pairs.map((pair, index) => [index + 1, ...pair] as const))(
    "LP-C5. 쌍 %i — covers(s, l)은 정규화한 merge(s, l)이 s와 같은지와 일치한다",
    (_index, server, local) => {
      const expected = normalized(mergeJourneyProgress(server, local)) === normalized(server);
      expect(journeyProgressCovers(server, local)).toBe(expected);
    },
  );
});

describe("MG 합치기 불변식", () => {
  test.each(pairs.map((pair, index) => [index + 1, ...pair] as const))(
    "MG1. 쌍 %i — 합친 진행은 어느 쪽도 덮는다(단조)",
    (_index, a, b) => {
      const merged = mergeJourneyProgress(a, b);
      expect(journeyProgressCovers(merged, a)).toBe(true);
      expect(journeyProgressCovers(merged, b)).toBe(true);
    },
  );

  test.each(pairs.map((pair, index) => [index + 1, ...pair] as const))(
    "MG2. 쌍 %i — 교환 · 멱등(집합 뜻)",
    (_index, a, b) => {
      const ab = mergeJourneyProgress(a, b);
      const ba = mergeJourneyProgress(b, a);
      expect(journeyProgressCovers(ab, ba)).toBe(true);
      expect(journeyProgressCovers(ba, ab)).toBe(true);
      const again = mergeJourneyProgress(ab, b);
      expect(journeyProgressCovers(again, ab)).toBe(true);
      expect(journeyProgressCovers(ab, again)).toBe(true);
    },
  );

  test.each(pairs.map((pair, index) => [index + 1, ...pair] as const))(
    "MG3. 쌍 %i — 합친 트로피는 어느 쪽보다 적지 않다",
    (_index, a, b) => {
      const merged = trophyCountFrom(mergeJourneyProgress(a, b), defaultCompletion);
      expect(merged).toBeGreaterThanOrEqual(
        Math.max(trophyCountFrom(a, defaultCompletion), trophyCountFrom(b, defaultCompletion)),
      );
    },
  );
});
