import { noLearnerProfilePort } from "../lib/learner-profile";
import { noLearnerProfile } from "./catalog-cover-wiring";
import type { SetStateAction } from "@lynx-js/react";
import { describe, expect, test } from "vitest";

import type { AnswerResult } from "../lib/answer-result";
import type { CatalogProgress } from "../lib/catalog-progress";
import { legacyCatalogInput } from "../lib/episode-legacy.test-support";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { fillPlaceholders } from "../lib/placeholder-fill";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import { catalogLessonWiring } from "./catalog-lesson-wiring";
import { newCatalogFinishGuard } from "./catalog-finish-guard";
import type { NavAction } from "./nav-state";

// `unit` 계층: 같은 활동 · 같은 최종 테스트의 finish가 두 번 와도 결과가 한 번만 올라가는지만 봅니다.
// 두 번째 호출은 첫 호출이 낳은 상태가 아직 렌더되지 않은 같은 결선(낡은 pendingResults)으로 옵니다.

const catalog = buildEpisodeCatalog({
  bundled: legacyCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const correct: AnswerResult = "correct";
const many = (count: number): AnswerResult[] => Array.from({ length: count }, () => correct);
const allLessonsDone: CatalogProgress = {
  "u01-water": ["intro", "S1", "S3", "S4", "S5", "S6", "S7", "S8", "S9"],
};

function setup(progress: CatalogProgress, pending: readonly AnswerResult[] = []) {
  const events: EpisodeIntroEvent[] = [];
  const dispatches: NavAction[] = [];
  const progressWrites: unknown[] = [];
  const guard = newCatalogFinishGuard();
  const make = (pendingResults: readonly AnswerResult[]) =>
    catalogLessonWiring({
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
      setCatalogProgress: (action: SetStateAction<CatalogProgress>) =>
        void progressWrites.push(action),
      dispatch: (action) => void dispatches.push(action),
      episodeIntroEventSink: (event) => void events.push(event),
      pendingResults,
      setPendingResults: () => undefined,
      pendingSkippedCount: 0,
      setPendingSkippedCount: () => undefined,
      finishGuard: guard,
      setListenPace: () => {},
    });
  return { wiring: make(pending), make, events, dispatches, progressWrites };
}

const names = (events: readonly EpisodeIntroEvent[]) => events.map((event) => event.name);
const targets = (dispatches: readonly NavAction[]) =>
  dispatches.map((action) => (action.type === "replace" ? action.screen.name : action.type));

describe("결선의 끝낸 활동 가드", () => {
  test("G1. 마지막 활동의 같은 finish 두 번은 이벤트 · 기록 · 결과 화면이 한 번이고 판정은 첫 호출 기준이다", () => {
    const { wiring, events, dispatches, progressWrites } = setup(
      { "u01-water": ["intro", "S1"] },
      many(5),
    );

    wiring.onFinishCatalogActivity("u01-water", "S3", 4, [correct], 0);
    wiring.onFinishCatalogActivity("u01-water", "S3", 4, [], 0);

    expect(names(events)).toEqual(["episode_lesson_finished"]);
    expect(events[0]).toMatchObject({ verdict: "passed", correctCount: "6" });
    expect(progressWrites).toHaveLength(1);
    expect(targets(dispatches)).toEqual(["catalog-unit-complete"]);
  });

  test("G2. 중간 활동의 같은 finish 두 번은 다음 활동으로 한 칸만 간다", () => {
    const { wiring, dispatches } = setup({ "u01-water": ["intro", "S1"] });

    wiring.onFinishCatalogActivity("u01-water", "S3", 0, [correct], 0);
    wiring.onFinishCatalogActivity("u01-water", "S3", 0, [correct], 0);

    expect(dispatches).toEqual([
      {
        type: "replace",
        screen: { name: "catalog-lesson", episodeId: "u01-water", unitKey: "S3", activityIndex: 1 },
      },
    ]);
  });

  test("G3. 다음 활동의 finish는 막히지 않는다(다른 activityIndex)", () => {
    const { wiring, make, events } = setup({ "u01-water": ["intro", "S1"] });

    wiring.onFinishCatalogActivity("u01-water", "S3", 0, many(5), 0);
    make(many(5)).onFinishCatalogActivity("u01-water", "S3", 4, [correct], 0);

    expect(names(events)).toEqual(["episode_lesson_finished"]);
  });

  test("G4. 최종 테스트 finish 두 번은 이벤트 · 기록 · 결과 화면이 한 번이다", () => {
    const { wiring, events, dispatches, progressWrites } = setup(allLessonsDone);

    wiring.onFinishCatalogFinal("u01-water", [correct, correct, correct]);
    wiring.onFinishCatalogFinal("u01-water", [correct, correct, correct]);

    expect(names(events)).toEqual(["episode_lesson_finished", "episode_final_passed"]);
    expect(progressWrites).toHaveLength(1);
    expect(targets(dispatches)).toEqual(["catalog-unit-complete"]);
  });

  test("G5. 같은 유닛을 다시 시작하면(재시도) 다시 끝낼 수 있다", () => {
    const { wiring, events } = setup({ "u01-water": ["intro", "S1"] });

    wiring.onFinishCatalogActivity("u01-water", "S3", 4, many(1), 0);
    wiring.onStartCatalogUnit("u01-water", "S3");
    wiring.onFinishCatalogActivity("u01-water", "S3", 4, many(1), 0);

    expect(names(events)).toEqual([
      "episode_lesson_finished",
      "episode_lesson_started",
      "episode_lesson_finished",
    ]);
  });

  test("G6. 나가기 · 결과 나가기 뒤에도 다시 끝낼 수 있다", () => {
    const { wiring, events } = setup(allLessonsDone);

    wiring.onFinishCatalogFinal("u01-water", [correct, correct, correct]);
    wiring.onExitCatalogSession();
    wiring.onFinishCatalogFinal("u01-water", [correct, correct, correct]);
    wiring.onExitCatalogUnitComplete("u01-water", "RP", "passed");
    wiring.onFinishCatalogFinal("u01-water", [correct, correct, correct]);

    expect(names(events).filter((name) => name === "episode_lesson_finished")).toHaveLength(3);
  });
});
