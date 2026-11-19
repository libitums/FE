import { describe, expect, test } from "vitest";

import {
  TRIAL_CHARACTER_ID,
  TRIAL_TOTAL,
  sendGateFor,
  turnPlanFor,
  type TurnPlan,
} from "./free-turns";

// `unit` 계층(CP-U1 ~ U4): 대화 요금은 서버 규칙을 따른다(ADR-0155) — 체험 인물(덕수쌤)은 체험 20통 무료, 그 밖의 인물은 첫 통부터
// 메시지 요금. 하루 무료 수는 없다(서버에 없는 규칙이었다).

const PRICE = 3;
const plan = (
  characterId: string,
  trialRemaining: number | null,
  tier: "free" | "unlimited" = "free",
) => turnPlanFor({ tier, characterId, trialRemaining, price: PRICE });

describe("turnPlanFor (CP-U1 · CP-U2)", () => {
  test("CP-U1. 서버 설정과 같은 값 — 체험 인물은 duksu, 체험은 20통", () => {
    expect(TRIAL_CHARACTER_ID).toBe("duksu");
    expect(TRIAL_TOTAL).toBe(20);
  });

  test("CP-U1. 체험 인물이 아닌 인물은 첫 통부터 엽전이다 — 체험이 남아 있어도", () => {
    expect(plan("mina", 20)).toEqual<TurnPlan>({ kind: "coin", price: PRICE });
    expect(plan("mina", null)).toEqual<TurnPlan>({ kind: "coin", price: PRICE });
  });

  test("CP-U1. 체험 인물은 남은 체험 수를 보인다 · 마지막 한 통은 last-free · 다 쓰면 엽전", () => {
    expect(plan(TRIAL_CHARACTER_ID, 20)).toEqual<TurnPlan>({
      kind: "trial",
      remaining: 20,
      total: TRIAL_TOTAL,
    });
    expect(plan(TRIAL_CHARACTER_ID, 2)).toEqual<TurnPlan>({
      kind: "trial",
      remaining: 2,
      total: TRIAL_TOTAL,
    });
    expect(plan(TRIAL_CHARACTER_ID, 1)).toEqual<TurnPlan>({
      kind: "last-free",
      total: TRIAL_TOTAL,
      price: PRICE,
    });
    expect(plan(TRIAL_CHARACTER_ID, 0)).toEqual<TurnPlan>({ kind: "coin", price: PRICE });
  });

  test("CP-U1. 체험 수를 아직 모르면(서버 지갑을 못 읽음) 수 없는 체험이다 — 판정은 서버가 한다", () => {
    expect(plan(TRIAL_CHARACTER_ID, null)).toEqual<TurnPlan>({
      kind: "trial",
      remaining: null,
      total: TRIAL_TOTAL,
    });
  });

  test("CP-U2. 무제한(시험 계정)은 인물 · 체험과 상관없이 unlimited", () => {
    expect(plan("mina", 0, "unlimited")).toEqual<TurnPlan>({ kind: "unlimited" });
    expect(plan(TRIAL_CHARACTER_ID, 5, "unlimited")).toEqual<TurnPlan>({ kind: "unlimited" });
  });
});

describe("sendGateFor (CP-U3)", () => {
  test("CP-U3. unlimited는 열림 · 체험(수를 몰라도)과 마지막 체험은 무료", () => {
    expect(sendGateFor({ kind: "unlimited" }, 0)).toEqual({ kind: "open" });
    expect(sendGateFor(plan(TRIAL_CHARACTER_ID, 7), 0)).toEqual({ kind: "free" });
    expect(sendGateFor(plan(TRIAL_CHARACTER_ID, null), 0)).toEqual({ kind: "free" });
    expect(sendGateFor(plan(TRIAL_CHARACTER_ID, 1), 0)).toEqual({ kind: "free" });
  });

  test("CP-U3. 엽전 계획은 잔액이 가격 이상이면 pay, 모자라면 top-up(모자란 수)", () => {
    expect(sendGateFor(plan("mina", 20), 3)).toEqual({ kind: "pay", price: PRICE });
    expect(sendGateFor(plan("mina", 20), 2)).toEqual({ kind: "top-up", price: PRICE, shortBy: 1 });
    expect(sendGateFor(plan("mina", 20), Number.NaN)).toEqual({
      kind: "top-up",
      price: PRICE,
      shortBy: PRICE,
    });
  });
});
