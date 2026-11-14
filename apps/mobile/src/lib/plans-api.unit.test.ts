import { describe, expect, test } from "vitest";

import { catalogV1, serverPlansV1 } from "../screens/plans/plans.test-support";
import { createPlansClient, planEntitlementsFrom, plansCatalogFrom } from "./plans-api";

// `unit` 계층(SB-U1 · SB-U2): 요금제 · 권한 응답 해석과 요청 모양(ADR-0144).

const config = { url: "https://example.supabase.co", anonKey: "anon" };
const body = (value: unknown) => JSON.stringify(value);

describe("SB-U1 응답", () => {
  test("1판 요금제 표를 그대로 읽는다", () => {
    expect(plansCatalogFrom(body(serverPlansV1))).toEqual(catalogV1);
  });

  test("모르는 요금제 id는 버리고(문구가 없으므로) 나머지는 산다", () => {
    const future = {
      ...serverPlansV1,
      plans: [...serverPlansV1.plans, { ...serverPlansV1.plans[0], id: "family" }],
    };
    expect(plansCatalogFrom(body(future))?.plans.map((plan) => plan.id)).toEqual([
      "unlimited_tickets",
      "chat_plus",
      "premium",
    ]);
  });

  test("숫자 · 불값 · 상품 모양이 틀리면 null", () => {
    const broken = (patch: Record<string, unknown>) =>
      body({ ...serverPlansV1, plans: [{ ...serverPlansV1.plans[1], ...patch }] });
    expect(plansCatalogFrom(broken({ dailyFreeMessages: -1 }))).toBeNull();
    expect(plansCatalogFrom(broken({ monthlyCoins: "300" }))).toBeNull();
    expect(plansCatalogFrom(broken({ highlight: 1 }))).toBeNull();
    expect(plansCatalogFrom(broken({ products: null }))).toBeNull();
    expect(plansCatalogFrom(body({ ...serverPlansV1, free: {} }))).toBeNull();
    expect(plansCatalogFrom(body({ ...serverPlansV1, coinPacks: [{ productId: 1 }] }))).toBeNull();
    expect(plansCatalogFrom("<html>")).toBeNull();
    expect(plansCatalogFrom(null)).toBeNull();
  });

  test("권한 — 등급 · 티켓 무제한 · 활성 목록, 틀리면 null", () => {
    const raw = {
      tier: "chat_plus",
      unlimitedTickets: true,
      entitlements: [
        {
          id: "chat_plus",
          productId: "duru.chatplus.monthly.v1",
          store: "APP_STORE",
          status: "cancelled",
          willRenew: false,
          expiresAt: "2026-12-14T00:00:00+00:00",
        },
      ],
    };
    expect(planEntitlementsFrom(body(raw))).toEqual({
      tier: "chat_plus",
      unlimitedTickets: true,
      entitlements: [
        {
          id: "chat_plus",
          productId: "duru.chatplus.monthly.v1",
          status: "cancelled",
          willRenew: false,
          expiresAt: "2026-12-14T00:00:00+00:00",
        },
      ],
    });
    expect(planEntitlementsFrom(body({ ...raw, tier: "gold" }))).toBeNull();
    expect(planEntitlementsFrom(body({ ...raw, unlimitedTickets: "no" }))).toBeNull();
    expect(planEntitlementsFrom(body({ ...raw, entitlements: null }))).toBeNull();
    expect(planEntitlementsFrom(null)).toBeNull();
  });
});

describe("SB-U2 요청", () => {
  test("두 RPC를 토큰으로 부르고, 로그인 없음 · 실패 · 던짐은 null", async () => {
    const calls: { url: string; body: unknown; auth: string | undefined }[] = [];
    const client = createPlansClient({
      token: async () => "tok",
      post: async (build) => {
        const built = build(config);
        calls.push({
          url: built.url,
          body: JSON.parse(String(built.init.body)),
          auth: built.init.headers.Authorization,
        });
        return built.url.endsWith("companion_plans")
          ? { ok: true, status: 200, bodyText: body(serverPlansV1) }
          : {
              ok: true,
              status: 200,
              bodyText: body({ tier: "free", unlimitedTickets: false, entitlements: [] }),
            };
      },
    });
    expect(await client.catalog()).toEqual(catalogV1);
    expect(await client.entitlements()).toEqual({
      tier: "free",
      unlimitedTickets: false,
      entitlements: [],
    });
    expect(calls).toEqual([
      {
        url: "https://example.supabase.co/rest/v1/rpc/companion_plans",
        body: {},
        auth: "Bearer tok",
      },
      {
        url: "https://example.supabase.co/rest/v1/rpc/companion_entitlements",
        body: {},
        auth: "Bearer tok",
      },
    ]);

    const noToken = createPlansClient({
      token: async () => null,
      post: async () => {
        throw new Error("부르지 않아야 함");
      },
    });
    expect(await noToken.catalog()).toBeNull();
    expect(await noToken.entitlements()).toBeNull();
    const failed = createPlansClient({
      token: async () => "tok",
      post: async () => ({ ok: true, status: 404, bodyText: "{}" }),
    });
    expect(await failed.catalog()).toBeNull();
    const offline = createPlansClient({
      token: async () => "tok",
      post: async () => ({ ok: false, reason: "network" }),
    });
    expect(await offline.entitlements()).toBeNull();
    const throws = createPlansClient({
      token: async () => {
        throw new Error("storage");
      },
      post: async () => ({ ok: true, status: 200, bodyText: "{}" }),
    });
    expect(await throws.catalog()).toBeNull();
  });
});
