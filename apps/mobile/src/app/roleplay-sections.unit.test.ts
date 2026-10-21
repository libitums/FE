import { expect, test } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import { noLearnerProfile } from "./catalog-cover-wiring";
import type { EpisodeContent } from "./episode-content";
import { roleplaySectionsOf } from "./roleplay-sections";
import { tutorialDoneProgress } from "./test-helpers/progress-seed";

// `unit` 계층: 롤플레이 탭의 구획은 본편 에피소드 몫이다 — 튜토리얼(u00)은 구획을 만들지 않는다.

const catalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const episodeContent: EpisodeContent = {
  catalog,
  imageUrlOf: (path) => `https://cdn/${path}`,
  fillText: fillPlaceholders,
  audioTimingOf: () => null,
};
const catalogSections = catalogMapSectionsOf(catalog);
const input = (catalogProgress: Record<string, readonly string[]>) => ({
  catalog: { episodeContent, catalogSections, catalogProgress },
  learnerFill: noLearnerProfile,
  episodeLabel: (ordinal: number) => `Episode ${String(ordinal)}.`,
});

test("[RS1] 실데이터 카탈로그 넷은 롤플레이 구획 셋(u01 ~ u03)이 되고 u00은 없다", () => {
  const result = roleplaySectionsOf(input({}));
  expect(catalogSections).toHaveLength(4);
  expect(result.map((section) => section.episodeId)).toEqual([
    "u01-water",
    "u02-checkin",
    "u03-mina",
  ]);
});

test("[RS1] u00을 끝냈어도 u00 구획은 없다", () => {
  const result = roleplaySectionsOf(input(tutorialDoneProgress()));
  expect(result.map((section) => section.episodeId)).not.toContain(TUTORIAL_EPISODE_ID);
  expect(result).toHaveLength(3);
});
