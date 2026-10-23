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
import { catalogLessonPlanOf } from "./catalog-lesson-plan";
import { catalogLessonWiring } from "./catalog-lesson-wiring";
import type { CatalogReview, CatalogReviewItem } from "./catalog-review";
import type { NavAction } from "./nav-state";

// `unit` 계층: 틀린 문제 다시 풀기(2026-10-23)의 결선만 봅니다 — 마지막 활동 뒤 다시 풀기로 가는가, 틀린 문항이 레슨
// 순서대로 모이는가, 줄을 넘기는가, 줄이 비면 첫 시도 결과로만 판정 · 기록 · 이벤트를 내는가, 나가기가 비우는가.

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

describe("마지막 활동 뒤 다시 풀기로 (LWR)", () => {
  test("LWR1. 첫 시도에 틀린 채점 문항이 있으면 판정하지 않고 다시 풀기 첫 화면을 세운다", () => {
    const earlier = [item(0, 1)];
    const { wiring, log } = setup({ results: [correct, incorrect], skipped: 1, mistakes: earlier });
    const last = [incorrect, ...allRight(lastIndex).slice(1)];

    wiring.onFinishCatalogActivity("u01-water", "S3", lastIndex, last, 0);

    expect(log.events).toEqual([]);
    expect(log.progressWrites).toEqual([]);
    // 첫 시도 결과 · 건너뜀 수는 판정 때까지 들고, 틀린 문항 목록은 줄(route)로 옮겨 비웁니다.
    expect(log.results).toEqual([[correct, incorrect, ...last]]);
    expect(log.skipped).toEqual([1]);
    expect(log.mistakes).toEqual([[]]);
    expect(log.dispatches).toEqual([
      reviewScreen({
        queue: [item(0, 1), item(lastIndex, 0)],
        fixedCount: 0,
        initialCount: 2,
        attempt: 0,
      }),
    ]);
  });

  test("LWR2. 중간 활동의 틀린 문항은 레슨 순서대로 쌓이고, 다 맞힌 레슨은 지금처럼 곧바로 판정한다", () => {
    const middle = setup();
    const results = allRight(0).map((result, index) => (index === 1 ? incorrect : result));
    middle.wiring.onFinishCatalogActivity("u01-water", "S3", 0, results, 0);
    expect(middle.log.mistakes).toEqual([[item(0, 1)]]);

    const clean = setup({ results: allRight(0) });
    clean.wiring.onFinishCatalogActivity("u01-water", "S3", lastIndex, allRight(lastIndex), 0);
    expect(clean.log.events.map((event) => event.name)).toEqual(["episode_lesson_finished"]);
    expect(clean.log.dispatches[0]).toMatchObject({
      screen: { name: "catalog-unit-complete" },
    });
  });

  test("LWR3. 건너뛴 문항(말하기를 못 씀)은 결과 자리에서 비우고 다시 풀지 않는다", () => {
    const { wiring, log } = setup();
    // 문항 0을 건너뛰면 결과 [틀림]은 문항 1의 것입니다.
    wiring.onFinishCatalogActivity("u01-water", "S3", 0, [incorrect], 1, [0]);
    expect(log.mistakes).toEqual([[item(0, 1)]]);
  });
});

describe("다시 풀기 줄 넘기기와 끝 (LWR)", () => {
  const start: CatalogReview = {
    queue: [item(0, 1), item(lastIndex, 0)],
    fixedCount: 0,
    initialCount: 2,
    attempt: 0,
  };

  test("LWR4. 또 틀리면 줄 맨 뒤로 보내고 다음 문항 화면을 세운다 — 이벤트 · 기록은 없다", () => {
    const { wiring, log } = setup();
    wiring.onFinishCatalogReview("u01-water", "S3", start, [incorrect]);
    expect(log.dispatches).toEqual([
      reviewScreen({
        queue: [item(lastIndex, 0), item(0, 1)],
        fixedCount: 0,
        initialCount: 2,
        attempt: 1,
      }),
    ]);
    expect(log.events).toEqual([]);
    expect(log.progressWrites).toEqual([]);
  });

  test("LWR5. 줄이 비면 첫 시도 결과로 판정한다 — 첫 시도가 실패면 다시 풀어 맞혀도 기록하지 않는다", () => {
    const firstTry: AnswerResult[] = [incorrect, incorrect, incorrect, correct];
    const lastStep: CatalogReview = {
      queue: [item(0, 1)],
      fixedCount: 1,
      initialCount: 3,
      attempt: 4,
    };
    const { wiring, log } = setup({ results: firstTry, skipped: 2 });

    wiring.onFinishCatalogReview("u01-water", "S3", lastStep, [correct]);

    expect(log.events).toEqual([
      expect.objectContaining({
        name: "episode_lesson_finished",
        verdict: "failed",
        correctCount: "1",
        skippedCount: "2",
      }),
    ]);
    expect(log.progressWrites).toEqual([]);
    expect(log.dispatches).toEqual([
      {
        type: "replace",
        screen: {
          name: "catalog-unit-complete",
          episodeId: "u01-water",
          unitKey: "S3",
          results: firstTry,
          skippedCount: 2,
          questionCount: 4,
        },
      },
    ]);
    // 판정 뒤 세션(결과 · 건너뜀 · 틀린 문항)을 비웁니다.
    expect(log.results).toEqual([[]]);
    expect(log.skipped).toEqual([0]);
    expect(log.mistakes).toEqual([[]]);
  });

  test("LWR6. 첫 시도가 통과면 줄이 빈 뒤 기록하고 통과 이벤트를 낸다", () => {
    const firstTry = [...Array.from({ length: 5 }, () => correct), incorrect];
    const { wiring, log } = setup({ results: firstTry });
    wiring.onFinishCatalogReview(
      "u01-water",
      "S3",
      { queue: [item(lastIndex, 0)], fixedCount: 0, initialCount: 1, attempt: 0 },
      [correct],
    );
    expect(log.events).toEqual([expect.objectContaining({ verdict: "passed", correctCount: "5" })]);
    expect(log.progressWrites).toEqual([1]);
  });

  test("LWR7. 같은 다시 풀기 화면의 finish가 두 번 와도 한 번만 넘긴다", () => {
    const guard = newCatalogFinishGuard();
    const { wiring, log } = setup({}, guard);
    wiring.onFinishCatalogReview("u01-water", "S3", start, [incorrect]);
    wiring.onFinishCatalogReview("u01-water", "S3", start, [incorrect]);
    expect(log.dispatches).toHaveLength(1);
  });

  test("LWR8. 다시 풀기 도중 나가면 기록 없이 맵으로 가고 틀린 문항까지 세션을 비운다", () => {
    const { wiring, log } = setup({ mistakes: [item(0, 1)] });
    wiring.onExitCatalogSession();
    expect(log.dispatches).toEqual([{ type: "backToRoot" }]);
    expect(log.events).toEqual([]);
    expect(log.progressWrites).toEqual([]);
    expect(log.mistakes).toEqual([[]]);
  });
});
