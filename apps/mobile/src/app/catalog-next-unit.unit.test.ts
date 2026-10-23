import { describe, expect, test, vi } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import { catalogNextUnitOf, catalogResultNextOf } from "./catalog-next-unit";

// `unit` 계층: 결과 화면 「다음 학습」의 유닛 — 사슬의 바로 다음, 마지막 레슨 다음은 최종, 최종 다음은 없음.

const sections = catalogMapSectionsOf(
  buildEpisodeCatalog({ bundled: bundledCatalogInput, cache: { manifest: null, episodes: {} } }),
);
const u01 = sections.find((section) => section.episodeId === "u01-water");
const lessons = u01?.kind === "catalog-ready" ? u01.lessonKeys : [];
const finalKey = u01?.kind === "catalog-ready" ? u01.finalKey : "";

describe("catalogNextUnitOf", () => {
  test("NX1. 레슨 다음은 사슬의 바로 다음 레슨이다", () => {
    expect(catalogNextUnitOf(sections, "u01-water", lessons[0] ?? "")).toEqual({
      unitKey: lessons[1],
      kind: "lesson",
    });
  });

  test("NX1. 마지막 레슨 다음은 최종 테스트이고, 최종 다음은 없다", () => {
    expect(catalogNextUnitOf(sections, "u01-water", lessons[lessons.length - 1] ?? "")).toEqual({
      unitKey: finalKey,
      kind: "final",
    });
    expect(catalogNextUnitOf(sections, "u01-water", finalKey)).toBeNull();
  });

  test("NX1. 모르는 에피소드 · 모르는 유닛은 없다", () => {
    expect(catalogNextUnitOf(sections, "nope", "S1")).toBeNull();
    expect(catalogNextUnitOf(sections, "u01-water", "nope")).toBeNull();
  });
});

describe("catalogResultNextOf", () => {
  const second = lessons[1] ?? "";

  test("NX2. 다음 유닛의 티켓 수는 맵과 같은 규칙이고, 시작은 출처 result로 연다", () => {
    const onStartCatalogUnit = vi.fn<(e: string, u: string, s?: "result") => void>();
    const input = { catalogSections: sections, catalogProgress: {}, onStartCatalogUnit };
    const fresh = catalogResultNextOf(input, "u01-water", lessons[0] ?? "");
    expect(fresh.next?.ticketCost).toBe(1);
    fresh.next?.onStart();
    expect(onStartCatalogUnit).toHaveBeenCalledWith("u01-water", second, "result");

    const opened = catalogResultNextOf(
      { ...input, catalogTicketUnits: { "u01-water": [second] } },
      "u01-water",
      lessons[0] ?? "",
    );
    expect(opened.next?.ticketCost).toBe(0);
  });

  test("NX2. 최종 테스트 결과에는 다음이 없다", () => {
    const input = { catalogSections: sections, catalogProgress: {}, onStartCatalogUnit: vi.fn() };
    expect(catalogResultNextOf(input, "u01-water", finalKey)).toEqual({});
  });
});
