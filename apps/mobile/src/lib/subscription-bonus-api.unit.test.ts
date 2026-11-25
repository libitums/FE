import { describe, expect, test, vi } from "vitest";

import type { SupabaseConfig } from "./auth-session.contract";
import {
  createSubscriptionBonusClient,
  subscriptionBonusClaimFrom,
} from "./subscription-bonus-api";

// `unit` 계층(CB-U1 · U2): Chat Plus 첫 구독 보너스 알림 RPC 응답 읽기와 클라이언트(ADR-0196 D3).

const config = { url: "https://db.test", anonKey: "anon" } as unknown as SupabaseConfig;
const wallet = (balance: number) => ({ balance, grant: balance, tier: "chat_plus" });

describe("CB-U1 응답 읽기", () => {
  test("알림 · 이미 알림 · 없음 — 이번에 알린 수 · 이유 · 잔액", () => {
    expect(
      subscriptionBonusClaimFrom(
        JSON.stringify({ amount: 100, reason: "announced", wallet: wallet(400) }),
      ),
    ).toEqual({ amount: 100, reason: "announced", balance: 400 });
    expect(
      subscriptionBonusClaimFrom(
        JSON.stringify({ amount: 0, reason: "already_announced", wallet: wallet(12) }),
      ),
    ).toEqual({ amount: 0, reason: "already_announced", balance: 12 });
    expect(
      subscriptionBonusClaimFrom(JSON.stringify({ amount: 0, reason: "none", wallet: wallet(0) })),
    ).toEqual({ amount: 0, reason: "none", balance: 0 });
  });

  test("모양이 틀리면 null — 빈 본문 · 깨진 JSON · 음수 · 소수 · 모르는 이유 · 지갑 없음", () => {
    const ok = { amount: 100, reason: "announced", wallet: wallet(1) };
    expect(subscriptionBonusClaimFrom(null)).toBeNull();
    expect(subscriptionBonusClaimFrom(" ")).toBeNull();
    expect(subscriptionBonusClaimFrom("{")).toBeNull();
    expect(subscriptionBonusClaimFrom("null")).toBeNull();
    expect(subscriptionBonusClaimFrom(JSON.stringify({ ...ok, amount: -1 }))).toBeNull();
    expect(subscriptionBonusClaimFrom(JSON.stringify({ ...ok, amount: 1.5 }))).toBeNull();
    expect(subscriptionBonusClaimFrom(JSON.stringify({ ...ok, reason: "granted" }))).toBeNull();
    expect(
      subscriptionBonusClaimFrom(JSON.stringify({ amount: 100, reason: "announced" })),
    ).toBeNull();
  });
});

describe("CB-U2 클라이언트", () => {
  test("토큰이 없으면 요청 없이 null", async () => {
    const post = vi.fn();
    expect(
      await createSubscriptionBonusClient({ token: async () => null, post }).claim(),
    ).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  test("RPC companion_claim_subscription_bonus에 빈 본문 POST — 성공이면 읽은 값, 실패 · 던짐이면 null", async () => {
    const body = JSON.stringify({ amount: 100, reason: "announced", wallet: wallet(400) });
    const post = vi.fn(async (build: (c: SupabaseConfig) => { url: string; init: unknown }) => {
      const { url, init } = build(config);
      expect(url).toBe("https://db.test/rest/v1/rpc/companion_claim_subscription_bonus");
      expect(init).toMatchObject({ method: "POST", body: "{}" });
      return { ok: true, status: 200, bodyText: body } as never;
    });
    expect(await createSubscriptionBonusClient({ token: async () => "t", post }).claim()).toEqual({
      amount: 100,
      reason: "announced",
      balance: 400,
    });
    const failed = createSubscriptionBonusClient({
      token: async () => "t",
      post: async () => ({ ok: true, status: 404, bodyText: "" }) as never,
    });
    expect(await failed.claim()).toBeNull();
    const thrown = createSubscriptionBonusClient({
      token: async () => "t",
      post: async () => {
        throw new Error("offline");
      },
    });
    expect(await thrown.claim()).toBeNull();
  });
});
