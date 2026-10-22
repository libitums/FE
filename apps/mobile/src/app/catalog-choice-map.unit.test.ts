import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { LearningItem } from "../lib/episode-content.model";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { catalogGlossOf } from "./catalog-card-map";
import { listeningItemOf } from "./catalog-choice-map";
import type { CatalogFill, CatalogLessonItemPort } from "./catalog-lesson-types";

// `unit` 계층: 튜토리얼(u00) S2 듣기 문항의 매핑 — 학습 문항의 소리는 콘텐츠에 `audio_url`이 있어도 아직 연결되지 않았다.

const catalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const fill: CatalogFill = (text, script) => fillPlaceholders(text, {}, script);

function u00(): Extract<CatalogEntry, { status: "ready" }> {
  const entry = catalog.find((candidate) => candidate.id === TUTORIAL_EPISODE_ID);
  if (entry === undefined || entry.status !== "ready") throw new Error("u00 is not ready");
  return entry;
}

describe("listeningItemOf — u00 S2", () => {
  test("AU2. u00 S2 듣기 문항은 소리 주소가 풀리지 않아도 건너뛰지 않고 audio null 듣기 문항으로 선다", () => {
    const entry = u00();
    const port: CatalogLessonItemPort = {
      fill,
      episodeId: TUTORIAL_EPISODE_ID,
      glossOf: catalogGlossOf(entry.episode.words, fill),
      imageUrlOf: (path) => `https://cdn/${path}`,
      audioUrlOf: () => null,
    };
    const item = entry.episode.units
      .find((unit) => unit.id === "S2")
      ?.items.find(
        (candidate): candidate is Extract<LearningItem, { type: "LISTEN_SELECT" }> =>
          candidate.type === "LISTEN_SELECT",
      );
    expect(item).toBeDefined();
    if (item === undefined) return;
    expect(item.stimulus.audioUrl).toMatch(/^u00-tutorial\//);

    const mapped = listeningItemOf(item, port);
    expect(mapped).toMatchObject({ kind: "listening", itemId: item.id });
    if (mapped.kind !== "listening") return;
    expect(mapped.question.audio).toBeNull();
  });
});
