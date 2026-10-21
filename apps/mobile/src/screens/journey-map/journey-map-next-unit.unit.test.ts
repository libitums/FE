import { describe, expect, test } from "vitest";

import { tutorialDoneProgress } from "../../app/test-helpers/progress-seed";
import type { CatalogProgress } from "../../lib/catalog-progress";
import { bundledCatalogInput } from "../../lib/episode-bundled";
import { buildEpisodeCatalog } from "../../lib/episode-catalog";
import { TUTORIAL_EPISODE_ID } from "../../lib/tutorial-episode";
import {
  catalogCoverStatus,
  catalogMapSectionsOf,
  catalogUnitDomId,
  catalogUnitNodesOf,
} from "./catalog-map";
import type {
  CatalogGate,
  CatalogMapSection,
  CatalogReadySection,
  CatalogUnavailableSection,
} from "./catalog-map.contract";
import {
  catalogUnitEntries as catalogUnitEntriesRaw,
  mapScrollTargetOf as mapScrollTargetOfRaw,
  nextMapScrollTarget,
} from "./journey-map-next-unit";
import type { MapScrollTarget, MapUnitEntry } from "./journey-map-next-unit";

// `unit` 계층: 「다음에 풀 유닛」 판정의 입출력만 봅니다. 맵은 카탈로그 구획만 있고, 첫 구획은 u00 튜토리얼입니다.

// 입력은 `{ catalogSections, gate }`, 문은 `{ legacyTutorialPassed, progress }`입니다.
type Input = { catalogSections: readonly CatalogMapSection[]; gate: ContractGate };
type ContractGate = { legacyTutorialPassed: boolean; progress: CatalogProgress };
const mapScrollTargetOf = mapScrollTargetOfRaw as unknown as (input: Input) => MapScrollTarget;
const catalogUnitEntries = catalogUnitEntriesRaw as unknown as (
  sections: readonly CatalogMapSection[],
  gate: ContractGate,
) => readonly MapUnitEntry[];

const sections = catalogMapSectionsOf(
  buildEpisodeCatalog({ bundled: bundledCatalogInput, cache: { manifest: null, episodes: {} } }),
);
const readyOf = (id: string): CatalogReadySection => {
  const found = sections.find((section) => section.episodeId === id);
  if (found?.kind !== "catalog-ready") throw new Error(`no ready section ${id}`);
  return found;
};
const u00 = () => readyOf(TUTORIAL_EPISODE_ID);
const u01 = () => readyOf("u01-water");
const allKeys = (section: CatalogReadySection) => [
  "intro",
  ...section.lessonKeys,
  section.finalKey,
];

const targetOf = (legacyTutorialPassed: boolean, progress: CatalogProgress) =>
  mapScrollTargetOf({ catalogSections: sections, gate: { legacyTutorialPassed, progress } });

const unit = (domId: string) => ({ kind: "unit", domId }) as const;
const top = { kind: "top" } as const;
const domOf = (episodeId: string, key: string) => catalogUnitDomId(episodeId, key);

describe("mapScrollTargetOf", () => {
  test("NU1. 신규(진행 0)는 첫 available이 u00 표지(자리 0)라 top이다", () => {
    expect(targetOf(false, {})).toEqual(top);
  });

  test("NU2. u00 표지를 끝내면 대상은 u00의 S1이다", () => {
    expect(targetOf(false, { [TUTORIAL_EPISODE_ID]: ["intro"] })).toEqual(
      unit(domOf(TUTORIAL_EPISODE_ID, "S1")),
    );
  });

  test("NU3. 옛 통과 · u00 진행 0이면 대상은 u01 표지다(u00 표지 · 레슨은 후보가 아니다)", () => {
    expect(targetOf(true, {})).toEqual(unit(domOf("u01-water", "intro")));
  });

  test("NU4. 옛 통과 · u01 표지 + S1을 끝내면 대상은 u01의 S2다", () => {
    expect(targetOf(true, { "u01-water": ["intro", "S1"] })).toEqual(
      unit(domOf("u01-water", "S2")),
    );
  });

  test("NU5. 옛 통과여도 u00을 끝냈으면 우회가 아니다 — 일반 규칙으로 u01 표지다", () => {
    expect(targetOf(true, tutorialDoneProgress())).toEqual(unit(domOf("u01-water", "intro")));
    expect(targetOf(false, tutorialDoneProgress())).toEqual(unit(domOf("u01-water", "intro")));
  });

  test("NU6. 열린 것이 없으면 마지막 completed다 — 맵 전체를 끝내면 마지막 구획의 최종이다", () => {
    const done: Record<string, readonly string[]> = {};
    for (const section of sections) {
      if (section.kind === "catalog-ready") done[section.episodeId] = allKeys(section);
    }
    const last = sections[sections.length - 1] as CatalogReadySection;
    expect(targetOf(true, done)).toEqual(unit(domOf(last.episodeId, last.finalKey)));
    expect(
      mapScrollTargetOf({
        catalogSections: [],
        gate: { legacyTutorialPassed: false, progress: {} },
      }),
    ).toEqual(top);
  });
});

describe("nextMapScrollTarget", () => {
  const entry = (domId: string, status: MapUnitEntry["status"]): MapUnitEntry => ({
    domId,
    status,
  });

  test("N11. 대상이 없거나 0번이면 top이다", () => {
    expect(nextMapScrollTarget([])).toEqual(top);
    expect(nextMapScrollTarget([entry("a", "available")])).toEqual(top);
    expect(nextMapScrollTarget([entry("a", "completed")])).toEqual(top);
    expect(nextMapScrollTarget([entry("a", "locked"), entry("b", "locked")])).toEqual(top);
  });

  test("N12. 첫 available, 없으면 마지막 completed를 고른다", () => {
    expect(
      nextMapScrollTarget([
        entry("a", "completed"),
        entry("b", "available"),
        entry("c", "available"),
      ]),
    ).toEqual(unit("b"));
    expect(
      nextMapScrollTarget([entry("a", "completed"), entry("b", "completed"), entry("c", "locked")]),
    ).toEqual(unit("b"));
    expect(
      nextMapScrollTarget([entry("a", "completed"), entry("b", "locked"), entry("c", "completed")]),
    ).toEqual(unit("c"));
  });
});

describe("catalogUnitEntries", () => {
  const unavailable = (id: string): CatalogUnavailableSection => ({
    kind: "catalog-unavailable",
    episodeId: id,
    ordinal: 9,
    title: id,
    reason: "pending",
  });

  test("N14. 표지 → 레슨 → 최종 순이고 unavailable은 0개이며 상태는 문 규칙과 같다", () => {
    const withPending: readonly CatalogMapSection[] = [u00(), u01(), unavailable("late")];
    const gate = { legacyTutorialPassed: false, progress: { [TUTORIAL_EPISODE_ID]: ["intro"] } };
    const entries = catalogUnitEntries(withPending, gate);

    const expected: MapUnitEntry[] = [];
    withPending.forEach((section, index) => {
      if (section.kind !== "catalog-ready") return;
      expected.push({
        domId: catalogUnitDomId(section.episodeId, "intro"),
        status: catalogCoverStatus(withPending, index, gate as unknown as CatalogGate),
      });
      for (const node of catalogUnitNodesOf(section, gate.progress)) {
        expected.push({
          domId: catalogUnitDomId(section.episodeId, node.key),
          status: node.status,
        });
      }
    });
    expect(entries).toEqual(expected);
    expect(entries).toHaveLength(1 + u00().lessonKeys.length + 1 + 1 + u01().lessonKeys.length + 1);
    expect(new Set(entries.map((e) => e.domId)).size).toBe(entries.length);
  });

  test("NU3. 옛 통과 · u00 미완료면 u00 구획 항목의 available은 locked로 나가고 u01 표지가 available이다", () => {
    const entries = catalogUnitEntries(sections, { legacyTutorialPassed: true, progress: {} });
    const statusOf = (key: string, episodeId = TUTORIAL_EPISODE_ID) =>
      entries.find((e) => e.domId === catalogUnitDomId(episodeId, key))?.status;
    expect(statusOf("intro")).toBe("locked");
    expect(statusOf("S1")).toBe("locked");
    expect(statusOf("intro", "u01-water")).toBe("available");
  });

  test("NU5. 완료 · 잠김은 우회에서도 그대로다", () => {
    const entries = catalogUnitEntries(sections, {
      legacyTutorialPassed: true,
      progress: { [TUTORIAL_EPISODE_ID]: ["intro", "S1"] },
    });
    const statusOf = (key: string) =>
      entries.find((e) => e.domId === catalogUnitDomId(TUTORIAL_EPISODE_ID, key))?.status;
    expect(statusOf("intro")).toBe("completed");
    expect(statusOf("S1")).toBe("completed");
    expect(statusOf("S2")).toBe("locked");
  });
});
