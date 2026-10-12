import type { SetStateAction } from "@lynx-js/react";
import { describe, expect, test, vi } from "vitest";

import type { AnswerResult } from "../lib/answer-result";
import type { CatalogProgress } from "../lib/catalog-progress";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { LearningItem } from "../lib/episode-content.model";
import { fillPlaceholders } from "../lib/placeholder-fill";
import type {
  EpisodeIntroEvent,
  EpisodeIntroEventSink,
} from "../screens/episode-intro/episode-intro.contract";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import { catalogLessonWiring } from "./catalog-lesson-wiring";
import type { CatalogLessonWiringArgs } from "./catalog-lesson-wiring";
import type { EpisodeContent } from "./episode-content";
import type { NavAction } from "./nav-state";

// `unit` 계층: 카탈로그 레슨 · 최종 테스트 결선의 가드 · 호출 순서 · 기록 · 이벤트 · 이동만 봅니다.

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});

function contentOf(catalog: readonly CatalogEntry[]): EpisodeContent {
  return {
    catalog,
    imageUrlOf: (path) => `https://cdn/${path}`,
    fillText: fillPlaceholders,
  };
}

const correct: AnswerResult = "correct";
const incorrect: AnswerResult = "incorrect";
const many = (count: number, result: AnswerResult): AnswerResult[] =>
  Array.from({ length: count }, () => result);

const allLessonsDone: CatalogProgress = {
  "u01-water": ["intro", "S1", "S3", "S4", "S5", "S6", "S7", "S8", "S9"],
};

type Entry =
  | { readonly kind: "pending"; readonly value: readonly AnswerResult[] }
  | { readonly kind: "skipped"; readonly value: number }
  | { readonly kind: "progress"; readonly value: CatalogProgress }
  | { readonly kind: "dispatch"; readonly value: NavAction }
  | { readonly kind: "event"; readonly value: EpisodeIntroEvent };

function resolveAction<T>(action: SetStateAction<T>, previous: T): T {
  return typeof action === "function" ? (action as (value: T) => T)(previous) : action;
}

type Harness = {
  readonly wiring: ReturnType<typeof catalogLessonWiring>;
  readonly log: Entry[];
  readonly args: CatalogLessonWiringArgs;
  readonly setCompletedStepCount: ReturnType<typeof vi.fn<(count: number) => void>>;
  readonly updaters: ((progress: CatalogProgress) => CatalogProgress)[];
};

function harness(
  options: {
    catalog?: readonly CatalogEntry[];
    progress?: CatalogProgress;
    pendingResults?: readonly AnswerResult[];
    pendingSkippedCount?: number;
    sinkNull?: boolean;
  } = {},
): Harness {
  const catalog = options.catalog ?? realCatalog;
  const progress = options.progress ?? {};
  const pendingResults = options.pendingResults ?? [];
  const pendingSkippedCount = options.pendingSkippedCount ?? 0;
  const log: Entry[] = [];
  const updaters: ((value: CatalogProgress) => CatalogProgress)[] = [];
  const sink: EpisodeIntroEventSink =
    options.sinkNull === true ? null : (event) => void log.push({ kind: "event", value: event });
  const args: CatalogLessonWiringArgs = {
    episodeContent: contentOf(catalog),
    catalogSections: catalogMapSectionsOf(catalog),
    catalogProgress: progress,
    setCatalogProgress: (action) => {
      if (typeof action === "function")
        updaters.push(action as (value: CatalogProgress) => CatalogProgress);
      log.push({ kind: "progress", value: resolveAction(action, progress) });
    },
    completedEpisodeFinalIds: [],
    dispatch: (action) => void log.push({ kind: "dispatch", value: action }),
    episodeIntroEventSink: sink,
    pendingResults,
    setPendingResults: (action) =>
      void log.push({ kind: "pending", value: resolveAction(action, pendingResults) }),
    pendingSkippedCount,
    setPendingSkippedCount: (action) =>
      void log.push({ kind: "skipped", value: resolveAction(action, pendingSkippedCount) }),
  };
  const setCompletedStepCount = vi.fn<(count: number) => void>();
  // 튜토리얼 진행 setter도 인자에 함께 넣어 카탈로그가 건드리지 않는지 봅니다.
  const withTutorial = { ...args, setCompletedStepCount };
  return {
    wiring: catalogLessonWiring(withTutorial),
    log,
    args,
    setCompletedStepCount,
    updaters,
  };
}

const kinds = (log: readonly Entry[], kind: Entry["kind"]) =>
  log.filter((entry) => entry.kind === kind).map((entry) => entry.value);
const events = (log: readonly Entry[]) => kinds(log, "event") as EpisodeIntroEvent[];
const dispatches = (log: readonly Entry[]) => kinds(log, "dispatch") as NavAction[];
const firstIndex = (log: readonly Entry[], pick: (entry: Entry) => boolean): number =>
  log.findIndex(pick);
const eventIndex = (log: readonly Entry[], name: string): number =>
  firstIndex(log, (entry) => entry.kind === "event" && entry.value.name === name);
const dispatchIndex = (log: readonly Entry[], type: string): number =>
  firstIndex(log, (entry) => entry.kind === "dispatch" && entry.value.type === type);
const progressIndex = (log: readonly Entry[]): number =>
  firstIndex(log, (entry) => entry.kind === "progress");

/** 세션 비움 — 결과 목록이 빈 배열로, 건너뜀 수가 0으로 돌아간 마지막 자리입니다. */
function sessionClearedAt(log: readonly Entry[]): number {
  const results = log.findIndex((entry) => entry.kind === "pending" && entry.value.length === 0);
  const skipped = log.findIndex((entry) => entry.kind === "skipped" && entry.value === 0);
  return results >= 0 && skipped >= 0 ? Math.max(results, skipped) : -1;
}

/** 학습이 비어 보이는 유닛(S1)을 가진 u01 — 보일 수 있는 문항이 없는 유닛을 흉내 냅니다. */
function catalogWithEmptyS1(): readonly CatalogEntry[] {
  const base = realCatalog[0] as ReadyEntry;
  const card = (id: string): LearningItem => ({
    id,
    event: "E",
    type: "VOCAB_CARD",
    context: { ko: "문맥", roman: "munmaek" },
    example: { ko: "예문", roman: "yemun" },
    cardKind: "단어",
  });
  const units = base.episode.units.map((unit) =>
    unit.id === "S1" ? { ...unit, items: [card("V1"), card("V2"), card("V3")] } : unit,
  );
  return [{ ...base, episode: { ...base.episode, units } }, ...realCatalog.slice(1)];
}

function catalogWithoutEpilogue(): readonly CatalogEntry[] {
  const base = realCatalog[0] as ReadyEntry;
  return [{ ...base, episode: { ...base.episode, epilogue: [] } }, ...realCatalog.slice(1)];
}

describe("onStartCatalogUnit — 레슨", () => {
  test("LW1. 세션을 비우고 시작 이벤트를 낸 뒤 첫 활동을 쌓는다", () => {
    const { wiring, log } = harness({ progress: { "u01-water": ["intro", "S1"] } });

    wiring.onStartCatalogUnit("u01-water", "S3");

    expect(events(log)).toEqual([
      {
        name: "episode_lesson_started",
        episodeId: "u01-water",
        unitKey: "S3",
        unitRole: "lesson",
        questionCount: "10",
        skippedItemCount: "0",
      },
    ]);
    expect(dispatches(log)).toEqual([
      {
        type: "push",
        screen: { name: "catalog-lesson", episodeId: "u01-water", unitKey: "S3", activityIndex: 0 },
      },
    ]);
    const cleared = sessionClearedAt(log);
    expect(cleared).toBeGreaterThanOrEqual(0);
    expect(cleared).toBeLessThan(eventIndex(log, "episode_lesson_started"));
    expect(eventIndex(log, "episode_lesson_started")).toBeLessThan(dispatchIndex(log, "push"));
    expect(kinds(log, "progress")).toEqual([]);
  });

  test.each([
    ["잠긴 레슨", "u01-water", "S3", { "u01-water": ["intro"] }],
    ["없는 에피소드", "nope", "S1", { "u01-water": ["intro"] }],
    ["표지 키", "u01-water", "intro", { "u01-water": ["intro"] }],
    ["없는 키", "u01-water", "S2", { "u01-water": ["intro", "S1"] }],
  ] as const)("LW2. %s는 아무 일도 하지 않는다", (_name, episodeId, unitKey, progress) => {
    const { wiring, log, setCompletedStepCount } = harness({ progress });

    wiring.onStartCatalogUnit(episodeId, unitKey);

    expect(log).toEqual([]);
    expect(setCompletedStepCount).not.toHaveBeenCalled();
  });

  test("LW3. 보일 문항이 0개인 유닛은 시작하자마자 통과로 기록하고 결과 화면을 쌓는다", () => {
    const { wiring, log, updaters } = harness({
      catalog: catalogWithEmptyS1(),
      progress: { "u01-water": ["intro"] },
    });

    wiring.onStartCatalogUnit("u01-water", "S1");

    expect(events(log)).toEqual([
      {
        name: "episode_lesson_started",
        episodeId: "u01-water",
        unitKey: "S1",
        unitRole: "lesson",
        questionCount: "0",
        skippedItemCount: "3",
      },
      {
        name: "episode_lesson_finished",
        episodeId: "u01-water",
        unitKey: "S1",
        unitRole: "lesson",
        verdict: "passed",
        correctCount: "0",
        questionCount: "0",
      },
    ]);
    expect(updaters).toHaveLength(1);
    expect(updaters[0]?.({ "u01-water": ["intro"] })).toEqual({ "u01-water": ["intro", "S1"] });
    expect(dispatches(log)).toEqual([
      expect.objectContaining({
        type: "push",
        screen: expect.objectContaining({
          name: "catalog-unit-complete",
          episodeId: "u01-water",
          unitKey: "S1",
          results: [],
          questionCount: 0,
        }),
      }),
    ]);
    expect(eventIndex(log, "episode_lesson_finished")).toBeLessThan(progressIndex(log));
    expect(progressIndex(log)).toBeLessThan(dispatchIndex(log, "push"));
  });

  test("LW3. 실데이터 u01 S1은 문항이 있어 활동 화면으로 간다", () => {
    const { wiring, log } = harness({ progress: { "u01-water": ["intro"] } });

    wiring.onStartCatalogUnit("u01-water", "S1");

    expect(events(log)).toEqual([
      expect.objectContaining({
        name: "episode_lesson_started",
        questionCount: "3",
        skippedItemCount: "5",
      }),
    ]);
    expect(dispatches(log)).toEqual([
      expect.objectContaining({
        screen: expect.objectContaining({ name: "catalog-lesson", activityIndex: 0 }),
      }),
    ]);
  });
});

describe("onFinishCatalogActivity", () => {
  const sixCorrectPending = (): AnswerResult[] => many(9, correct);

  test("LW4. 활동이 남았으면 결과를 쌓고 다음 활동으로 갈아탄다", () => {
    const { wiring, log } = harness({
      progress: { "u01-water": ["intro", "S1"] },
      pendingResults: [correct],
      pendingSkippedCount: 1,
    });

    wiring.onFinishCatalogActivity("u01-water", "S3", 0, [correct, correct, correct], 2);

    expect(kinds(log, "pending")).toEqual([[correct, correct, correct, correct]]);
    expect(kinds(log, "skipped")).toEqual([3]);
    expect(dispatches(log)).toEqual([
      {
        type: "replace",
        screen: { name: "catalog-lesson", episodeId: "u01-water", unitKey: "S3", activityIndex: 1 },
      },
    ]);
    expect(events(log)).toEqual([]);
    expect(kinds(log, "progress")).toEqual([]);
  });

  test("LW5. 마지막 활동이 기준을 넘으면 세션을 비우고 끝 이벤트 · 기록 · 결과 화면 순으로 간다", () => {
    const { wiring, log, updaters } = harness({
      progress: { "u01-water": ["intro", "S1"] },
      pendingResults: sixCorrectPending(),
      pendingSkippedCount: 2,
    });

    wiring.onFinishCatalogActivity("u01-water", "S3", 4, [correct], 1);

    expect(events(log)).toEqual([
      {
        name: "episode_lesson_finished",
        episodeId: "u01-water",
        unitKey: "S3",
        unitRole: "lesson",
        verdict: "passed",
        correctCount: "10",
        questionCount: "10",
      },
    ]);
    expect(updaters).toHaveLength(1);
    expect(updaters[0]?.({ "u01-water": ["intro", "S1"] })).toEqual({
      "u01-water": ["intro", "S1", "S3"],
    });
    expect(dispatches(log)).toEqual([
      {
        type: "replace",
        screen: {
          name: "catalog-unit-complete",
          episodeId: "u01-water",
          unitKey: "S3",
          results: many(10, correct),
          skippedCount: 3,
          questionCount: 10,
        },
      },
    ]);
    const cleared = sessionClearedAt(log);
    expect(cleared).toBeGreaterThanOrEqual(0);
    expect(cleared).toBeLessThan(eventIndex(log, "episode_lesson_finished"));
    expect(eventIndex(log, "episode_lesson_finished")).toBeLessThan(progressIndex(log));
    expect(progressIndex(log)).toBeLessThan(dispatchIndex(log, "replace"));
  });

  test("LW5. 기준에 딱 닿는 6개 정답이면 통과한다", () => {
    const { wiring, log } = harness({
      pendingResults: [...many(5, correct), ...many(4, incorrect)],
    });

    wiring.onFinishCatalogActivity("u01-water", "S3", 4, [correct], 0);

    expect(events(log)).toEqual([
      expect.objectContaining({ verdict: "passed", correctCount: "6" }),
    ]);
  });

  test("LW6. 정답이 모자라면 실패로 알리고 기록은 하지 않지만 결과 화면은 쌓는다", () => {
    const { wiring, log } = harness({
      progress: { "u01-water": ["intro", "S1"] },
      pendingResults: many(9, incorrect),
    });

    wiring.onFinishCatalogActivity("u01-water", "S3", 4, [correct], 0);

    expect(events(log)).toEqual([
      expect.objectContaining({
        name: "episode_lesson_finished",
        verdict: "failed",
        correctCount: "1",
        questionCount: "10",
      }),
    ]);
    expect(kinds(log, "progress")).toEqual([]);
    expect(dispatches(log)).toEqual([
      expect.objectContaining({
        type: "replace",
        screen: expect.objectContaining({ name: "catalog-unit-complete", unitKey: "S3" }),
      }),
    ]);
  });

  test("LW-R. 이미 끝낸 레슨을 다시 통과해도 이벤트는 매번 나가고 기록은 같은 참조다", () => {
    const done: CatalogProgress = { "u01-water": ["intro", "S1", "S3"] };
    const { wiring, log, updaters } = harness({
      progress: done,
      pendingResults: sixCorrectPending(),
    });

    wiring.onFinishCatalogActivity("u01-water", "S3", 4, [correct], 0);

    expect(events(log)).toEqual([expect.objectContaining({ verdict: "passed" })]);
    expect(updaters).toHaveLength(1);
    expect(updaters[0]?.(done)).toBe(done);
  });
});

describe("최종 테스트", () => {
  test("LW7. 열린 최종 테스트는 시작 이벤트(최종 역할 · 턴 수) 뒤 화면을 쌓는다", () => {
    const { wiring, log } = harness({ progress: allLessonsDone });

    wiring.onStartCatalogUnit("u01-water", "RP");

    expect(events(log)).toEqual([
      {
        name: "episode_lesson_started",
        episodeId: "u01-water",
        unitKey: "RP",
        unitRole: "final",
        questionCount: "3",
        skippedItemCount: "0",
      },
    ]);
    expect(dispatches(log)).toEqual([
      { type: "push", screen: { name: "catalog-final", episodeId: "u01-water" } },
    ]);
    expect(eventIndex(log, "episode_lesson_started")).toBeLessThan(dispatchIndex(log, "push"));
  });

  test("LW7. 레슨을 다 끝내지 않았으면 최종 테스트는 열리지 않는다", () => {
    const { wiring, log } = harness({ progress: { "u01-water": ["intro", "S1", "S3"] } });

    wiring.onStartCatalogUnit("u01-water", "RP");

    expect(log).toEqual([]);
  });

  test("LW8. 통과하면 끝 이벤트 → 통과 이벤트 → 기록 → 결과 화면 순이다", () => {
    const { wiring, log, updaters } = harness({ progress: allLessonsDone });

    wiring.onFinishCatalogFinal("u01-water", [correct, correct, incorrect]);

    expect(events(log)).toEqual([
      {
        name: "episode_lesson_finished",
        episodeId: "u01-water",
        unitKey: "RP",
        unitRole: "final",
        verdict: "passed",
        correctCount: "2",
        questionCount: "3",
      },
      {
        name: "episode_final_passed",
        episodeId: "u01-water",
        correctCount: "2",
        turnCount: "3",
      },
    ]);
    expect(updaters).toHaveLength(1);
    expect(updaters[0]?.(allLessonsDone)).toEqual({
      "u01-water": [...(allLessonsDone["u01-water"] ?? []), "RP"],
    });
    expect(dispatches(log)).toEqual([
      {
        type: "replace",
        screen: {
          name: "catalog-unit-complete",
          episodeId: "u01-water",
          unitKey: "RP",
          results: [correct, correct, incorrect],
          skippedCount: 0,
          questionCount: 3,
        },
      },
    ]);
    expect(eventIndex(log, "episode_lesson_finished")).toBeLessThan(
      eventIndex(log, "episode_final_passed"),
    );
    expect(eventIndex(log, "episode_final_passed")).toBeLessThan(progressIndex(log));
    expect(progressIndex(log)).toBeLessThan(dispatchIndex(log, "replace"));
  });

  test("LW9. 정답이 모자라면 실패로 알리고 통과 이벤트와 기록은 없다", () => {
    const { wiring, log } = harness({ progress: allLessonsDone });

    wiring.onFinishCatalogFinal("u01-water", [correct, incorrect, incorrect]);

    expect(events(log)).toEqual([
      expect.objectContaining({
        name: "episode_lesson_finished",
        unitRole: "final",
        verdict: "failed",
        correctCount: "1",
      }),
    ]);
    expect(kinds(log, "progress")).toEqual([]);
    expect(dispatches(log)).toEqual([
      expect.objectContaining({
        screen: expect.objectContaining({ name: "catalog-unit-complete", unitKey: "RP" }),
      }),
    ]);
  });
});

describe("결과 뒤 이동", () => {
  test("LW10. 최종 테스트를 통과한 결과의 나가기는 통과 뒤 컷으로 간다", () => {
    const { wiring, log } = harness({ progress: allLessonsDone });

    wiring.onExitCatalogUnitComplete("u01-water", "RP", "passed");

    expect(dispatches(log)).toEqual([
      { type: "replace", screen: { name: "catalog-epilogue", episodeId: "u01-water" } },
    ]);
  });

  test.each([
    ["최종 테스트 실패", "u01-water", "RP", "failed"],
    ["레슨 통과", "u01-water", "S3", "passed"],
    ["레슨 실패", "u01-water", "S3", "failed"],
  ] as const)("LW10. %s는 맵으로 돌아간다", (_name, episodeId, unitKey, verdict) => {
    const { wiring, log } = harness({ progress: allLessonsDone });

    wiring.onExitCatalogUnitComplete(episodeId, unitKey, verdict);

    expect(dispatches(log)).toEqual([{ type: "backToRoot" }]);
  });

  test("LW10. 통과 뒤 컷이 없는 에피소드는 최종 통과여도 맵으로 돌아간다", () => {
    const { wiring, log } = harness({
      catalog: catalogWithoutEpilogue(),
      progress: allLessonsDone,
    });

    wiring.onExitCatalogUnitComplete("u01-water", "RP", "passed");

    expect(dispatches(log)).toEqual([{ type: "backToRoot" }]);
  });

  test("LW11. 중도 나가기는 세션을 비우고 맵으로 가며 기록 · 이벤트는 없다", () => {
    const { wiring, log } = harness({
      pendingResults: [correct],
      pendingSkippedCount: 2,
    });

    wiring.onExitCatalogSession();

    expect(dispatches(log)).toEqual([{ type: "backToRoot" }]);
    expect(kinds(log, "progress")).toEqual([]);
    expect(events(log)).toEqual([]);
    const cleared = sessionClearedAt(log);
    expect(cleared).toBeGreaterThanOrEqual(0);
    expect(cleared).toBeLessThan(dispatchIndex(log, "backToRoot"));
  });

  test("LW11. 통과 뒤 컷에서 나가면 맵으로 가며 기록 · 이벤트는 없다", () => {
    const { wiring, log } = harness();

    wiring.onLeaveCatalogEpilogue();

    expect(dispatches(log)).toEqual([{ type: "backToRoot" }]);
    expect(kinds(log, "progress")).toEqual([]);
    expect(events(log)).toEqual([]);
  });
});

describe("튜토리얼 진행과 sink 없음", () => {
  test("LW12. 어느 콜백도 튜토리얼 진행 setter를 부르지 않는다", () => {
    const run = (progress: CatalogProgress, act: (h: Harness) => void): Harness => {
      const h = harness({ progress, pendingResults: many(9, correct) });
      act(h);
      return h;
    };
    const harnesses = [
      run({ "u01-water": ["intro", "S1"] }, (h) => h.wiring.onStartCatalogUnit("u01-water", "S3")),
      run({}, (h) => h.wiring.onStartCatalogUnit("u01-water", "S3")),
      run({ "u01-water": ["intro"] }, (h) =>
        h.wiring.onFinishCatalogActivity("u01-water", "S3", 0, [correct], 0),
      ),
      run({ "u01-water": ["intro"] }, (h) =>
        h.wiring.onFinishCatalogActivity("u01-water", "S3", 4, [correct], 0),
      ),
      run(allLessonsDone, (h) => h.wiring.onStartCatalogUnit("u01-water", "RP")),
      run(allLessonsDone, (h) =>
        h.wiring.onFinishCatalogFinal("u01-water", [correct, correct, correct]),
      ),
      run(allLessonsDone, (h) => h.wiring.onExitCatalogUnitComplete("u01-water", "RP", "passed")),
      run({}, (h) => h.wiring.onExitCatalogSession()),
      run({}, (h) => h.wiring.onLeaveCatalogEpilogue()),
    ];

    for (const h of harnesses) {
      expect(h.setCompletedStepCount).not.toHaveBeenCalled();
    }
  });

  test("LW13. sink가 null이어도 어느 콜백도 던지지 않고 이동은 일어난다", () => {
    const { wiring, log } = harness({
      sinkNull: true,
      progress: allLessonsDone,
      pendingResults: many(9, correct),
    });

    expect(() => wiring.onStartCatalogUnit("u01-water", "S3")).not.toThrow();
    expect(() => wiring.onFinishCatalogActivity("u01-water", "S3", 4, [correct], 0)).not.toThrow();
    expect(() => wiring.onStartCatalogUnit("u01-water", "RP")).not.toThrow();
    expect(() =>
      wiring.onFinishCatalogFinal("u01-water", [correct, correct, correct]),
    ).not.toThrow();
    expect(() => wiring.onExitCatalogUnitComplete("u01-water", "RP", "passed")).not.toThrow();
    expect(() => wiring.onExitCatalogSession()).not.toThrow();
    expect(() => wiring.onLeaveCatalogEpilogue()).not.toThrow();
    expect(events(log)).toEqual([]);
    expect(dispatches(log).length).toBeGreaterThan(0);
  });
});

describe("catalogWiring — 표지 결선과 레슨 결선을 합친다", () => {
  test("LW14. 표지 콜백 셋 · 학습 콜백 여섯 · 값 셋이 모두 있다", async () => {
    // 합치는 모듈은 이 단계에서 새로 생기므로 수집 단계에서 해석하지 않고 실행 때 불러옵니다.
    const modulePath = "./catalog-wiring";
    const loaded = (await import(/* @vite-ignore */ modulePath)) as {
      catalogWiring: (args: unknown) => Record<string, unknown>;
    };
    const { args } = harness({ progress: { "u01-water": ["intro", "S1"] } });

    const wiring = loaded.catalogWiring(args);

    for (const name of [
      "onStartCatalogCover",
      "onExitCatalogCover",
      "onCompleteCatalogCover",
      "onStartCatalogUnit",
      "onExitCatalogSession",
      "onFinishCatalogActivity",
      "onFinishCatalogFinal",
      "onExitCatalogUnitComplete",
      "onLeaveCatalogEpilogue",
    ]) {
      expect([name, typeof wiring[name]]).toEqual([name, "function"]);
    }
    expect(wiring["episodeContent"]).toBe(args.episodeContent);
    expect(wiring["catalogSections"]).toBe(args.catalogSections);
    expect(wiring["catalogProgress"]).toBe(args.catalogProgress);
  });
});
