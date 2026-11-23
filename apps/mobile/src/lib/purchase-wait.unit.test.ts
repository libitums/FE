import { expect, test } from "vitest";

import {
  WAIT_DONE_MS,
  WAIT_LATE_MS,
  chipUpdating,
  countUpFrames,
  idleWait,
  packAdding,
  pillOf,
  waitAfter,
  waitTargetOf,
  type PurchaseWait,
} from "./purchase-wait";

// `unit` 계층(PW-U1 ~ PW-U6, ADR-0163 D2): 구매 뒤 서버 확인 대기 — 무엇이 스켈레톤인지 · 알약 글 · 오름 칸.

const coinsWaiting: PurchaseWait = {
  phase: "waiting",
  target: "coins",
  productId: "duru.coins.1200.v1",
};
const planWaiting: PurchaseWait = {
  phase: "waiting",
  target: "plan",
  productId: "duru.premium.monthly.v1",
};
const restoreWaiting: PurchaseWait = { phase: "waiting", target: "any", productId: null };

test("PW-U1 멈춤 조건 → 대기 대상: balance → coins, entitlements → plan, any → any", () => {
  expect(waitTargetOf("balance")).toBe("coins");
  expect(waitTargetOf("entitlements")).toBe("plan");
  expect(waitTargetOf("any")).toBe("any");
});

test("PW-U2 결과 — reflected면 done(오른 엽전 수, 오르지 않았으면 null), 아니면 late", () => {
  expect(waitAfter(coinsWaiting, { reflected: true, balanceBefore: 100, balance: 1300 })).toEqual({
    phase: "done",
    target: "coins",
    coins: 1200,
  });
  expect(waitAfter(planWaiting, { reflected: true, balanceBefore: 100, balance: 100 })).toEqual({
    phase: "done",
    target: "plan",
    coins: null,
  });
  expect(waitAfter(coinsWaiting, { reflected: true, balanceBefore: null, balance: 600 })).toEqual({
    phase: "done",
    target: "coins",
    coins: null,
  });
  expect(waitAfter(planWaiting, { reflected: false, balanceBefore: 100, balance: 100 })).toEqual({
    phase: "late",
    target: "plan",
  });
  // 기다리는 중이 아니면 그대로(늦게 온 결과를 버림).
  expect(waitAfter(idleWait, { reflected: true, balanceBefore: 1, balance: 2 })).toBe(idleWait);
});

test("PW-U3 칩 스켈레톤 — 기다리는 동안 대상 칩만(복원은 둘 다), 끝나면 없음", () => {
  expect(chipUpdating(coinsWaiting, "coins")).toBe(true);
  expect(chipUpdating(coinsWaiting, "plan")).toBe(false);
  expect(chipUpdating(planWaiting, "plan")).toBe(true);
  expect(chipUpdating(planWaiting, "coins")).toBe(false);
  expect(chipUpdating(restoreWaiting, "coins")).toBe(true);
  expect(chipUpdating(restoreWaiting, "plan")).toBe(true);
  expect(chipUpdating({ phase: "late", target: "coins" }, "coins")).toBe(false);
  expect(chipUpdating(idleWait, "coins")).toBe(false);
});

test("PW-U4 산 팩 — 엽전 대기 중 그 상품만 「Adding」", () => {
  expect(packAdding(coinsWaiting, "duru.coins.1200.v1")).toBe(true);
  expect(packAdding(coinsWaiting, "duru.coins.500.v1")).toBe(false);
  expect(packAdding(planWaiting, "duru.premium.monthly.v1")).toBe(false);
  expect(packAdding(idleWait, "duru.coins.1200.v1")).toBe(false);
});

test("PW-U5 알약 — waiting · late · 엽전 done만 added, 구독 done은 알림이 맡아 없음", () => {
  expect(pillOf(idleWait)).toBeNull();
  expect(pillOf(coinsWaiting)).toEqual({ kind: "waiting" });
  expect(pillOf(planWaiting)).toEqual({ kind: "waiting" });
  expect(pillOf({ phase: "late", target: "plan" })).toEqual({ kind: "late" });
  expect(pillOf({ phase: "done", target: "coins", coins: 1200 })).toEqual({
    kind: "added",
    coins: 1200,
  });
  expect(pillOf({ phase: "done", target: "plan", coins: null })).toBeNull();
  expect(pillOf({ phase: "done", target: "coins", coins: null })).toBeNull();
  expect(WAIT_DONE_MS).toBe(3000);
  expect(WAIT_LATE_MS).toBe(6000);
});

test("PW-U6 오름 칸 — 전 값에서 시작해 새 값에서 끝나고 줄지 않는다, 같거나 내려가면 새 값 하나", () => {
  const frames = countUpFrames(100, 1300, 12);
  expect(frames[0]).toBe(100);
  expect(frames[frames.length - 1]).toBe(1300);
  expect(frames).toHaveLength(13);
  for (let index = 1; index < frames.length; index += 1)
    expect(frames[index]!).toBeGreaterThanOrEqual(frames[index - 1]!);
  expect(frames.every((value) => Number.isInteger(value))).toBe(true);
  expect(countUpFrames(500, 500, 12)).toEqual([500]);
  expect(countUpFrames(500, 300, 12)).toEqual([300]);
  expect(countUpFrames(100, 200, 0)).toEqual([200]);
});
