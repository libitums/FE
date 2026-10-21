import { describe, expect, test, vi } from "vitest";

import type { AnswerResult } from "../lib/answer-result";
import type { CatalogProgress } from "../lib/catalog-progress";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { legacyCatalogInput } from "../lib/episode-legacy.test-support";
import { noLearnerProfilePort } from "../lib/learner-profile";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import { noLearnerProfile } from "./catalog-cover-wiring";
import { newCatalogFinishGuard } from "./catalog-finish-guard";
import { catalogLessonWiring } from "./catalog-lesson-wiring";

// `unit` 계층: 「천천히」 상태가 세션을 비우는 자리(시작 · 나가기 · 마지막 활동 끝)에서만 되돌아가는지 봅니다.

const catalog = buildEpisodeCatalog({
  bundled: legacyCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const correct: AnswerResult = "correct";
const allLessonsDone: CatalogProgress = {
  "u01-water": ["intro", "S1", "S3", "S4", "S5", "S6", "S7", "S8", "S9"],
};

function harness(progress: CatalogProgress, pendingResults: readonly AnswerResult[] = []) {
  const setListenPace = vi.fn<(action: unknown) => void>();
  const content = {
    catalog,
    imageUrlOf: (path: string) => `https://cdn/${path}`,
    audioUrlOf: () => null,
    fillText: fillPlaceholders,
    audioTimingOf: () => null,
  };
  const args = {
    episodeContent: content,
    catalogSections: catalogMapSectionsOf(catalog),
    catalogProgress: progress,
    learnerFill: noLearnerProfile,
    learnerRecord: null,
    learnerSync: "none" as const,
    learnerPort: noLearnerProfilePort,
    setCatalogProgress: () => {},
    dispatch: () => {},
    episodeIntroEventSink: null,
    pendingResults,
    setPendingResults: () => {},
    pendingSkippedCount: 0,
    setPendingSkippedCount: () => {},
    finishGuard: newCatalogFinishGuard(),
    setListenPace,
  };
  return { wiring: catalogLessonWiring(args), setListenPace };
}

describe("catalogLessonWiring — 「천천히」 되돌리기", () => {
  test("LW5. 레슨을 시작하면 normal로 되돌린다", () => {
    const { wiring, setListenPace } = harness({ "u01-water": ["intro", "S1"] });

    wiring.onStartCatalogUnit("u01-water", "S3");

    expect(setListenPace).toHaveBeenCalledWith("normal");
  });

  test("LW5. 최종 테스트를 시작해도 normal로 되돌린다", () => {
    const { wiring, setListenPace } = harness(allLessonsDone);

    wiring.onStartCatalogUnit("u01-water", "RP");

    expect(setListenPace).toHaveBeenCalledWith("normal");
  });

  test("LW5. 열리지 않는 레슨은 상태를 건드리지 않는다", () => {
    const { wiring, setListenPace } = harness({ "u01-water": ["intro"] });

    wiring.onStartCatalogUnit("u01-water", "S3");

    expect(setListenPace).not.toHaveBeenCalled();
  });

  test("LW5. 중도 나가기는 normal로 되돌린다", () => {
    const { wiring, setListenPace } = harness({ "u01-water": ["intro", "S1"] });

    wiring.onExitCatalogSession();

    expect(setListenPace).toHaveBeenCalledWith("normal");
  });

  test("LW5. 마지막 활동이 끝나면 normal로 되돌린다", () => {
    const { wiring, setListenPace } = harness(
      { "u01-water": ["intro", "S1"] },
      Array.from({ length: 5 }, () => correct),
    );

    wiring.onFinishCatalogActivity("u01-water", "S3", 1, [correct], 1);

    expect(setListenPace).toHaveBeenCalledWith("normal");
  });

  test("LW5. 중간 활동이 끝나면 되돌리지 않는다 — 활동이 바뀌어도 속도가 이어진다", () => {
    const { wiring, setListenPace } = harness({ "u01-water": ["intro", "S1"] }, [correct]);

    wiring.onFinishCatalogActivity("u01-water", "S3", 0, [correct, correct, correct], 0);

    expect(setListenPace).not.toHaveBeenCalled();
  });
});
