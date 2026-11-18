import { expect, test, vi } from "vitest";

import { disabledPurchaseBridge, type PurchaseBridge } from "./purchase-bridge";
import { createPurchaseUserSync } from "./purchase-user";

// `unit` 계층(PU-U1 · PU-U2, ADR-0144 2단계 2026-11-17): 구매 다리의 사용자 = Supabase 사용자 id(토큰의 `sub`). 세션이 바뀔 때마다
// 맞추되 같은 사용자면 다시 부르지 않고, 로그아웃(토큰 없음)이면 익명으로 되돌린다.

const tokenFor = (sub: string) => `e30.${btoa(JSON.stringify({ sub })).replace(/=+$/, "")}.sig`;

function spyBridge(): PurchaseBridge & {
  configure: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
} {
  return {
    ...disabledPurchaseBridge,
    configure: vi.fn(async () => true),
    signOut: vi.fn(async () => {}),
  };
}

test("PU-U1 로그인한 토큰의 사용자로 맞추고, 같은 사용자면 다시 부르지 않는다", () => {
  const bridge = spyBridge();
  const sync = createPurchaseUserSync(() => bridge);
  sync(tokenFor("user-a"));
  sync(tokenFor("user-a"));
  sync(tokenFor("user-b"));
  expect(bridge.configure.mock.calls).toEqual([["user-a"], ["user-b"]]);
  expect(bridge.signOut).not.toHaveBeenCalled();
});

test("PU-U2 토큰이 없어지면(로그아웃 · 삭제) 익명으로 되돌리고, 처음부터 없으면 아무것도 하지 않는다", () => {
  const bridge = spyBridge();
  const sync = createPurchaseUserSync(() => bridge);
  sync(null);
  expect(bridge.signOut).not.toHaveBeenCalled();
  sync(tokenFor("user-a"));
  sync(null);
  sync(null);
  expect(bridge.signOut).toHaveBeenCalledTimes(1);
});
