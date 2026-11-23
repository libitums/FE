import { describe, expect, test } from "vitest";

import { ANSWER_NUDGE_DELAY_MS, nextOrderedIndex, nextTileForWords } from "./answer-nudge";

// `unit` 계층: 고민 힌트(ADR-0177) — 지금 놓을 다음 정답 조각이 무엇인가.

describe("순서가 정해진 조각(문장 조립)", () => {
  test("AN-U1 지금까지 놓은 것이 정답의 앞부분이면 그다음 조각, 처음이면 첫 조각", () => {
    expect(nextOrderedIndex([1, 0, 2], [])).toBe(1);
    expect(nextOrderedIndex([1, 0, 2], [1])).toBe(0);
    expect(nextOrderedIndex([1, 0, 2], [1, 0])).toBe(2);
  });

  test("AN-U2 이미 틀린 조각이 놓여 있거나 다 놓았으면 가리키지 않는다", () => {
    expect(nextOrderedIndex([1, 0, 2], [0])).toBeNull();
    expect(nextOrderedIndex([1, 0, 2], [1, 2])).toBeNull();
    expect(nextOrderedIndex([1, 0, 2], [1, 0, 2])).toBeNull();
    expect(nextOrderedIndex([], [])).toBeNull();
  });
});

describe("낱말을 이루는 타일(음절 조립)", () => {
  const tiles = ["현", "드", "카", "찮"];

  test("AN-U3 놓은 글자가 어느 정답의 앞부분이면, 그 정답을 이어 가는 첫 타일", () => {
    expect(nextTileForWords(tiles, ["카드"], [])).toBe(2);
    expect(nextTileForWords(tiles, ["카드"], [2])).toBe(1);
  });

  test("AN-U4 정답이 여럿이면 어느 것으로든 이어지는 타일. 같은 글자 타일은 아직 창고에 있는 것", () => {
    expect(nextTileForWords(["가", "나", "다"], ["다나", "나가"], [])).toBe(1);
    expect(nextTileForWords(["나", "가", "나"], ["나나"], [0])).toBe(2);
  });

  test("AN-U5 틀린 글자가 놓였거나 낱말이 끝났으면 가리키지 않는다", () => {
    expect(nextTileForWords(tiles, ["카드"], [0])).toBeNull();
    expect(nextTileForWords(tiles, ["카드"], [2, 1])).toBeNull();
  });
});

test("AN-U6 기다리는 시간은 5초", () => {
  expect(ANSWER_NUDGE_DELAY_MS).toBe(5000);
});
