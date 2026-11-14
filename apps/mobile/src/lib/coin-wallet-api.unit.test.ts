import { describe, expect, test } from "vitest";

import { coinClaimFrom, createCoinClient } from "./coin-wallet-api";

// `unit` 계층(YL-U1 · U2): 엽전 한 번 지급 응답 해석 · 요청 모양(ADR-0140).

const config = { url: "https://example.supabase.co", anonKey: "anon" };

describe("응답", () => {
  test("YL-U1 학습 보상 · 보너스 · 잔액, 틀린 모양은 null", () => {
    expect(
      coinClaimFrom(JSON.stringify({ learning: 370, bonus: 100, wallet: { balance: 470 } })),
    ).toEqual({
      learning: 370,
      bonus: 100,
      balance: 470,
    });
    expect(
      coinClaimFrom(JSON.stringify({ learning: -1, bonus: 0, wallet: { balance: 0 } })),
    ).toBeNull();
    expect(coinClaimFrom(JSON.stringify({ learning: 0, bonus: 0 }))).toBeNull();
    expect(coinClaimFrom("<html>")).toBeNull();
    expect(coinClaimFrom(null)).toBeNull();
  });
});

describe("요청", () => {
  test("YL-U2 RPC companion_claim_coins를 토큰으로 부르고, 로그인 없음 · 실패 응답 · 던짐은 null", async () => {
    const urls: string[] = [];
    const ok = createCoinClient({
      token: async () => "tok",
      post: async (build) => {
        const built = build(config);
        urls.push(built.url);
        expect(built.init.headers.Authorization).toBe("Bearer tok");
        return {
          ok: true,
          status: 200,
          bodyText: JSON.stringify({ learning: 0, bonus: 100, wallet: { balance: 100 } }),
        };
      },
    });
    expect(await ok.claim()).toEqual({ learning: 0, bonus: 100, balance: 100 });
    expect(urls).toEqual(["https://example.supabase.co/rest/v1/rpc/companion_claim_coins"]);
    expect(
      await createCoinClient({
        token: async () => null,
        post: async () => ({ ok: true, status: 200, bodyText: "" }),
      }).claim(),
    ).toBeNull();
    expect(
      await createCoinClient({
        token: async () => "t",
        post: async () => ({ ok: true, status: 500, bodyText: "x" }),
      }).claim(),
    ).toBeNull();
    expect(
      await createCoinClient({
        token: async () => "t",
        post: async () => {
          throw new Error("x");
        },
      }).claim(),
    ).toBeNull();
  });
});
