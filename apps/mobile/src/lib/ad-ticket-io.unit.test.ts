import { afterEach, describe, expect, test, vi } from "vitest";

import { adTicketStartFrom, adTicketStatusFrom, createAdTicketClient } from "./ad-ticket-api";
import { adTicketFlagKey, createAdTicketFlag } from "./ad-ticket-flag";
import type { AnalyticsConfig } from "./analytics.contract";
import {
  loadRewardedAd,
  rewardedAdAvailable,
  rewardedAdLoadOf,
  rewardedAdShowOf,
  showRewardedAd,
} from "./rewarded-ad";
import type { AuthRequestOutcome } from "./supabase-transport";

// 광고 보고 티켓(ADR-0209)의 바깥 접점 — 서버 RPC 둘 · PostHog 플래그 · 호스트 광고 모듈. 모두 던지지 않는다.
const ok = (body: unknown): AuthRequestOutcome =>
  ({ ok: true, status: 200, bodyText: JSON.stringify(body) }) as AuthRequestOutcome;
const config = { url: "https://db.example", anonKey: "anon" } as never;

describe("AT-A1 서버 응답 읽기", () => {
  test("상태: 값 다섯 · 요청은 있을 때만", () => {
    expect(
      adTicketStatusFrom(
        JSON.stringify({
          enabled: true,
          eligible: true,
          reason: null,
          cap: 2,
          used: 1,
          left: 1,
          request: { id: "r", status: "granted", reason: null },
        }),
      ),
    ).toEqual({
      enabled: true,
      eligible: true,
      cap: 2,
      left: 1,
      request: { status: "granted", reason: null },
    });
    expect(
      adTicketStatusFrom(
        JSON.stringify({
          enabled: false,
          eligible: false,
          reason: "off",
          cap: 2,
          left: 2,
          request: null,
        }),
      ),
    ).toMatchObject({ enabled: false, request: null });
  });
  test("상태: 모양이 틀리면 null", () => {
    for (const body of [
      null,
      "",
      "x",
      JSON.stringify({ enabled: true }),
      JSON.stringify({ enabled: true, eligible: true, cap: -1, left: 0 }),
    ]) {
      expect(adTicketStatusFrom(body)).toBeNull();
    }
    expect(
      adTicketStatusFrom(
        JSON.stringify({
          enabled: true,
          eligible: true,
          cap: 2,
          left: 1,
          request: { status: "weird" },
        }),
      ),
    ).toBeNull();
  });
  test("시작: ok는 요청 id까지, blocked · limit, 틀리면 null", () => {
    expect(
      adTicketStartFrom(JSON.stringify({ result: "ok", requestId: "r-1", left: 2, cap: 2 })),
    ).toEqual({
      result: "ok",
      requestId: "r-1",
      left: 2,
      cap: 2,
    });
    expect(adTicketStartFrom(JSON.stringify({ result: "limit", left: 0, cap: 2 }))).toEqual({
      result: "limit",
      left: 0,
      cap: 2,
    });
    expect(
      adTicketStartFrom(JSON.stringify({ result: "blocked", reason: "off", left: 2, cap: 2 }))
        ?.result,
    ).toBe("blocked");
    expect(adTicketStartFrom(JSON.stringify({ result: "ok", left: 2, cap: 2 }))).toBeNull();
    expect(adTicketStartFrom("{")).toBeNull();
  });
});

describe("AT-A2 서버 요청", () => {
  test("로그인이 없으면 null · 부르지 않는다", async () => {
    const post = vi.fn<(build: unknown) => Promise<AuthRequestOutcome>>();
    const client = createAdTicketClient({ token: async () => null, post });
    expect(await client.status(420)).toBeNull();
    expect(await client.start(420)).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
  test("상태 · 시작은 RPC 경로와 인수(오프셋 · 요청 id)를 싣는다", async () => {
    const built: { url: string; body: unknown }[] = [];
    const client = createAdTicketClient({
      token: async () => "tok",
      post: async (build) => {
        const { url, init } = build(config);
        built.push({ url, body: JSON.parse(String(init.body)) });
        return url.endsWith("ad_ticket_start")
          ? ok({ result: "ok", requestId: "r-1", left: 2, cap: 2 })
          : ok({ enabled: true, eligible: true, cap: 2, left: 2, request: null });
      },
    });
    expect((await client.status(420, "r-1"))?.left).toBe(2);
    expect((await client.status(-300))?.cap).toBe(2);
    expect((await client.start(420))?.result).toBe("ok");
    expect(built).toEqual([
      {
        url: "https://db.example/rest/v1/rpc/ad_ticket_status",
        body: { p_utc_offset_min: 420, p_request_id: "r-1" },
      },
      {
        url: "https://db.example/rest/v1/rpc/ad_ticket_status",
        body: { p_utc_offset_min: -300, p_request_id: null },
      },
      { url: "https://db.example/rest/v1/rpc/ad_ticket_start", body: { p_utc_offset_min: 420 } },
    ]);
  });
  test("실패 · 던짐은 null", async () => {
    const failing = createAdTicketClient({
      token: async () => "tok",
      post: async () => ({ ok: false, reason: "network" }),
    });
    expect(await failing.start(0)).toBeNull();
    const throwing = createAdTicketClient({
      token: async () => {
        throw new Error("x");
      },
      post: async () => ok({}),
    });
    expect(await throwing.status(0)).toBeNull();
  });
});

describe("AT-A3 PostHog 플래그", () => {
  const posthog: AnalyticsConfig = {
    projectKey: "phc_test",
    host: "https://us.i.posthog.com",
    environment: "development",
  };
  const reply = (flag: unknown) => ({
    status: 200,
    text: async () => JSON.stringify({ flags: { [adTicketFlagKey]: flag } }),
    json: async () => ({}),
  });

  test("/flags/?v=2에 프로젝트 키 · 사용자 id를 보내 실험군을 읽고, 10분 동안 다시 묻지 않는다", async () => {
    let now = 0;
    const calls: { url: string; body: unknown }[] = [];
    const flag = createAdTicketFlag({
      config: posthog,
      transport: async (url, init) => {
        calls.push({ url, body: JSON.parse(String(init.body)) });
        return reply({ enabled: true, variant: "test" }) as never;
      },
      nowMs: () => now,
    });
    expect(await flag.arm("user-1")).toBe("test");
    expect(await flag.arm("user-1")).toBe("test");
    expect(calls).toEqual([
      {
        url: "https://us.i.posthog.com/flags/?v=2",
        body: { api_key: "phc_test", distinct_id: "user-1" },
      },
    ]);
    now += 10 * 60_000 + 1;
    await flag.arm("user-1");
    await flag.arm("user-2");
    expect(calls).toHaveLength(3);
  });

  test("설정 · 전송이 없거나 실패하면 control(기본 꺼짐)", async () => {
    expect(
      await createAdTicketFlag({ config: null, transport: null, nowMs: () => 0 }).arm("u"),
    ).toBe("control");
    const failing = createAdTicketFlag({
      config: posthog,
      transport: async () => {
        throw new Error("offline");
      },
      nowMs: () => 0,
    });
    expect(await failing.arm("u")).toBe("control");
  });
});

describe("AT-A4 호스트 광고 모듈", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  test("결과 읽기 — 모르는 값은 안전한 쪽(unavailable · failed)", () => {
    expect(rewardedAdLoadOf({ status: "loaded" })).toBe("loaded");
    expect(rewardedAdLoadOf({ status: "no_fill" })).toBe("unavailable");
    expect(rewardedAdLoadOf(null)).toBe("unavailable");
    expect(rewardedAdShowOf({ status: "earned" })).toBe("earned");
    expect(rewardedAdShowOf({ status: "dismissed" })).toBe("dismissed");
    expect(rewardedAdShowOf("x")).toBe("failed");
  });
  test("모듈이 없으면 쓸 수 없고 결과는 unavailable · failed", async () => {
    vi.stubGlobal("NativeModules", {});
    expect(rewardedAdAvailable()).toBe(false);
    expect(await loadRewardedAd()).toBe("unavailable");
    expect(await showRewardedAd("u", "r")).toBe("failed");
  });
  test("모듈이 있으면 불러오기 · 보여 주기에 사용자 id · 요청 id를 넘긴다", async () => {
    const shown: string[][] = [];
    vi.stubGlobal("NativeModules", {
      RewardedAdModule: {
        loadRewarded: (callback: (payload: unknown) => void) => callback({ status: "loaded" }),
        showRewarded: (
          userId: string,
          customData: string,
          callback: (payload: unknown) => void,
        ) => {
          shown.push([userId, customData]);
          callback({ status: "earned" });
        },
      },
    });
    expect(rewardedAdAvailable()).toBe(true);
    expect(await loadRewardedAd()).toBe("loaded");
    expect(await showRewardedAd("user-1", "req-1")).toBe("earned");
    expect(shown).toEqual([["user-1", "req-1"]]);
  });
  test("호스트가 던지면 unavailable · failed", async () => {
    vi.stubGlobal("NativeModules", {
      RewardedAdModule: {
        loadRewarded: () => {
          throw new Error("x");
        },
        showRewarded: () => {
          throw new Error("x");
        },
      },
    });
    expect(await loadRewardedAd()).toBe("unavailable");
    expect(await showRewardedAd("u", "r")).toBe("failed");
  });
});
