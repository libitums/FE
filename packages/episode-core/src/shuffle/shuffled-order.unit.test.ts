import { describe, expect, test } from "vitest";

import { shuffledOrder } from "./index";

// `unit` 계층: 씨앗으로 정하는 결정적 타일 순서. 골든 값은 앱(u00 롤플레이)과 같아야 합니다.

describe("shuffledOrder", () => {
  test("SH1. u00 롤플레이 세 턴의 골든 순서", () => {
    expect(shuffledOrder("u00-tutorial/RP-01", 3)).toEqual([1, 2, 0]);
    expect(shuffledOrder("u00-tutorial/RP-02", 2)).toEqual([1, 0]);
    expect(shuffledOrder("u00-tutorial/RP-03", 1)).toEqual([0]);
  });

  test("SH1. 길이 0 · 음수는 빈 배열", () => {
    expect(shuffledOrder("u00-tutorial/RP-01", 0)).toEqual([]);
    expect(shuffledOrder("u00-tutorial/RP-01", -1)).toEqual([]);
  });

  test("SH1. 같은 씨앗은 같은 값", () => {
    expect(shuffledOrder("seed", 5)).toEqual(shuffledOrder("seed", 5));
  });

  test("SH1. 둘 이상이면 순열이고 원래 순서가 아니다", () => {
    for (const length of [2, 3, 4, 7]) {
      for (const seed of ["a", "b", "u00-tutorial/RP-01", ""]) {
        const order = shuffledOrder(seed, length);
        expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length }, (_, i) => i));
        expect(order).not.toEqual(Array.from({ length }, (_, i) => i));
      }
    }
  });
});
