import { describe, expect, test } from "vitest";

import { CHAT_COIN_PRICES, coinPlanFor } from "./chat-coins";
import { askMediaPlan } from "./chat-rules";

// `unit` 계층(MC2-U8): 엽전 가격표 · 낼 수 있나 판정 · 요청 모달 판정의 위임(messenger-chat-1-5 spec §4.2).

describe("CHAT_COIN_PRICES (MC2-U8)", () => {
  test("MC2-U8. 가격표는 메시지 10 · 음성 40 · 사진 60 이다(사용자 결정)", () => {
    expect(CHAT_COIN_PRICES).toEqual({ message: 10, voice: 40, photo: 60 });
  });
});

describe("coinPlanFor (MC2-U8)", () => {
  test.each([
    [100, 60],
    [60, 60],
  ] as const)("MC2-U8. 잔액 %s ≥ 가격 %s → pay", (balance, price) => {
    expect(coinPlanFor(balance, price)).toEqual({ kind: "pay", price });
  });

  test("MC2-U8. 잔액 59 · 가격 60 → top-up 1", () => {
    expect(coinPlanFor(59, 60)).toEqual({ kind: "top-up", price: 60, shortBy: 1 });
  });

  test.each([[Number.NaN], [Number.POSITIVE_INFINITY], [Number.NEGATIVE_INFINITY], [-5]])(
    "MC2-U8. 잔액 %s 는 0 으로 친다 → top-up 가격만큼 모자람",
    (balance) => {
      expect(coinPlanFor(balance, 60)).toEqual({ kind: "top-up", price: 60, shortBy: 60 });
    },
  );
});

describe("askMediaPlan 위임 (MC2-U8)", () => {
  test("MC2-U8. pay 는 ask, top-up 은 top-up(1단계 표 그대로)", () => {
    expect(askMediaPlan(100, 60)).toEqual({ kind: "ask", price: 60 });
    expect(askMediaPlan(40, 40)).toEqual({ kind: "ask", price: 40 });
    expect(askMediaPlan(30, 60)).toEqual({ kind: "top-up", price: 60, shortBy: 30 });
  });

  test("MC2-U8. 유한하지 않은 잔액은 coinPlanFor 와 같이 0 으로 친다", () => {
    expect(askMediaPlan(Number.NaN, 60)).toEqual({ kind: "top-up", price: 60, shortBy: 60 });
    expect(askMediaPlan(-5, 40)).toEqual({ kind: "top-up", price: 40, shortBy: 40 });
  });
});
