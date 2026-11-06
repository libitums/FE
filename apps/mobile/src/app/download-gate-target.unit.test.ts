import { expect, test } from "vitest";

import type {
  CatalogMapSection,
  CatalogReadySection,
} from "../screens/journey-map/catalog-map.contract";
import { assetTargetOf, downloadSheetUnitOf } from "./download-gate-target";

// `unit` 계층: 받기 문지기의 대상(편 · 유닛)과 시트 제목에 쓸 유닛 라벨 계산입니다.

const ready: CatalogReadySection = {
  kind: "catalog-ready",
  episodeId: "u01-water",
  ordinal: 1,
  title: "물",
  lessonKeys: ["S1", "S2", "INT", "S3", "CULT"],
  finalKey: "RP",
  completionKeys: ["RP"],
  cultureKeys: ["CULT"],
  storyKeys: ["INT"],
};
const pending: CatalogMapSection = {
  kind: "catalog-unavailable",
  episodeId: "u02-later",
  ordinal: 2,
  title: "나중",
  reason: "pending",
};
const sections: readonly CatalogMapSection[] = [ready, pending];

test("[U-GT1] downloadSheetUnitOf — 레슨은 이야기를 건너뛴 번호, CULT는 culture, INT는 story, RP는 final, 모르는 키 · 준비 중 구획은 lesson 0이다", () => {
  expect(downloadSheetUnitOf(sections, "u01-water", "S1")).toEqual({ role: "lesson", ordinal: 1 });
  expect(downloadSheetUnitOf(sections, "u01-water", "S3")).toEqual({ role: "lesson", ordinal: 3 });
  expect(downloadSheetUnitOf(sections, "u01-water", "CULT").role).toBe("culture");
  expect(downloadSheetUnitOf(sections, "u01-water", "INT").role).toBe("story");
  expect(downloadSheetUnitOf(sections, "u01-water", "RP").role).toBe("final");
  expect(downloadSheetUnitOf(sections, "u01-water", "S99")).toEqual({ role: "lesson", ordinal: 0 });
  expect(downloadSheetUnitOf(sections, "u02-later", "S1")).toEqual({ role: "lesson", ordinal: 0 });
  expect(downloadSheetUnitOf(sections, "u-none", "S1")).toEqual({ role: "lesson", ordinal: 0 });
});

test("[U-GT1] assetTargetOf — 편은 episode, 유닛은 unitKey를 실은 unit이다", () => {
  expect(assetTargetOf({ kind: "episode", episodeId: "u01-water" })).toEqual({ kind: "episode" });
  expect(assetTargetOf({ kind: "unit", episodeId: "u01-water", unitKey: "S3" })).toEqual({
    kind: "unit",
    unitKey: "S3",
  });
});
