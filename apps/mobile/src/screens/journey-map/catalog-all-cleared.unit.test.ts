import { expect, test } from "vitest";

import { catalogAllCleared } from "./catalog-all-cleared";
import type { CatalogMapSection, CatalogReadySection } from "./catalog-map.contract";

// `unit` 계층: 모두 끝냄 판정(ADR-0095 D9).

const ready = (episodeId: string, ordinal: number): CatalogReadySection => ({
  kind: "catalog-ready",
  episodeId,
  ordinal,
  title: episodeId,
  lessonKeys: ["S1"],
  finalKey: "RP",
  completionKeys: ["S1", "RP"],
  cultureKeys: [],
});

test("AC1. 마지막 구획이 열린 편이고 그 편의 완료 키를 모두 끝냈으면 참이다", () => {
  const sections: CatalogMapSection[] = [ready("u01", 1), ready("u02", 2)];
  expect(catalogAllCleared(sections, { u02: ["S1", "RP"] })).toBe(true);
});

test("AC2. 마지막 편을 다 끝내지 않았거나 · 마지막이 준비 중 · 잠긴 구획이면 거짓이다", () => {
  expect(catalogAllCleared([ready("u01", 1), ready("u02", 2)], { u02: ["S1"] })).toBe(false);
  const pending: CatalogMapSection = {
    kind: "catalog-unavailable",
    episodeId: "u03",
    ordinal: 3,
    title: "u03",
    reason: "pending",
  };
  expect(catalogAllCleared([ready("u02", 2), pending], { u02: ["S1", "RP"] })).toBe(false);
});

test("AC3. 구획이 없으면 거짓이다", () => {
  expect(catalogAllCleared([], {})).toBe(false);
});
