import { describe, expect, test } from "vitest";

import { TRIAL_TOTAL, sendGateFor, turnPlanFor, type TurnPlan } from "./free-turns";

// `unit` 계층(CP-U1 ~ U4): 대화 요금은 서버 규칙을 따른다(ADR-0155) — 무료 체험 20통은 인물과 상관없는 한 묶음이다(추천 친구와 함께
// 서버가 모든 인물의 체험 통을 함께 센다). 다 쓰면 어느 방이든 첫 통부터 메시지 요금. 하루 무료 수는 없다.

const PRICE = 3;
const plan = (trialRemaining: number | null, tier: "free" | "unlimited" = "free") =>
  turnPlanFor({ tier, trialRemaining, price: PRICE });

describe("turnPlanFor (CP-U1 · CP-U2)", () => {
  test("CP-U1. 서버 설정과 같은 값 — 체험은 20통", () => {
    expect(TRIAL_TOTAL).toBe(20);
  });

  test("CP-U1. 공용 체험 — 남은 수를 보인다 · 마지막 한 통은 last-free · 다 쓰면 엽전(인물을 받지 않는다)", () => {
    expect(plan(20)).toEqual<TurnPlan>({ kind: "trial", remaining: 20, total: TRIAL_TOTAL });
    expect(plan(2)).toEqual<TurnPlan>({ kind: "trial", remaining: 2, total: TRIAL_TOTAL });
    expect(plan(1)).toEqual<TurnPlan>({ kind: "last-free", total: TRIAL_TOTAL, price: PRICE });
    expect(plan(0)).toEqual<TurnPlan>({ kind: "coin", price: PRICE });
  });

  test("CP-U1. 체험 수를 아직 모르면(서버 지갑을 못 읽음) 수 없는 체험이다 — 판정은 서버가 한다", () => {
    expect(plan(null)).toEqual<TurnPlan>({ kind: "trial", remaining: null, total: TRIAL_TOTAL });
  });

  test("CP-U2. 무제한(시험 계정)은 체험과 상관없이 unlimited", () => {
    expect(plan(0, "unlimited")).toEqual<TurnPlan>({ kind: "unlimited" });
    expect(plan(5, "unlimited")).toEqual<TurnPlan>({ kind: "unlimited" });
  });
});

describe("sendGateFor (CP-U3)", () => {
  test("CP-U3. unlimited는 열림 · 체험(수를 몰라도)과 마지막 체험은 무료", () => {
    expect(sendGateFor({ kind: "unlimited" }, 0)).toEqual({ kind: "open" });
    expect(sendGateFor(plan(7), 0)).toEqual({ kind: "free" });
    expect(sendGateFor(plan(null), 0)).toEqual({ kind: "free" });
    expect(sendGateFor(plan(1), 0)).toEqual({ kind: "free" });
  });

  test("CP-U3. 엽전 계획은 잔액이 가격 이상이면 pay, 모자라면 top-up(모자란 수)", () => {
    expect(sendGateFor(plan(0), 3)).toEqual({ kind: "pay", price: PRICE });
    expect(sendGateFor(plan(0), 2)).toEqual({ kind: "top-up", price: PRICE, shortBy: 1 });
    expect(sendGateFor(plan(0), Number.NaN)).toEqual({
      kind: "top-up",
      price: PRICE,
      shortBy: PRICE,
    });
  });
});
