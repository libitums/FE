import { describe, expect, test, vi } from "vitest";

import type { SupabaseConfig } from "./auth-session.contract";
import { createSignupRewardClient, signupRewardClaimFrom } from "./signup-reward-api";

// `unit` 계층(SR-U1 · U2): 가입 보상 지급 RPC 응답 읽기와 클라이언트(ADR-0174).

const config = { url: "https://db.test", anonKey: "anon" } as unknown as SupabaseConfig;
const wallet = (balance: number) => ({ balance, grant: balance, tier: "free" });

describe("SR-U1 응답 읽기", () => {
  test("지급 · 이미 받음 모두 이번에 더한 수와 잔액", () => {
    expect(
      signupRewardClaimFrom(
        JSON.stringify({ granted: 100, reason: "granted", wallet: wallet(100) }),
      ),
    ).toEqual({ granted: 100, balance: 100 });
    expect(
      signupRewardClaimFrom(
        JSON.stringify({ granted: 0, reason: "existing_account", wallet: wallet(35) }),
      ),
    ).toEqual({ granted: 0, balance: 35 });
  });

  test("모양이 틀리면 null — 빈 본문 · 깨진 JSON · 음수 · 소수 · 지갑 없음", () => {
    expect(signupRewardClaimFrom(null)).toBeNull();
    expect(signupRewardClaimFrom("  ")).toBeNull();
    expect(signupRewardClaimFrom("{")).toBeNull();
    expect(signupRewardClaimFrom("null")).toBeNull();
    expect(signupRewardClaimFrom(JSON.stringify({ granted: -1, wallet: wallet(0) }))).toBeNull();
    expect(signupRewardClaimFrom(JSON.stringify({ granted: 1.5, wallet: wallet(0) }))).toBeNull();
    expect(signupRewardClaimFrom(JSON.stringify({ granted: 100 }))).toBeNull();
  });
});

describe("SR-U2 클라이언트", () => {
  test("토큰이 없으면 요청 없이 null", async () => {
    const post = vi.fn();
    const client = createSignupRewardClient({ token: async () => null, post });
    expect(await client.claim()).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  test("RPC companion_claim_signup_reward에 빈 본문 POST, 성공이면 읽은 값", async () => {
    const seen: { url: string; init: { method: string; body?: string } }[] = [];
    const client = createSignupRewardClient({
      token: async () => "jwt",
      post: async (build) => {
        seen.push(build(config) as (typeof seen)[number]);
        return {
          ok: true,
          status: 200,
          bodyText: JSON.stringify({ granted: 100, reason: "granted", wallet: wallet(100) }),
        };
      },
    });
    expect(await client.claim()).toEqual({ granted: 100, balance: 100 });
    expect(seen[0]?.url).toBe("https://db.test/rest/v1/rpc/companion_claim_signup_reward");
    expect(seen[0]?.init).toMatchObject({ method: "POST", body: "{}" });
  });

  test("실패 상태 · 네트워크 · 던지는 전송은 null(던지지 않음)", async () => {
    const failing = createSignupRewardClient({
      token: async () => "jwt",
      post: async () => ({ ok: true, status: 404, bodyText: "{}" }),
    });
    expect(await failing.claim()).toBeNull();
    const offline = createSignupRewardClient({
      token: async () => "jwt",
      post: async () => ({ ok: false, reason: "network" }),
    });
    expect(await offline.claim()).toBeNull();
    const throwing = createSignupRewardClient({
      token: async () => {
        throw new Error("boom");
      },
      post: async () => ({ ok: false, reason: "network" }),
    });
    expect(await throwing.claim()).toBeNull();
  });
});
