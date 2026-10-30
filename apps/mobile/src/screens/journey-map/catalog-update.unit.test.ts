import { expect, test } from "vitest";

import type { CatalogMapSection, CatalogReadySection } from "./catalog-map.contract";
import { catalogFreshEpisodeIdsOf, catalogFreshUnitKeysOf } from "./catalog-update";

// `unit` 계층: 끝낸 에피소드에 업데이트로 생긴 유닛 — 레슨은 순서대로만 열리므로 완료한 에피소드의 안 끝낸 유닛이
// 업데이트로 생긴 것입니다.

const section = (episodeId: string, lessonKeys: readonly string[]): CatalogReadySection => ({
  kind: "catalog-ready",
  episodeId,
  ordinal: 1,
  title: episodeId,
  lessonKeys,
  finalKey: "RP",
  completionKeys: ["RP"],
  cultureKeys: [],
});
const u03 = section("u03", ["S1", "INT", "S2"]);
const u05 = section("u05", ["S1", "S2"]);

test("UF1. 완료한 에피소드의 안 끝낸 유닛을 유닛 순서로 낸다 — 완료하지 않았으면 없다", () => {
  expect(catalogFreshUnitKeysOf(u03, { u03: ["S1", "S2", "RP"] })).toEqual(["INT"]);
  expect(catalogFreshUnitKeysOf(u03, { u03: ["S1"] })).toEqual([]);
  expect(catalogFreshUnitKeysOf(u03, { u03: ["S1", "INT", "S2", "RP"] })).toEqual([]);
  expect(catalogFreshUnitKeysOf(u03, {})).toEqual([]);
});

test("UF4. 완료 키가 레슨 전체여도 최종 테스트를 끝냈으면 끝낸 에피소드로 본다 — 새 유닛이 완료를 풀어도 안내한다", () => {
  const strict = { ...u03, completionKeys: ["S1", "INT", "S2", "RP"] };
  expect(catalogFreshUnitKeysOf(strict, { u03: ["S1", "S2", "RP"] })).toEqual(["INT"]);
});

test("UF2. 준비되지 않은 구획은 없다", () => {
  const pending: CatalogMapSection = {
    kind: "catalog-unavailable",
    episodeId: "u09",
    ordinal: 9,
    title: "u09",
    reason: "pending",
  };
  expect(catalogFreshUnitKeysOf(pending, { u09: ["RP"] })).toEqual([]);
});

test("UF3. 새 유닛이 있는 에피소드 id를 구획 순서로 낸다", () => {
  const progress = { u03: ["S1", "S2", "RP"], u05: ["S1", "RP"] };
  expect(catalogFreshEpisodeIdsOf([u03, u05], progress)).toEqual(["u03", "u05"]);
  expect(catalogFreshEpisodeIdsOf([u03, u05], { u03: ["S1", "INT", "S2", "RP"] })).toEqual([]);
});
