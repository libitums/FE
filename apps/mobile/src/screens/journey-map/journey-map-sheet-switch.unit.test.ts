import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../../lib/episode-bundled";
import { buildEpisodeCatalog } from "../../lib/episode-catalog";
import { TUTORIAL_EPISODE_ID } from "../../lib/tutorial-episode";
import { catalogMapSectionsOf, catalogUnitDomId } from "./catalog-map";
import { catalogSheetKey } from "./catalog-sheet";
import { sheetSwitchCandidates, sheetSwitchTargetAt } from "./journey-map-sheet-switch";
import type { MeasuredRect } from "./journey-map-scroll";

// `unit` 계층: 말풍선이 열린 동안 가림막을 누른 자리의 유닛 — 열린 유닛만, 지금 열린 유닛은 빼고, 상자 안이면 그 유닛.

const sections = catalogMapSectionsOf(
  buildEpisodeCatalog({ bundled: bundledCatalogInput, cache: { manifest: null, episodes: {} } }),
);
const rect = (top: number, left: number, size = 100): MeasuredRect => ({
  top,
  height: size,
  left,
  width: size,
  centerX: left + size / 2,
});

describe("sheetSwitchCandidates", () => {
  test("SW1. 열린 유닛만 내고 잠긴 유닛 · 지금 열린 유닛은 뺀다", () => {
    const progress = { [TUTORIAL_EPISODE_ID]: ["intro", "S1"] };
    const ids = sheetSwitchCandidates(sections, progress, "open", null).map((c) => c.id);
    expect(ids).toEqual([
      catalogSheetKey(TUTORIAL_EPISODE_ID, "S1"),
      catalogSheetKey(TUTORIAL_EPISODE_ID, "S2"),
    ]);
    const without = sheetSwitchCandidates(
      sections,
      progress,
      "open",
      catalogSheetKey(TUTORIAL_EPISODE_ID, "S1"),
    );
    expect(without.map((c) => c.unitKey)).toEqual(["S2"]);
    expect(without[0]?.domId).toBe(catalogUnitDomId(TUTORIAL_EPISODE_ID, "S2"));
  });

  test("SW1. 진행을 확인하는 동안(checking)은 아무 유닛도 내지 않는다", () => {
    const progress = { [TUTORIAL_EPISODE_ID]: ["intro", "S1"] };
    expect(sheetSwitchCandidates(sections, progress, "checking", null)).toEqual([]);
  });
});

describe("sheetSwitchTargetAt", () => {
  const candidates = sheetSwitchCandidates(
    sections,
    { [TUTORIAL_EPISODE_ID]: ["intro", "S1"] },
    "open",
    null,
  );

  test("SW2. 누른 자리를 품은 상자의 유닛을 내고, 어느 상자에도 없으면 null이다", () => {
    const rects = [rect(100, 40), rect(300, 200)];
    expect(sheetSwitchTargetAt(candidates, rects, 250, 350)?.unitKey).toBe("S2");
    expect(sheetSwitchTargetAt(candidates, rects, 60, 120)?.unitKey).toBe("S1");
    expect(sheetSwitchTargetAt(candidates, rects, 10, 10)).toBeNull();
  });

  test("SW2. 못 잰 상자 · 가로를 모르는 상자는 건너뛴다", () => {
    const noWidth: MeasuredRect = { top: 100, height: 100, left: null, width: null, centerX: null };
    expect(sheetSwitchTargetAt(candidates, [null, noWidth], 60, 120)).toBeNull();
  });
});
