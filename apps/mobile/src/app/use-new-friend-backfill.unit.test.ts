import { describe, expect, test } from "vitest";

import type { CatalogProgress } from "../lib/catalog-progress";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { episodesWithClearedInterlude } from "./use-new-friend-backfill";

// `unit` 계층(MC2-U28): 이미 끝낸 막간이 있는 에피소드를 구획 순서대로 고른다 — 준비 안 된 구획 · 막간 없는 구획은 뺀다.

const ready = (episodeId: string, storyKeys?: readonly string[]): CatalogMapSection =>
  ({
    kind: "catalog-ready",
    episodeId,
    ...(storyKeys === undefined ? {} : { storyKeys }),
  }) as unknown as CatalogMapSection;

const progressOf = (units: Record<string, readonly string[]>): CatalogProgress =>
  Object.fromEntries(
    Object.entries(units).map(([episodeId, done]) => [episodeId, [...done]]),
  ) as unknown as CatalogProgress;

describe("episodesWithClearedInterlude (MC2-U28)", () => {
  test("막간을 끝낸 에피소드만 고른다", () => {
    const sections = [ready("u02-checkin", ["INT"]), ready("u03-mina", ["INT"])];
    const progress = progressOf({ "u02-checkin": ["S1"], "u03-mina": ["S4", "INT"] });
    expect(episodesWithClearedInterlude(sections, progress)).toEqual(["u03-mina"]);
  });

  test("막간이 없는 구획 · 준비 안 된 구획은 뺀다", () => {
    const pending = { kind: "catalog-pending", episodeId: "u04" } as unknown as CatalogMapSection;
    const sections = [ready("u00-tutorial"), pending];
    const progress = progressOf({ "u00-tutorial": ["intro"], u04: ["INT"] });
    expect(episodesWithClearedInterlude(sections, progress)).toEqual([]);
  });
});
