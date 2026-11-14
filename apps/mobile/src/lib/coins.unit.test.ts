import { describe, expect, test } from "vitest";

import {
  COINS_PER_LESSON,
  coinBalanceOf,
  coinFlightCount,
  coinFlightValueAt,
  lessonCoinReward,
} from "./coins";

// `unit` 계층: 학습 보상 엽전(ADR-0116).

describe("coinBalanceOf", () => {
  test("[C1] 엽전을 받은 유닛이 없으면 0", () => {
    expect(coinBalanceOf({})).toBe(0);
  });

  test("[C2] 에피소드를 가로질러 유닛 하나에 5씩 센다(2026-11-14 10 → 5)", () => {
    expect(coinBalanceOf({ u01: ["L1", "L2"], u02: ["L1"] })).toBe(3 * COINS_PER_LESSON);
    expect(COINS_PER_LESSON).toBe(5);
  });
});

describe("lessonCoinReward", () => {
  test("[C3] 처음 통과만 5, 다시 하기 · 미통과는 0", () => {
    expect(lessonCoinReward("passed", true)).toBe(5);
    expect(lessonCoinReward("passed", false)).toBe(0);
    expect(lessonCoinReward("failed", true)).toBe(0);
    expect(lessonCoinReward("failed", false)).toBe(0);
  });
});

describe("coinFlightCount", () => {
  test("[C4] 보상 하나에 엽전 하나, 0 이하 · 숫자 아님은 0, 소수는 내림", () => {
    expect(coinFlightCount(10)).toBe(10);
    expect(coinFlightCount(3.7)).toBe(3);
    expect(coinFlightCount(0)).toBe(0);
    expect(coinFlightCount(-2)).toBe(0);
    expect(coinFlightCount(Number.NaN)).toBe(0);
  });
});

describe("coinFlightValueAt", () => {
  test("[C5] 닿은 수만큼 시작 값에서 오른다", () => {
    expect(coinFlightValueAt(20, 0, 10)).toBe(20);
    expect(coinFlightValueAt(20, 4, 10)).toBe(24);
    expect(coinFlightValueAt(20, 10, 10)).toBe(30);
  });

  test("[C6] 보상보다 많이 오르지 않는다", () => {
    expect(coinFlightValueAt(20, 12, 10)).toBe(30);
  });
});
