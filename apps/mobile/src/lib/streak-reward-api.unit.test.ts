import { describe, expect, test } from "vitest";

import { createStreakRewardClient, streakRewardClaimFrom } from "./streak-reward-api";

// `unit` 계층(SR-U6): 연속 학습 보상 지급 응답 해석 · 요청 모양(ADR-0143).

const config = { url: "https://example.supabase.co", anonKey: "anon" };
const body = (value: unknown) => JSON.stringify(value);

describe("응답", () => {
  test("SR-U6a 일수 · 액수 · 지급 여부 · 잔액, 틀린 모양은 null", () => {
    expect(
      streakRewardClaimFrom(body({ days: 7, amount: 40, granted: true, wallet: { balance: 90 } })),
    ).toEqual({ days: 7, amount: 40, granted: true, balance: 90 });
    expect(
      streakRewardClaimFrom(body({ days: 5, amount: 0, granted: false, wallet: { balance: 3 } })),
    ).toEqual({ days: 5, amount: 0, granted: false, balance: 3 });
    expect(
      streakRewardClaimFrom(body({ days: 7, amount: -1, granted: true, wallet: { balance: 0 } })),
    ).toBeNull();
    expect(streakRewardClaimFrom(body({ days: 7, amount: 40, granted: true }))).toBeNull();
    expect(
      streakRewardClaimFrom(body({ days: 7, amount: 40, granted: "yes", wallet: { balance: 1 } })),
    ).toBeNull();
    expect(streakRewardClaimFrom("<html>")).toBeNull();
    expect(streakRewardClaimFrom(null)).toBeNull();
  });
});

describe("요청", () => {
  test("SR-U6b RPC를 토큰 · 기기 오늘로 부르고, 로그인 없음 · 실패 응답 · 던짐은 null", async () => {
    const calls: { url: string; body: unknown; auth: string | undefined }[] = [];
    const ok = createStreakRewardClient({
      token: async () => "tok",
      post: async (build) => {
        const built = build(config);
        calls.push({
          url: built.url,
          body: JSON.parse(String(built.init.body)),
          auth: built.init.headers.Authorization,
        });
        return {
          ok: true,
          status: 200,
          bodyText: body({ days: 3, amount: 15, granted: true, wallet: { balance: 15 } }),
        };
      },
    });
    expect(await ok.claim("2026-11-14")).toEqual({
      days: 3,
      amount: 15,
      granted: true,
      balance: 15,
    });
    expect(calls).toEqual([
      {
        url: "https://example.supabase.co/rest/v1/rpc/companion_claim_streak_reward",
        body: { p_today: "2026-11-14" },
        auth: "Bearer tok",
      },
    ]);

    const noToken = createStreakRewardClient({
      token: async () => null,
      post: async () => {
        throw new Error("부르지 않아야 함");
      },
    });
    expect(await noToken.claim("2026-11-14")).toBeNull();
    const failed = createStreakRewardClient({
      token: async () => "tok",
      post: async () => ({ ok: true, status: 500, bodyText: "{}" }),
    });
    expect(await failed.claim("2026-11-14")).toBeNull();
    const throws = createStreakRewardClient({
      token: async () => "tok",
      post: async () => {
        throw new Error("network");
      },
    });
    expect(await throws.claim("2026-11-14")).toBeNull();
  });
});
