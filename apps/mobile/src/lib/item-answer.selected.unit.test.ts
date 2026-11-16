import { describe, expect, test } from "vitest";

import { selectedChoiceText, selectedTilesText, speechSkipReasonOf } from "./item-answer";

// `unit` 계층: 문항 판정 보고에 싣는 고른 글자 · 건너뛴 까닭(episode_item_answered 필드 추가, 2026-11-16).

describe("selectedChoiceText", () => {
  test("IA1. 고른 보기의 글자를 낸다", () => {
    expect(selectedChoiceText(["처음이세요?", "처음이에요!"], 1)).toBe("처음이에요!");
  });
  test("IA2. 범위 밖이면 undefined다", () => {
    expect(selectedChoiceText(["가"], 3)).toBeUndefined();
    expect(selectedChoiceText(["가"], -1)).toBeUndefined();
  });
});

describe("selectedTilesText", () => {
  test("IA3. 놓은 순서대로 이음 글자로 잇는다 — 낱말은 공백, 음절은 이음 없이, 대화는 ' | '", () => {
    const tiles = ["안녕하세요!", "한국은", "처음이에요!"];
    expect(selectedTilesText(tiles, [0, 2], " ")).toBe("안녕하세요! 처음이에요!");
    expect(selectedTilesText(["감", "사", "합"], [2, 0], "")).toBe("합감");
    expect(selectedTilesText(["A", "B"], [1, 0], " | ")).toBe("B | A");
  });
  test("IA4. 놓은 것이 없거나 없는 자리만 가리키면 undefined다", () => {
    expect(selectedTilesText(["가"], [], " ")).toBeUndefined();
    expect(selectedTilesText(["가"], [5], " ")).toBeUndefined();
  });
});

describe("speechSkipReasonOf", () => {
  test("IA5. 말할 수 있는 국면의 건너뜀은 user다", () => {
    expect(speechSkipReasonOf({ kind: "ready" })).toBe("user");
  });
  test("IA6. 쓸 수 없는 국면이면 unavailable:<reason>이다", () => {
    expect(speechSkipReasonOf({ kind: "unavailable", reason: "dictation-off" })).toBe(
      "unavailable:dictation-off",
    );
    expect(speechSkipReasonOf({ kind: "unavailable", reason: "blocked" })).toBe(
      "unavailable:blocked",
    );
  });
});
