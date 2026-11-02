import type { SetStateAction } from "@lynx-js/react";
import { describe, expect, test } from "vitest";

import type { AnswerResult } from "../lib/answer-result";
import type { CatalogProgress } from "../lib/catalog-progress";
import { legacyCatalogInput } from "../lib/episode-legacy.test-support";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { noLearnerProfilePort } from "../lib/learner-profile";
import { fillPlaceholders } from "../lib/placeholder-fill";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import { noLearnerProfile } from "./catalog-cover-wiring";
import { newCatalogFinishGuard } from "./catalog-finish-guard";
import type { CatalogFinishGuard } from "./catalog-finish-guard";
import {
  catalogJudgedCountOf,
  catalogLessonPlanOf,
  catalogPassCriterion,
} from "./catalog-lesson-plan";
import { catalogLessonWiring } from "./catalog-lesson-wiring";
import type { CatalogReview, CatalogReviewItem } from "./catalog-review";
import type { NavAction } from "./nav-state";

// `unit` 계층: 틀린 문제 다시 풀기(ADR-0058 ⟨2026-10-30⟩)의 결선만 봅니다 — 미통과일 때만 진입 화면으로 가는가, 틀린
// 문항이 레슨 순서대로 모이는가, 한 번씩 넘기는가, 다 풀면 고친 수를 반영해 판정 · 기록 · 이벤트 · 요약을 내는가, 나가기가 비우는가.

const catalog = buildEpisodeCatalog({
  bundled: legacyCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const correct: AnswerResult = "correct";
const incorrect: AnswerResult = "incorrect";
const progress: CatalogProgress = { "u01-water": ["intro", "S1"] };

// u01 S3의 계획 — 활동 수 · 활동별 문항 수를 하드코딩하지 않고 계약 함수에서 읽습니다.
const plan = (() => {
  const entry = catalog.find((candidate) => candidate.id === "u01-water");
  if (entry === undefined || entry.status !== "ready") throw new Error("u01이 ready가 아닙니다");
  const built = catalogLessonPlanOf(
    entry,
    "S3",
    (text, script) => fillPlaceholders(text, {}, script),
    (path) => `https://cdn/${path}`,
  );
  if (built === null) throw new Error("S3 계획이 없습니다");
  return built;
})();
const lastIndex = plan.activities.length - 1;
const sizeOf = (activityIndex: number): number =>
  plan.activities[activityIndex]?.questions.length ?? 0;
const allRight = (activityIndex: number): AnswerResult[] =>
  Array.from({ length: sizeOf(activityIndex) }, () => correct);
const item = (activityIndex: number, questionIndex: number): CatalogReviewItem => ({
  activityIndex,
  questionIndex,
});

type Log = {
  readonly events: EpisodeIntroEvent[];
  readonly dispatches: NavAction[];
  readonly progressWrites: number[];
  readonly results: (readonly AnswerResult[])[];
  readonly skipped: number[];
  readonly mistakes: (readonly CatalogReviewItem[])[];
};

type Pending = {
  readonly results?: readonly AnswerResult[];
  readonly skipped?: number;
  readonly mistakes?: readonly CatalogReviewItem[];
};

function resolve<T>(action: SetStateAction<T>, previous: T): T {
  return typeof action === "function" ? (action as (value: T) => T)(previous) : action;
}

function setup(pending: Pending = {}, guard: CatalogFinishGuard = newCatalogFinishGuard()) {
  const log: Log = {
    events: [],
    dispatches: [],
    progressWrites: [],
    results: [],
    skipped: [],
    mistakes: [],
  };
  const pendingResults = pending.results ?? [];
  const pendingSkippedCount = pending.skipped ?? 0;
  const pendingMistakes = pending.mistakes ?? [];
  const wiring = catalogLessonWiring({
    episodeContent: {
      catalog,
      imageUrlOf: (path) => `https://cdn/${path}`,
      audioUrlOf: () => null,
      fillText: fillPlaceholders,
      audioTimingOf: () => null,
    },
    catalogSections: catalogMapSectionsOf(catalog),
    catalogProgress: progress,
    learnerFill: noLearnerProfile,
    learnerRecord: null,
    learnerSync: "none",
    learnerPort: noLearnerProfilePort,
    setCatalogProgress: () => void log.progressWrites.push(1),
    dispatch: (action) => void log.dispatches.push(action),
    episodeIntroEventSink: (event) => void log.events.push(event),
    pendingResults,
    setPendingResults: (action) => void log.results.push(resolve(action, pendingResults)),
    pendingSkippedCount,
    setPendingSkippedCount: (action) => void log.skipped.push(resolve(action, pendingSkippedCount)),
    pendingMistakes,
    setPendingMistakes: (action) => void log.mistakes.push(resolve(action, pendingMistakes)),
    finishGuard: guard,
    setListenPace: () => {},
  });
  return { wiring, log };
}

const reviewScreen = (review: CatalogReview): NavAction => ({
  type: "replace",
  screen: {
    name: "catalog-lesson",
    episodeId: "u01-water",
    unitKey: "S3",
    activityIndex: review.queue[0].activityIndex,
    review,
  },
});

// 유닛 전체 판정 기준입니다 — 결선과 같은 함수로 계산합니다.
const criterionOf = (results: readonly AnswerResult[]) =>
  catalogPassCriterion(catalogJudgedCountOf(plan.questionCount, results));
const correctOf = (results: readonly AnswerResult[]) =>
  results.filter((result) => result === correct).length;

// 미통과 레슨 하나 — 앞 활동은 모두 틀리고(문항 셋), 마지막 활동은 첫 문항만 틀립니다.
const earlierMistakes = [item(0, 0), item(0, 1), item(0, 2)];
const earlierResults: AnswerResult[] = [incorrect, incorrect, incorrect];
const lastResults = (): AnswerResult[] => [incorrect, ...allRight(lastIndex).slice(1)];
const firstTry = (): AnswerResult[] => [...earlierResults, ...lastResults()];
const neededOf = (results: readonly AnswerResult[]) =>
  criterionOf(results).minCorrectCount - correctOf(results);

describe("마지막 활동 뒤 다시 풀기로 (LWR)", () => {
  test("LWR1. 틀린 문항이 있으면 판정하지 않고 곧바로 첫 다시 도전 문항을 세운다", () => {
    const { wiring, log } = setup({
      results: earlierResults,
      mistakes: earlierMistakes,
      skipped: 1,
    });
    wiring.onFinishCatalogActivity("u01-water", "S3", lastIndex, lastResults(), 0);

    expect(log.events).toEqual([]);
    expect(log.progressWrites).toEqual([]);
    // 첫 결과 · 건너뜀 수는 판정 때까지 들고, 틀린 문항 목록은 줄(route)로 옮겨 비웁니다.
    expect(log.results).toEqual([firstTry()]);
    expect(log.skipped).toEqual([1]);
    expect(log.mistakes).toEqual([[]]);
    expect(log.dispatches).toEqual([
      reviewScreen({
        queue: [item(0, 0), item(0, 1), item(0, 2), item(lastIndex, 0)],
        outcomes: [],
        neededToPass: neededOf(firstTry()),
      }),
    ]);
  });

  test("LWR2. 통과여도 틀린 문항이 있으면 결과 대신 다시 도전이다(남은 필요 수 0)", () => {
    const passing = [incorrect, ...allRight(lastIndex).slice(1)];
    const { wiring, log } = setup({ results: allRight(0) });
    wiring.onFinishCatalogActivity("u01-water", "S3", lastIndex, passing, 0);
    expect(log.events).toEqual([]);
    expect(log.dispatches).toEqual([
      reviewScreen({ queue: [item(lastIndex, 0)], outcomes: [], neededToPass: 0 }),
    ]);
  });

  test("LWR3. 틀린 문항이 없으면 곧바로 판정 · 결과다", () => {
    const { wiring, log } = setup({ results: allRight(0) });
    wiring.onFinishCatalogActivity("u01-water", "S3", lastIndex, allRight(lastIndex), 0);
    expect(log.events).toEqual([expect.objectContaining({ verdict: "passed" })]);
    expect(log.dispatches[0]).toMatchObject({ screen: { name: "catalog-unit-complete" } });
    expect(log.dispatches[0]).not.toMatchObject({ screen: { review: expect.anything() } });
  });

  test("LWR3b. 중간 활동의 틀린 문항은 레슨 순서대로 쌓이고, 건너뛴 문항은 다시 풀지 않는다", () => {
    const middle = setup();
    const results = allRight(0).map((result, index) => (index === 1 ? incorrect : result));
    middle.wiring.onFinishCatalogActivity("u01-water", "S3", 0, results, 0);
    expect(middle.log.mistakes).toEqual([[item(0, 1)]]);
    const skipped = setup();
    skipped.wiring.onFinishCatalogActivity("u01-water", "S3", 0, [incorrect], 1, [0]);
    expect(skipped.log.mistakes).toEqual([[item(0, 1)]]);
  });
});

describe("한 번씩 풀기 · 판정 (LWR)", () => {
  const intro: CatalogReview = {
    queue: [item(0, 0), item(lastIndex, 0)],
    outcomes: [],
    neededToPass: 1,
  };
  const question: CatalogReview = intro;

  test("LWR6. 맞히든 틀리든 다음 문항으로 — 줄 뒤로 보내지 않고 이벤트 · 기록도 없다", () => {
    const { wiring, log } = setup();
    wiring.onFinishCatalogReview("u01-water", "S3", question, [incorrect]);
    expect(log.dispatches).toEqual([
      reviewScreen({ ...question, queue: [item(lastIndex, 0)], outcomes: ["missed"] }),
    ]);
    expect(log.events).toEqual([]);
  });

  test("LWR7. 다 풀면 고친 수만큼 오답을 정답으로 쳐 판정한다 — 통과면 기록 · 요약을 싣는다", () => {
    const results = firstTry();
    const needed = neededOf(results);
    const queue = Array.from({ length: needed }, (_, index) => item(0, index));
    const last: CatalogReview = {
      queue: [queue[needed - 1] ?? item(0, 0)],
      outcomes: Array.from({ length: needed - 1 }, () => "fixed" as const),
      neededToPass: needed,
    };
    const { wiring, log } = setup({ results });
    wiring.onFinishCatalogReview("u01-water", "S3", last, [correct]);

    const fixedAll = results.map((result, index) =>
      result === incorrect && index < needed ? correct : result,
    );
    expect(log.events).toEqual([expect.objectContaining({ verdict: "passed" })]);
    expect(log.progressWrites).toEqual([1]);
    expect(log.dispatches).toEqual([
      {
        type: "replace",
        screen: expect.objectContaining({
          name: "catalog-unit-complete",
          results: fixedAll,
          review: { outcomes: Array.from({ length: needed }, () => "fixed"), remainingToPass: 0 },
        }),
      },
    ]);
  });

  test("LWR8. 다 풀어도 모자라면 미통과로 판정하고 남은 수를 요약에 싣는다", () => {
    const { wiring, log } = setup({ results: firstTry() });
    const last: CatalogReview = { ...question, queue: [item(0, 0)], neededToPass: 2 };
    wiring.onFinishCatalogReview("u01-water", "S3", last, [incorrect]);
    expect(log.events).toEqual([expect.objectContaining({ verdict: "failed" })]);
    expect(log.progressWrites).toEqual([]);
    expect(log.dispatches[0]).toMatchObject({
      screen: { review: { outcomes: ["missed"], remainingToPass: 2 } },
    });
  });

  test("LWR9. 같은 화면의 finish가 두 번 와도 한 번만 넘긴다", () => {
    const { wiring, log } = setup({}, newCatalogFinishGuard());
    wiring.onFinishCatalogReview("u01-water", "S3", question, [incorrect]);
    wiring.onFinishCatalogReview("u01-water", "S3", question, [incorrect]);
    expect(log.dispatches).toHaveLength(1);
  });

  test("LWR10. 다시 풀기 도중 나가면 기록 없이 맵으로 가고 세션을 비운다", () => {
    const { wiring, log } = setup({ mistakes: [item(0, 1)] });
    wiring.onExitCatalogSession();
    expect(log.dispatches).toEqual([{ type: "backToRoot" }]);
    expect(log.events).toEqual([]);
    expect(log.mistakes).toEqual([[]]);
  });
});
