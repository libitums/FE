import { describe, expect, test, vi } from "vitest";

import type { HttpRequestInit, SupabaseConfig } from "./auth-session.contract";
import { createPushRewardClient, pushRewardClaimFrom } from "./push-reward-api";

// `unit` 계층(PR-U1 · U2): 푸시 캠페인 보상 RPC 응답 읽기와 클라이언트(ADR-0175).

const config = { url: "https://db.test", anonKey: "anon" } as unknown as SupabaseConfig;
const wallet = (balance: number) => ({ balance, grant: balance, tier: "free" });
const body = (value: unknown) => JSON.stringify(value);

describe("PR-U1 응답 읽기", () => {
  test("엽전 지급 — 수 · 캠페인 id · 잔액", () => {
    expect(
      pushRewardClaimFrom(
        body({
          status: "granted",
          campaignId: "c1",
          kind: "coins",
          amount: 100,
          hours: null,
          passUntil: null,
          wallet: wallet(130),
        }),
      ),
    ).toEqual({
      status: "granted",
      campaignId: "c1",
      reward: { kind: "coins", amount: 100 },
      balance: 130,
    });
  });

  test("무제한 티켓 — 시간과 끝 시각(ms)", () => {
    expect(
      pushRewardClaimFrom(
        body({
          status: "already_claimed",
          campaignId: "c2",
          kind: "unlimited_tickets",
          amount: null,
          hours: 24,
          passUntil: "2026-11-22T10:00:00+00:00",
          wallet: wallet(5),
        }),
      ),
    ).toEqual({
      status: "already_claimed",
      campaignId: "c2",
      reward: { kind: "tickets", hours: 24, untilMs: Date.parse("2026-11-22T10:00:00Z") },
      balance: 5,
    });
  });

  test("받을 것이 없는 판정은 보상 null · 지갑이 없으면 잔액 null", () => {
    for (const status of ["not_recipient", "expired", "unknown", "none"]) {
      expect(pushRewardClaimFrom(body({ status, campaignId: null, kind: null }))).toEqual({
        status,
        campaignId: null,
        reward: null,
        balance: null,
      });
    }
  });

  test("모양이 틀리면 null — 빈 본문 · 깨진 JSON · 모르는 판정 · 지급인데 보상 모양이 틀림", () => {
    expect(pushRewardClaimFrom(null)).toBeNull();
    expect(pushRewardClaimFrom(" ")).toBeNull();
    expect(pushRewardClaimFrom("{")).toBeNull();
    expect(pushRewardClaimFrom("null")).toBeNull();
    expect(pushRewardClaimFrom(body({ status: "ok" }))).toBeNull();
    expect(
      pushRewardClaimFrom(
        body({ status: "granted", kind: "coins", amount: -1, wallet: wallet(1) }),
      ),
    ).toBeNull();
    expect(
      pushRewardClaimFrom(
        body({ status: "granted", kind: "unlimited_tickets", hours: 24, passUntil: "soon" }),
      ),
    ).toBeNull();
    expect(pushRewardClaimFrom(body({ status: "granted", kind: "gems", amount: 1 }))).toBeNull();
  });
});

describe("PR-U2 클라이언트", () => {
  test("RPC에 캠페인 id(없으면 null)를 싣고 응답을 읽는다", async () => {
    const post = vi.fn(
      async (build: (c: SupabaseConfig) => { url: string; init: HttpRequestInit }) => {
        const request = build(config);
        expect(request.url).toBe("https://db.test/rest/v1/rpc/push_campaign_claim_reward");
        return {
          ok: true as const,
          status: 200,
          bodyText: body({ status: "none", campaignId: null, kind: null }),
        };
      },
    );
    const client = createPushRewardClient({ token: async () => "t", post });
    await expect(client.claim("c9")).resolves.toMatchObject({ status: "none" });
    await client.claim(null);
    const bodies = post.mock.calls.map(([build]) => (build(config).init as { body: string }).body);
    expect(bodies.map((text) => JSON.parse(text))).toEqual([
      { p_campaign_id: "c9" },
      { p_campaign_id: null },
    ]);
  });

  test("로그인 없음 · 실패 응답 · 던짐은 null", async () => {
    const ok = async () => ({ ok: true as const, status: 200, bodyText: body({ status: "none" }) });
    await expect(
      createPushRewardClient({ token: async () => null, post: ok }).claim(null),
    ).resolves.toBeNull();
    await expect(
      createPushRewardClient({
        token: async () => "t",
        post: async () => ({ ok: true as const, status: 404, bodyText: "{}" }),
      }).claim(null),
    ).resolves.toBeNull();
    await expect(
      createPushRewardClient({
        token: async () => "t",
        post: async () => {
          throw new Error("offline");
        },
      }).claim("c1"),
    ).resolves.toBeNull();
  });
});
