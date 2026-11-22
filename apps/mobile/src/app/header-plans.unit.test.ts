import { expect, test, vi } from "vitest";

import { headerPlansOf } from "./header-plans";
import type { PlansWiring } from "./use-plans";

// `unit` 계층(HP1): 머리의 요금제 입구 고르기(ADR-0160) — 칩은 여정 지도에서만, 결선이 없으면 없음.

const wiring = (over: Partial<PlansWiring>) =>
  ({
    current: null,
    goUnlimited: { price: "$3.99" },
    activated: null,
    onActivatedShown: vi.fn(),
    wait: { phase: "idle" },
    ...over,
  }) as unknown as PlansWiring;

test("HP1 결선 없음 → undefined, 지도 밖 → 칩 null, 지도 → 구독에 따라 plans · 요금제", () => {
  expect(headerPlansOf(undefined, true)).toBeUndefined();
  expect(headerPlansOf(wiring({}), false)?.chip).toBeNull();
  expect(headerPlansOf(wiring({}), true)?.chip).toBe("plans");
  const premium = wiring({
    current: {
      id: "premium",
      period: "monthly",
      productId: "p",
      expiresAt: null,
      willRenew: true,
    },
    activated: { plan: "premium", scheduled: null },
  });
  expect(headerPlansOf(premium, true)).toMatchObject({
    chip: "premium",
    activated: { plan: "premium", scheduled: null },
    goUnlimited: { price: "$3.99" },
  });
});

test("HP2 구매 뒤 서버 확인 대기(ADR-0163) — 엽전 대기면 엽전 칩, 구독 대기면 요금제 칩, 복원은 둘 다, 끝나면 없음", () => {
  const of = (wait: PlansWiring["wait"]) => headerPlansOf(wiring({ wait }), true)?.updating;
  expect(of({ phase: "idle" })).toEqual({ coins: false, plan: false });
  expect(of({ phase: "waiting", target: "coins", productId: "c" })).toEqual({
    coins: true,
    plan: false,
  });
  expect(of({ phase: "waiting", target: "plan", productId: "p" })).toEqual({
    coins: false,
    plan: true,
  });
  expect(of({ phase: "waiting", target: "any", productId: null })).toEqual({
    coins: true,
    plan: true,
  });
  expect(of({ phase: "late", target: "plan" })).toEqual({ coins: false, plan: false });
});
