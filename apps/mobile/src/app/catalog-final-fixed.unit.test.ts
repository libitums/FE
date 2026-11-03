import { expect, test } from "vitest";

import {
  catalogFinalReducer,
  initialCatalogFinalState,
} from "../screens/catalog-final/catalog-final";
import { tutorialFixedTilesOf } from "./catalog-final-model";

// `unit` 계층: 튜토리얼 최종 테스트의 고정 타일 — 첫 타일이 상대 대사 첫머리와 같을 때만(인사를 그대로 받음),
// 보이는 순서의 번호로 내고, 다음 턴으로 넘어갈 때 그 턴의 고정 타일이 놓인 채로 시작합니다.

const original = ["안녕하세요!", "네,", "처음이에요!"];

test("FT1. 튜토리얼에서 첫 타일이 상대 대사 첫머리와 같으면 그 타일의 보이는 번호를 낸다", () => {
  expect(
    tutorialFixedTilesOf("u00-tutorial", original, [2, 0, 1], "안녕하세요! 한국은 처음이세요?"),
  ).toEqual([1]);
  expect(
    tutorialFixedTilesOf("u00-tutorial", original, [0, 1, 2], "안녕하세요 한국은 처음이세요"),
  ).toEqual([0]);
});

test("FT2. 튜토리얼이 아니거나 · 첫머리가 다르거나 · 타일이 하나뿐이면 고정하지 않는다", () => {
  expect(
    tutorialFixedTilesOf("u01-water", original, [0, 1, 2], "안녕하세요! 한국은 처음이세요?"),
  ).toBeNull();
  expect(
    tutorialFixedTilesOf("u00-tutorial", original, [0, 1, 2], "오, 한국어 잘하시네요!"),
  ).toBeNull();
  expect(tutorialFixedTilesOf("u00-tutorial", ["감사합니다!"], [0], "감사합니다!")).toBeNull();
});

test("FT3. 다음 턴으로 넘어가면 넘겨준 고정 타일이 놓인 채로 시작하고, 없으면 비어 있다", () => {
  const checked = {
    ...initialCatalogFinalState,
    placed: [0, 1],
    phase: "checked" as const,
    results: ["correct" as const],
  };
  expect(catalogFinalReducer(checked, { type: "nextTurn", placed: [1] }).placed).toEqual([1]);
  expect(catalogFinalReducer(checked, { type: "nextTurn" }).placed).toEqual([]);
});
