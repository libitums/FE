import { describe, expect, test } from "vitest";

import type { CatalogMapSection, CatalogReadySection } from "./catalog-map.contract";
import {
  catalogOpenedUnitOf,
  catalogSectionTitle,
  catalogSheetFigures,
  catalogSheetKey,
  catalogSheetTargetOf,
  catalogSheetUnitSize,
} from "./catalog-sheet";

// `unit` 계층: 카탈로그 유닛 말풍선의 키 · 띠 값 · 진행 수치입니다.

const section: CatalogReadySection = {
  kind: "catalog-ready",
  episodeId: "u01-water",
  ordinal: 1,
  title: "물 사기",
  lessonKeys: ["S1", "S2", "CULT"],
  finalKey: "RP",
  completionKeys: ["RP"],
  cultureKeys: ["CULT"],
};
const sections: readonly CatalogMapSection[] = [section];

describe("catalogSheetKey · catalogSheetTargetOf", () => {
  test("CSK1. 키는 (에피소드, 유닛)으로 되돌아오고 튜토리얼 스텝 id · null · 빈 조각은 null이다", () => {
    expect(catalogSheetTargetOf(catalogSheetKey("u01-water", "S1"))).toEqual({
      episodeId: "u01-water",
      unitKey: "S1",
    });
    expect(catalogSheetTargetOf(catalogSheetKey("a:b", "RP"))).toEqual({
      episodeId: "a:b",
      unitKey: "RP",
    });
    expect(catalogSheetTargetOf("ordering")).toBeNull();
    expect(catalogSheetTargetOf(null)).toBeNull();
    expect(catalogSheetTargetOf("catalog:u01")).toBeNull();
    expect(catalogSheetTargetOf("catalog:u01:")).toBeNull();
  });
});

describe("catalogOpenedUnitOf", () => {
  test("CSO1. 자리는 표지 00부터 세고, 진행은 표지 · 학습 · 최종 중 끝낸 수다", () => {
    const progress = { "u01-water": ["intro", "S1"] };

    expect(catalogOpenedUnitOf(sections, catalogSheetKey("u01-water", "S2"), progress)).toEqual({
      section,
      unit: 2,
      completedUnitCount: 2,
      totalUnitCount: 5,
    });
    expect(catalogOpenedUnitOf(sections, catalogSheetKey("u01-water", "RP"), {})?.unit).toBe(4);
  });

  test("CSO2. 튜토리얼 스텝 · 모르는 에피소드 · 모르는 유닛이면 undefined다", () => {
    expect(catalogOpenedUnitOf(sections, "ordering", {})).toBeUndefined();
    expect(catalogOpenedUnitOf(sections, catalogSheetKey("u09", "S1"), {})).toBeUndefined();
    expect(catalogOpenedUnitOf(sections, catalogSheetKey("u01-water", "S9"), {})).toBeUndefined();
  });
});

describe("catalogSheetFigures · catalogSectionTitle", () => {
  test("CSF1. 끝낸 유닛은 전부, 아니면 0이고, 셀 수 없는 값은 전체 0이다", () => {
    const target = { episodeId: "u01-water", unitKey: "S1" };

    expect(catalogSheetFigures(target, 16, { "u01-water": ["S1"] })).toEqual({
      completedActivityCount: 16,
      totalActivityCount: 16,
    });
    expect(catalogSheetFigures(target, 16, {})).toEqual({
      completedActivityCount: 0,
      totalActivityCount: 16,
    });
    for (const bad of [0, -1, 2.5, Number.NaN]) {
      expect(catalogSheetFigures(target, bad, { "u01-water": ["S1"] })).toEqual({
        completedActivityCount: 0,
        totalActivityCount: 0,
      });
    }
  });

  test("CSF2. 제목은 영어 제목이 먼저이고 없으면 매니페스트 제목이다", () => {
    expect(catalogSectionTitle(section)).toBe("물 사기");
    expect(catalogSectionTitle({ ...section, titleEn: "Buying Water" })).toBe("Buying Water");
  });
});

describe("catalogSheetUnitSize", () => {
  test("FS2. 최종은 스페셜 표식(124), 레슨 · 문화 · 모르는 유닛은 레슨 원(100)이다", () => {
    expect(catalogSheetUnitSize(sections, "u01-water", "RP")).toBe(124);
    expect(catalogSheetUnitSize(sections, "u01-water", "S1")).toBe(100);
    expect(catalogSheetUnitSize(sections, "u01-water", "CULT")).toBe(100);
    expect(catalogSheetUnitSize(sections, "u02-none", "RP")).toBe(100);
  });
});
