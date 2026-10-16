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
import { catalogLessonWiring } from "./catalog-lesson-wiring";
import type { CatalogLessonWiringArgs } from "./catalog-lesson-wiring";
import type { NavAction } from "./nav-state";

// `unit` 계층: 새 내장본에서 문항이 전부 건너뛰어지는 CULT 단계의 결선(시작 → 곧장 통과 기록 → 결과 화면)만 봅니다.

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

function start(unitKey: string, progress: CatalogProgress) {
  const log: Entry[] = [];
  const updaters: ((value: CatalogProgress) => CatalogProgress)[] = [];
  const pending: AnswerResult[] = [];
  const args: CatalogLessonWiringArgs = {
    episodeContent: {
      catalog,
      imageUrlOf: (path) => `https://cdn/${path}`,
      fillText: fillPlaceholders,
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
    pendingResults: pending,
    setPendingResults: () => undefined,
    pendingSkippedCount: 0,
    setPendingSkippedCount: () => undefined,
    finishGuard: newCatalogFinishGuard(),
  };
  catalogLessonWiring(args).onStartCatalogUnit("u01-water", unitKey);
  return { log, updaters };
}

const eventsOf = (log: readonly Entry[]) =>
  log.flatMap((entry) => (entry.kind === "event" ? [entry.value] : []));
const dispatchesOf = (log: readonly Entry[]) =>
  log.flatMap((entry) => (entry.kind === "dispatch" ? [entry.value] : []));

describe("CULT 단계 시작 (LWF)", () => {
  test("LWF1. 이벤트는 시작(문항 0 · 표시 0 · 건너뜀 6) → 끝(passed · 맞힘 0 · 문항 0) 순이다", () => {
    const { log } = start("CULT", throughS8);

    expect(eventsOf(log)).toEqual([
      {
        name: "episode_lesson_started",
        episodeId: "u01-water",
        unitKey: "CULT",
        unitRole: "lesson",
        questionCount: "0",
        shownItemCount: "0",
        skippedItemCount: "6",
      },
      {
        name: "episode_lesson_finished",
        episodeId: "u01-water",
        unitKey: "CULT",
        unitRole: "lesson",
        verdict: "passed",
        correctCount: "0",
        questionCount: "0",
      },
    ]);
  });

  test("LWF1. 진행에 CULT를 더하고 결과 화면(catalog-unit-complete)만 쌓는다 — 활동 화면은 쌓지 않는다", () => {
    const { log, updaters } = start("CULT", throughS8);

    expect(updaters).toHaveLength(1);
    expect(updaters[0]?.(throughS8)).toEqual({
      "u01-water": [...(throughS8["u01-water"] ?? []), "CULT"],
    });
    const pushed = dispatchesOf(log);
    expect(pushed).toHaveLength(1);
    expect(pushed[0]).toEqual(
      expect.objectContaining({
        type: "push",
        screen: expect.objectContaining({
          name: "catalog-unit-complete",
          episodeId: "u01-water",
          unitKey: "CULT",
          results: [],
          questionCount: 0,
        }),
      }),
    );
    expect(pushed.some((action) => JSON.stringify(action).includes("catalog-lesson"))).toBe(false);
  });

  test("LWF1. 끝 이벤트가 기록보다 먼저, 결과 화면이 기록보다 나중이다", () => {
    const { log } = start("CULT", throughS8);
    const at = (pick: (entry: Entry) => boolean) => log.findIndex(pick);
    const finished = at((e) => e.kind === "event" && e.value.name === "episode_lesson_finished");
    const recorded = at((e) => e.kind === "progress");
    const pushed = at((e) => e.kind === "dispatch" && e.value.type === "push");

    expect(finished).toBeGreaterThanOrEqual(0);
    expect(finished).toBeLessThan(recorded);
    expect(recorded).toBeLessThan(pushed);
  });

  test("LWF1. S8을 끝내지 않았으면 CULT는 잠겨 있어 아무 일도 하지 않는다", () => {
    const { log } = start("CULT", { "u01-water": ["intro", "S1", "S2"] });

    expect(log).toEqual([]);
  });
});
