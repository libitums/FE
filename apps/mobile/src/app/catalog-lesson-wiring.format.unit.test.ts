import type { SetStateAction } from "@lynx-js/react";
import { describe, expect, test } from "vitest";

import type { AnswerResult } from "../lib/answer-result";
import type { CatalogProgress } from "../lib/catalog-progress";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { noLearnerProfilePort } from "../lib/learner-profile";
import { fillPlaceholders } from "../lib/placeholder-fill";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import { noLearnerProfile } from "./catalog-cover-wiring";
import { newCatalogFinishGuard } from "./catalog-finish-guard";
import { catalogLessonPlanOf } from "./catalog-lesson-plan";
import { catalogLessonWiring } from "./catalog-lesson-wiring";
import type { CatalogLessonWiringArgs } from "./catalog-lesson-wiring";
import type { NavAction } from "./nav-state";

// `unit` 계층: 새 내장본에서 문화 단계(CULT)의 결선(시작 → 카드 활동 → 확인 활동 → 판정 · 기록 · 결과 화면)만 봅니다.

const catalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});

type Entry =
  | { readonly kind: "progress"; readonly value: CatalogProgress }
  | { readonly kind: "dispatch"; readonly value: NavAction }
  | { readonly kind: "event"; readonly value: EpisodeIntroEvent };

function resolveAction<T>(action: SetStateAction<T>, previous: T): T {
  return typeof action === "function" ? (action as (value: T) => T)(previous) : action;
}

const throughS8: CatalogProgress = {
  "u01-water": ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"],
};

function wiringOf(progress: CatalogProgress, pendingResults: readonly AnswerResult[] = []) {
  const log: Entry[] = [];
  const updaters: ((value: CatalogProgress) => CatalogProgress)[] = [];
  const args: CatalogLessonWiringArgs = {
    episodeContent: {
      catalog,
      imageUrlOf: (path) => `https://cdn/${path}`,
      fillText: fillPlaceholders,
      audioTimingOf: () => null,
    },
    catalogSections: catalogMapSectionsOf(catalog),
    catalogProgress: progress,
    learnerFill: noLearnerProfile,
    learnerRecord: null,
    learnerSync: "none",
    learnerPort: noLearnerProfilePort,
    setCatalogProgress: (action) => {
      if (typeof action === "function") {
        updaters.push(action as (value: CatalogProgress) => CatalogProgress);
      }
      log.push({ kind: "progress", value: resolveAction(action, progress) });
    },
    completedEpisodeFinalIds: [],
    dispatch: (action) => void log.push({ kind: "dispatch", value: action }),
    episodeIntroEventSink: (event) => void log.push({ kind: "event", value: event }),
    pendingResults,
    setPendingResults: () => undefined,
    pendingSkippedCount: 0,
    setPendingSkippedCount: () => undefined,
    finishGuard: newCatalogFinishGuard(),
  };
  return { wiring: catalogLessonWiring(args), log, updaters };
}

function start(unitKey: string, progress: CatalogProgress) {
  const { wiring, log, updaters } = wiringOf(progress);
  wiring.onStartCatalogUnit("u01-water", unitKey);
  return { log, updaters };
}

const eventsOf = (log: readonly Entry[]) =>
  log.flatMap((entry) => (entry.kind === "event" ? [entry.value] : []));
const dispatchesOf = (log: readonly Entry[]) =>
  log.flatMap((entry) => (entry.kind === "dispatch" ? [entry.value] : []));

const correct: AnswerResult = "correct";
const incorrect: AnswerResult = "incorrect";

describe("CULT 단계 시작 (LWF)", () => {
  test("LWF1′. 시작 이벤트 하나(문항 3 · 표시 6 · 건너뜀 0)만 나가고 끝 이벤트는 없다", () => {
    const { log } = start("CULT", throughS8);

    expect(eventsOf(log)).toEqual([
      {
        name: "episode_lesson_started",
        episodeId: "u01-water",
        unitKey: "CULT",
        unitRole: "lesson",
        questionCount: "3",
        shownItemCount: "6",
        skippedItemCount: "0",
      },
    ]);
  });

  test("LWF1′. 첫 활동 화면(catalog-lesson)을 쌓고 아직 풀지 않았으니 진행에 CULT를 더하지 않는다", () => {
    const { log, updaters } = start("CULT", throughS8);

    expect(updaters).toHaveLength(0);
    expect(log.some((entry) => entry.kind === "progress")).toBe(false);
    expect(dispatchesOf(log)).toEqual([
      {
        type: "push",
        screen: {
          name: "catalog-lesson",
          episodeId: "u01-water",
          unitKey: "CULT",
          activityIndex: 0,
        },
      },
    ]);
  });

  test("LWF1. S8을 끝내지 않았으면 CULT는 잠겨 있어 아무 일도 하지 않는다", () => {
    const { log } = start("CULT", { "u01-water": ["intro", "S1", "S2"] });

    expect(log).toEqual([]);
  });

  test("LWF2. 카드 활동이 빈 결과로 끝나면 이벤트 없이 확인 활동(순번 1)으로 갈아탄다", () => {
    const { wiring, log, updaters } = wiringOf(throughS8);

    wiring.onFinishCatalogActivity("u01-water", "CULT", 0, [], 0);

    expect(eventsOf(log)).toEqual([]);
    expect(updaters).toHaveLength(0);
    expect(dispatchesOf(log)).toEqual([
      {
        type: "replace",
        screen: {
          name: "catalog-lesson",
          episodeId: "u01-water",
          unitKey: "CULT",
          activityIndex: 1,
        },
      },
    ]);
  });

  test("LWF2. 확인 셋 중 둘을 맞히면 통과 이벤트 · CULT 기록 · 결과 화면(결과 셋 · 문항 3)이다", () => {
    const { wiring, log, updaters } = wiringOf(throughS8);

    wiring.onFinishCatalogActivity("u01-water", "CULT", 1, [correct, correct, incorrect], 0);

    expect(eventsOf(log)).toEqual([
      {
        name: "episode_lesson_finished",
        episodeId: "u01-water",
        unitKey: "CULT",
        unitRole: "lesson",
        verdict: "passed",
        correctCount: "2",
        questionCount: "3",
        skippedCount: "0",
      },
    ]);
    expect(updaters).toHaveLength(1);
    expect(updaters[0]?.(throughS8)).toEqual({
      "u01-water": [...(throughS8["u01-water"] ?? []), "CULT"],
    });
    expect(dispatchesOf(log)).toEqual([
      {
        type: "replace",
        screen: {
          name: "catalog-unit-complete",
          episodeId: "u01-water",
          unitKey: "CULT",
          results: [correct, correct, incorrect],
          skippedCount: 0,
          questionCount: 3,
        },
      },
    ]);
  });

  test("LWF2. 끝 이벤트가 기록보다 먼저, 결과 화면이 기록보다 나중이다", () => {
    const { wiring, log } = wiringOf(throughS8);
    wiring.onFinishCatalogActivity("u01-water", "CULT", 1, [correct, correct, correct], 0);
    const at = (pick: (entry: Entry) => boolean) => log.findIndex(pick);
    const finished = at((e) => e.kind === "event" && e.value.name === "episode_lesson_finished");
    const recorded = at((e) => e.kind === "progress");
    const pushed = at((e) => e.kind === "dispatch" && e.value.type === "replace");

    expect(finished).toBeGreaterThanOrEqual(0);
    expect(finished).toBeLessThan(recorded);
    expect(recorded).toBeLessThan(pushed);
  });

  test("LWF3. 확인 셋 중 하나만 맞히면 실패 이벤트이고 CULT를 기록하지 않는다", () => {
    const { wiring, log, updaters } = wiringOf(throughS8);

    wiring.onFinishCatalogActivity("u01-water", "CULT", 1, [correct, incorrect, incorrect], 0);

    expect(eventsOf(log)).toEqual([
      {
        name: "episode_lesson_finished",
        episodeId: "u01-water",
        unitKey: "CULT",
        unitRole: "lesson",
        verdict: "failed",
        correctCount: "1",
        questionCount: "3",
        skippedCount: "0",
      },
    ]);
    expect(updaters).toHaveLength(0);
    expect(log.some((entry) => entry.kind === "progress")).toBe(false);
    expect(dispatchesOf(log)).toEqual([
      expect.objectContaining({
        type: "replace",
        screen: expect.objectContaining({ name: "catalog-unit-complete", questionCount: 3 }),
      }),
    ]);
  });
});

const throughS4: CatalogProgress = { "u01-water": ["intro", "S1", "S2", "S3", "S4"] };
const throughS5U02: CatalogProgress = { "u02-checkin": ["intro", "S1", "S2", "S3", "S4", "S5"] };
const manyOf = (count: number, result: AnswerResult): AnswerResult[] =>
  Array.from({ length: count }, () => result);

describe("말하기 단계의 끝 (LWS)", () => {
  test("LWS1. u01 S5의 읽기를 끝내며 건너뜀 3을 내면 이벤트 · 결과 화면 · 기록이 건너뜀 3을 싣는다", () => {
    const { wiring, log, updaters } = wiringOf(throughS4, manyOf(6, correct));

    wiring.onFinishCatalogActivity("u01-water", "S5", 2, [], 3);

    expect(eventsOf(log)).toEqual([
      {
        name: "episode_lesson_finished",
        episodeId: "u01-water",
        unitKey: "S5",
        unitRole: "lesson",
        verdict: "passed",
        correctCount: "6",
        questionCount: "6",
        skippedCount: "3",
      },
    ]);
    expect(dispatchesOf(log)).toEqual([
      {
        type: "replace",
        screen: {
          name: "catalog-unit-complete",
          episodeId: "u01-water",
          unitKey: "S5",
          results: manyOf(6, correct),
          skippedCount: 3,
          questionCount: 6,
        },
      },
    ]);
    expect(updaters).toHaveLength(1);
    expect(updaters[0]?.(throughS4)).toEqual({
      "u01-water": [...(throughS4["u01-water"] ?? []), "S5"],
    });
  });

  describe("u02 S6 — 낱말을 건너뛰면 통과 분모에서 빠진다", () => {
    const lastActivityIndex = (): number => {
      const entry = catalog.find((candidate) => candidate.id === "u02-checkin");
      if (entry === undefined || entry.status !== "ready")
        throw new Error("u02가 ready가 아닙니다");
      const plan = catalogLessonPlanOf(
        entry,
        "S6",
        (text, script) => fillPlaceholders(text, {}, script),
        (path) => `https://cdn/${path}`,
      );
      if (plan === null) throw new Error("S6 계획이 없습니다");
      return plan.activities.length - 1;
    };

    test("LWS2. 채점 12 중 낱말을 건너뛰고 나머지 11에서 7을 맞히면 분모 11로 통과한다", () => {
      const { wiring, log, updaters } = wiringOf(throughS5U02);

      wiring.onFinishCatalogActivity(
        "u02-checkin",
        "S6",
        lastActivityIndex(),
        [...manyOf(7, correct), ...manyOf(4, incorrect)],
        1,
      );

      expect(eventsOf(log)).toEqual([
        {
          name: "episode_lesson_finished",
          episodeId: "u02-checkin",
          unitKey: "S6",
          unitRole: "lesson",
          verdict: "passed",
          correctCount: "7",
          questionCount: "12",
          skippedCount: "1",
        },
      ]);
      expect(dispatchesOf(log)).toEqual([
        expect.objectContaining({
          type: "replace",
          screen: expect.objectContaining({
            name: "catalog-unit-complete",
            skippedCount: 1,
            questionCount: 11,
          }),
        }),
      ]);
      expect(updaters).toHaveLength(1);
    });

    test("LWS2. 같은 정답 7에 낱말을 오답으로 판정하면 분모 12 · 기준 8로 실패하고 기록하지 않는다", () => {
      const { wiring, log, updaters } = wiringOf(throughS5U02);

      wiring.onFinishCatalogActivity(
        "u02-checkin",
        "S6",
        lastActivityIndex(),
        [...manyOf(7, correct), ...manyOf(5, incorrect)],
        0,
      );

      expect(eventsOf(log)).toEqual([
        expect.objectContaining({ verdict: "failed", questionCount: "12", skippedCount: "0" }),
      ]);
      expect(dispatchesOf(log)).toEqual([
        expect.objectContaining({
          screen: expect.objectContaining({ skippedCount: 0, questionCount: 12 }),
        }),
      ]);
      expect(updaters).toHaveLength(0);
    });
  });
});
