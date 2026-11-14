import { describe, expect, test } from "vitest";

import type { CatalogProgress } from "../lib/catalog-progress";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { completedEpisodes } from "./use-new-friend-backfill";

// `unit` 계층(MC2-U28 · CU-U3): 이미 끝낸(완료 조건 전부) 에피소드를 구획 순서대로 고른다 — 준비 안 된 구획은 뺀다
// (해금 JSON, ADR-0141 — 전에는 막간을 끝낸 에피소드).

const ready = (episodeId: string, completionKeys: readonly string[] = ["RP"]): CatalogMapSection =>
  ({ kind: "catalog-ready", episodeId, completionKeys }) as unknown as CatalogMapSection;

const progressOf = (units: Record<string, readonly string[]>): CatalogProgress =>
  Object.fromEntries(
    Object.entries(units).map(([episodeId, done]) => [episodeId, [...done]]),
  ) as unknown as CatalogProgress;

describe("completedEpisodes (CU-U3)", () => {
  test("완료 조건을 모두 끝낸 에피소드만 — 막간만 끝낸 에피소드는 아니다", () => {
    const keys = ["S1", "INT", "RP"];
    const sections = [ready("u01-water", keys), ready("u03-mina", keys)];
    const progress = progressOf({ "u01-water": ["S1", "INT", "RP"], "u03-mina": ["S1", "INT"] });
    expect(completedEpisodes(sections, progress)).toEqual(["u01-water"]);
  });

  test("준비 안 된 구획은 뺀다", () => {
    const pending = { kind: "catalog-pending", episodeId: "u04" } as unknown as CatalogMapSection;
    expect(completedEpisodes([pending], progressOf({ u04: ["RP"] }))).toEqual([]);
  });
});
