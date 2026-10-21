import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { catalogCompletionKeysOf, catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import type { ContractProgressState } from "./test-helpers/progress-state-api";
import { emptyContractState as empty, progressApi } from "./test-helpers/progress-state-api";
import { legacyPassedRecord, tutorialDoneProgress } from "./test-helpers/progress-seed";

// `unit` 계층: 트로피 수와 에피소드 설문 후보 — 옛 튜토리얼 통과 기록과 u00 완료를 어떻게 세는가.

const catalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const sections = catalogMapSectionsOf(catalog);
const completionKeysOf = catalogCompletionKeysOf(sections);

const legacyOnly: ContractProgressState = {
  legacyTutorial: legacyPassedRecord,
  catalogProgress: {},
};
const u00Done = tutorialDoneProgress();
const u01Done = { "u01-water": [...completionKeysOf("u01-water")] };

describe("트로피", () => {
  const { trophyCountFrom } = progressApi;

  test("SV1. 옛 통과는 1, 옛 통과 + u00 완료도 1, u00 · u01 완료는 2, 옛 통과 + u01 완료는 2다", () => {
    expect(trophyCountFrom(empty, completionKeysOf)).toBe(0);
    expect(trophyCountFrom(legacyOnly, completionKeysOf)).toBe(1);
    expect(trophyCountFrom({ ...legacyOnly, catalogProgress: u00Done }, completionKeysOf)).toBe(1);
    expect(
      trophyCountFrom({ ...empty, catalogProgress: { ...u00Done, ...u01Done } }, completionKeysOf),
    ).toBe(2);
    expect(trophyCountFrom({ ...legacyOnly, catalogProgress: u01Done }, completionKeysOf)).toBe(2);
  });
});

describe("에피소드 설문 후보", () => {
  const { completedSurveyEpisodesFrom } = progressApi;

  test("SV2. u00을 끝내면 Tutorial 하나, u01만 끝내면 없고, u00 구획이 준비 안 됐으면 없다", () => {
    expect(completedSurveyEpisodesFrom(sections, u00Done)).toEqual([
      { id: TUTORIAL_EPISODE_ID, title: "Tutorial" },
    ]);
    expect(completedSurveyEpisodesFrom(sections, u01Done)).toEqual([]);
    expect(completedSurveyEpisodesFrom(sections, {})).toEqual([]);
    const withoutU00 = sections.filter((section) => section.episodeId !== TUTORIAL_EPISODE_ID);
    expect(completedSurveyEpisodesFrom(withoutU00, u00Done)).toEqual([]);
    const notReady = sections.map((section) =>
      section.episodeId === TUTORIAL_EPISODE_ID
        ? ({
            kind: "catalog-unavailable",
            episodeId: section.episodeId,
            ordinal: section.ordinal,
            title: section.title,
            reason: "pending",
          } as const)
        : section,
    );
    expect(completedSurveyEpisodesFrom(notReady, u00Done)).toEqual([]);
  });
});
