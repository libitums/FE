import { expect, test } from "vitest";

import type { CurrentPlan } from "../screens/plans/plan-change";
import {
  planSelectedEvent,
  planSurfaceOf,
  plansViewedEvent,
  shopTabSwitchedEvent,
} from "./plans-events";

// `unit` 계층(PE1 ~ PE3): 요금제 · 상점 이벤트 모양(ADR-0160).

const chatPlus: CurrentPlan = {
  id: "chat_plus",
  period: "monthly",
  productId: "duru.chatplus.monthly.v1",
  expiresAt: null,
  willRenew: true,
};

test("PE1 plans_viewed — 자리 · 보기 · 지금 요금제(없으면 free), 대화 쪽 자리는 surface chat", () => {
  expect(plansViewedEvent("header_chip", "compare", null)).toEqual({
    name: "plans_viewed",
    surface: "learning",
    placement: "header_chip",
    view: "compare",
    currentPlan: "free",
  });
  expect(plansViewedEvent("chat_send", "compare", chatPlus)).toMatchObject({
    surface: "chat",
    currentPlan: "chat_plus",
  });
  expect(planSurfaceOf("messenger")).toBe("chat");
  expect(planSurfaceOf("tickets_chip")).toBe("learning");
});

test("PE2 plan_selected — from · to · kind(구독 없음 new, 위 upgrade, 기간만 crossgrade)", () => {
  expect(planSelectedEvent("settings", "premium", "yearly", null)).toEqual({
    name: "plan_selected",
    surface: "learning",
    placement: "settings",
    plan: "premium",
    period: "yearly",
    from: "free",
    to: "premium",
    kind: "new",
  });
  expect(planSelectedEvent("coin_shop", "premium", "monthly", chatPlus)).toMatchObject({
    from: "chat_plus",
    to: "premium",
    kind: "upgrade",
  });
  expect(planSelectedEvent("settings", "chat_plus", "yearly", chatPlus)).toMatchObject({
    kind: "crossgrade",
  });
});

test("PE3 shop_tab_switched — 어느 탭에서 어느 탭으로", () => {
  expect(shopTabSwitchedEvent("coins", "plans", "chat")).toEqual({
    name: "shop_tab_switched",
    surface: "chat",
    from: "coins",
    to: "plans",
  });
});
