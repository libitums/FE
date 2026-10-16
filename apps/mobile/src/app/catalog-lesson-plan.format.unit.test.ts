import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { catalogLessonPlanOf } from "./catalog-lesson-plan";
import type { CatalogFill } from "./catalog-lesson-plan";

// `unit` 계층: 새 내장본(2026-10-15.1)의 모든 단계를 수업 계획으로 바꾼 결과의 수만 봅니다(순수 함수).

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;
type EpisodeId = "u01-water" | "u02-checkin" | "u03-mina";

const catalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const fill: CatalogFill = (text, script) => fillPlaceholders(text, {}, script);
const imageUrlOf = (path: string): string => `https://cdn/${path}`;

function readyOf(episodeId: string): ReadyEntry {
  const entry = catalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready")
    throw new Error(`${episodeId} 가 ready가 아닙니다`);
  return entry;
}

const EPISODE_IDS: readonly EpisodeId[] = ["u01-water", "u02-checkin", "u03-mina"];
const STEP_KEYS = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT"] as const;

/** 단계별 [표시 문항 수, 전체 문항 수] — 구현이 낸 값으로 고정한 표입니다. */
const EXPECTED: Record<EpisodeId, readonly (readonly [number, number])[]> = {
  "u01-water": [
    [13, 15],
    [8, 14],
    [9, 13],
    [8, 15],
    [6, 12],
    [7, 8],
    [5, 5],
    [8, 13],
    [0, 6],
  ],
  "u02-checkin": [
    [16, 19],
    [11, 17],
    [13, 19],
    [11, 20],
    [6, 12],
    [11, 13],
    [7, 7],
    [10, 15],
    [0, 6],
  ],
  "u03-mina": [
    [12, 14],
    [6, 12],
    [12, 16],
    [10, 18],
    [7, 12],
    [10, 12],
    [7, 7],
    [11, 16],
    [0, 6],
  ],
};

function planOf(episodeId: string, unitKey: string) {
  const plan = catalogLessonPlanOf(readyOf(episodeId), unitKey, fill, imageUrlOf);
  if (plan === null) throw new Error(`${episodeId}/${unitKey} 계획이 없습니다`);
  return plan;
}

describe("새 내장본의 단계별 수업 계획 (MAP11)", () => {
  test.each(EPISODE_IDS)("MAP11. %s의 단계 구성은 S1 ~ S8 · CULT이다", (episodeId) => {
    expect(readyOf(episodeId).episode.units.map((unit) => unit.id)).toEqual([...STEP_KEYS]);
  });

  test.each(EPISODE_IDS)(
    "MAP11. %s는 단계마다 표시 + 건너뜀 = 문항 수이고 채점 수는 표시 수 이하다",
    (episodeId) => {
      const entry = readyOf(episodeId);
      for (const unit of entry.episode.units) {
        const plan = planOf(episodeId, unit.id);
        expect(plan.shownItemCount + plan.skippedItemCount).toBe(unit.items.length);
        expect(plan.questionCount).toBeLessThanOrEqual(plan.shownItemCount);
      }
    },
  );

  test("MAP11. 활동이 0개인 단계는 세 에피소드의 CULT 정확히 셋이고 건너뜀이 6이다", () => {
    const empty = EPISODE_IDS.flatMap((episodeId) =>
      readyOf(episodeId).episode.units.flatMap((unit) => {
        const plan = planOf(episodeId, unit.id);
        return plan.activities.length === 0
          ? [{ episodeId, key: unit.id, skipped: plan.skippedItemCount }]
          : [];
      }),
    );

    expect(empty).toEqual([
      { episodeId: "u01-water", key: "CULT", skipped: 6 },
      { episodeId: "u02-checkin", key: "CULT", skipped: 6 },
      { episodeId: "u03-mina", key: "CULT", skipped: 6 },
    ]);
  });

  test.each(EPISODE_IDS)(
    "MAP11. %s의 그 밖 단계는 활동이 하나 이상이고 표시 문항이 있다",
    (episodeId) => {
      for (const key of STEP_KEYS.filter((candidate) => candidate !== "CULT")) {
        const plan = planOf(episodeId, key);
        expect(plan.activities.length).toBeGreaterThanOrEqual(1);
        expect(plan.shownItemCount).toBeGreaterThanOrEqual(1);
      }
    },
  );

  test.each(EPISODE_IDS)("MAP11. %s의 단계별 [표시, 전체] 수가 표와 같다", (episodeId) => {
    const actual = STEP_KEYS.map((key) => {
      const plan = planOf(episodeId, key);
      return [plan.shownItemCount, plan.shownItemCount + plan.skippedItemCount];
    });

    expect(actual).toEqual(EXPECTED[episodeId].map(([shown, total]) => [shown, total]));
  });

  test("MAP11. 같은 단계를 두 번 계획해도 활동 수가 같다(결정성)", () => {
    const first = planOf("u01-water", "S2");
    const second = planOf("u01-water", "S2");

    expect(second.activities).toEqual(first.activities);
    expect(second.shownItemCount).toBe(first.shownItemCount);
  });
});
