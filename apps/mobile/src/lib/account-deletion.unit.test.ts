import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  accessTokenRefreshMarginMs,
  deleteAccount,
  reauthenticateWithApple,
  requiresAppleReauthentication,
  sessionNeedsRefresh,
} from "./account-deletion";
import type { AuthSession } from "./auth-session.contract";

// test-plan §2.3 AT1 · AT2 · AD1 ~ AD6. 대역: fetch(URL로 가름) · NativeModules(WebAuthenticationModule.randomBytes ·
// AppleSignInModule.start · StorageModule) · 가짜 시계(Date만).

const nowMs = Date.UTC(2026, 8, 30, 12, 0, 0);
const hex64 = "7418dfb49799e0254ffa607dd8adbbba16d4254d69d6bff05b58055853848d79";

function tokenWith(payload: unknown): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${part({ alg: "HS256", typ: "JWT" })}.${part(payload)}.sig`;
}

const googleToken = tokenWith({
  sub: "u1",
  app_metadata: { provider: "google", providers: ["google"] },
});
const appleToken = tokenWith({
  sub: "u1",
  app_metadata: { provider: "apple", providers: ["apple"] },
});

const sessionWith = (accessToken: string, expiresInMs = 3_600_000): AuthSession => ({
  accessToken,
  refreshToken: "refresh-old",
  expiresAt: nowMs + expiresInMs,
});

type Reply = { status: number } | Error;

// 갱신 · 삭제 함수 호출을 URL로 가르는 fetch 대역입니다. 호출 순서를 `events`에 남깁니다.
function setup(options: {
  refresh?: Reply | { status: 200; body: unknown };
  del?: Reply;
  randomBytes?: () => unknown;
  start?: (cb: (payload: unknown) => void) => void;
  host?: boolean;
}) {
  const events: string[] = [];
  const deleteCalls: { url: string; init: { headers: Record<string, string>; body: string } }[] =
    [];
  const refreshCalls: unknown[] = [];
  const reply = (spec: Reply | { status: 200; body: unknown } | undefined) => {
    if (spec === undefined) {
      throw new Error("unexpected fetch");
    }
    if (spec instanceof Error) {
      throw spec;
    }
    const body = "body" in spec ? JSON.stringify(spec.body) : "";
    return { status: spec.status, text: async () => body };
  };
  const fetchMock = vi.fn(async (url: string, init: never) => {
    if (url.includes("/auth/v1/token?grant_type=refresh_token")) {
      events.push("refresh");
      refreshCalls.push(init);
      return reply(options.refresh);
    }
    if (url.endsWith("/functions/v1/delete-account")) {
      events.push("delete");
      deleteCalls.push({ url, init });
      return reply(options.del ?? { status: 204 });
    }
    throw new Error(`unexpected url ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  const start = vi.fn((_args: Record<string, unknown>, cb: (payload: unknown) => void) => {
    events.push("sheet");
    (options.start ?? (() => undefined))(cb);
  });
  const randomBytes = vi.fn(options.randomBytes ?? (() => hex64));
  const storage = { get: vi.fn(() => null), set: vi.fn(), remove: vi.fn() };
  if (options.host !== false) {
    vi.stubGlobal("NativeModules", {
      WebAuthenticationModule: { randomBytes },
      AppleSignInModule: { start },
      StorageModule: storage,
    });
  }
  return { events, deleteCalls, refreshCalls, fetchMock, start, randomBytes, storage };
}

beforeEach(() => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(nowMs);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

// ------------------------------------------------------------------ 순수

describe("sessionNeedsRefresh · requiresAppleReauthentication", () => {
  test("AT1: 여유 상수는 60_000이다", () => {
    expect(accessTokenRefreshMarginMs).toBe(60_000);
  });

  test("AT1: 남은 시간 60_001 → false · 60_000 → true · 음수 → true", () => {
    const session = (expiresAt: number): AuthSession => ({
      accessToken: "a",
      refreshToken: "r",
      expiresAt,
    });
    expect(sessionNeedsRefresh(session(nowMs + 60_001), nowMs)).toBe(false);
    expect(sessionNeedsRefresh(session(nowMs + 60_000), nowMs)).toBe(true);
    expect(sessionNeedsRefresh(session(nowMs + 1), nowMs)).toBe(true);
    expect(sessionNeedsRefresh(session(nowMs - 5_000), nowMs)).toBe(true);
    expect(sessionNeedsRefresh(session(nowMs + 3_600_000), nowMs)).toBe(false);
  });

  test("AT2: apple이 정확히 들어 있을 때만 true", () => {
    expect(requiresAppleReauthentication(["apple"])).toBe(true);
    expect(requiresAppleReauthentication(["google", "apple"])).toBe(true);
    expect(requiresAppleReauthentication([])).toBe(false);
    expect(requiresAppleReauthentication(["google"])).toBe(false);
    expect(requiresAppleReauthentication(["Apple"])).toBe(false);
  });
});

// ------------------------------------------------------------------ AD1 재인증

describe("reauthenticateWithApple", () => {
  test("AD1: 난수 실패(빈 문자열)면 failed이고 시트는 열지 않는다", async () => {
    const { start } = setup({ randomBytes: () => "" });
    await expect(reauthenticateWithApple()).resolves.toStrictEqual({ status: "failed" });
    expect(start).not.toHaveBeenCalled();
  });

  test("AD1: 호스트 모듈이 없으면 failed", async () => {
    setup({ host: false });
    vi.stubGlobal("NativeModules", {});
    await expect(reauthenticateWithApple()).resolves.toStrictEqual({ status: "failed" });
  });

  test("AD1: start 인자는 소문자 16진 64자 nonce 키 하나뿐이다", async () => {
    const { start } = setup({
      start: (cb) => cb({ status: "completed", identityToken: "t", authorizationCode: "c" }),
    });
    await reauthenticateWithApple();
    expect(start).toHaveBeenCalledTimes(1);
    const [args] = start.mock.calls[0]!;
    expect(Object.keys(args)).toStrictEqual(["nonce"]);
    expect(args["nonce"]).toMatch(/^[0-9a-f]{64}$/);
  });

  test("AD1: completed + 코드 → confirmed(코드)", async () => {
    setup({
      start: (cb) => cb({ status: "completed", identityToken: "t", authorizationCode: "code" }),
    });
    await expect(reauthenticateWithApple()).resolves.toStrictEqual({
      status: "confirmed",
      authorizationCode: "code",
    });
  });

  test("AD1: completed인데 코드가 없거나 비면 failed", async () => {
    setup({ start: (cb) => cb({ status: "completed", identityToken: "t" }) });
    await expect(reauthenticateWithApple()).resolves.toStrictEqual({ status: "failed" });
    setup({
      start: (cb) => cb({ status: "completed", identityToken: "t", authorizationCode: "" }),
    });
    await expect(reauthenticateWithApple()).resolves.toStrictEqual({ status: "failed" });
  });

  test("AD1: cancelled → cancelled", async () => {
    setup({ start: (cb) => cb({ status: "cancelled" }) });
    await expect(reauthenticateWithApple()).resolves.toStrictEqual({ status: "cancelled" });
  });

  test.each<[label: string, payload: unknown]>([
    ["failed", { status: "failed" }],
    ["already-active", { status: "already-active" }],
    ["invalid-arguments", { status: "invalid-arguments" }],
    ["모양 오류", { status: "weird" }],
    ["null 페이로드", null],
  ])("AD1: %s → failed", async (_label, payload) => {
    setup({ start: (cb) => cb(payload) });
    await expect(reauthenticateWithApple()).resolves.toStrictEqual({ status: "failed" });
  });

  test("AD1: start가 던져도 거부하지 않는다", async () => {
    setup({
      start: () => {
        throw new Error("bridge down");
      },
    });
    await expect(reauthenticateWithApple()).resolves.toStrictEqual({ status: "failed" });
  });
});

// ------------------------------------------------------------------ deleteAccount

describe("deleteAccount", () => {
  test("AD2: 설정이 없으면 unconfigured이고 fetch · 시트 · persist 모두 0", async () => {
    vi.stubEnv("PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "");
    const { fetchMock, start } = setup({});
    const persist = vi.fn();

    const result = await deleteAccount(sessionWith(appleToken, 10), persist);

    expect(result).toStrictEqual({ status: "failed", reason: "unconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  test("AD3: 비 Apple 사용자 — 갱신 0 · 시트 0 · 삭제 1회(Bearer = 세션 토큰 · 코드 null) → deleted", async () => {
    const { events, deleteCalls, start } = setup({});
    const persist = vi.fn();

    const result = await deleteAccount(sessionWith(googleToken), persist);

    expect(result).toStrictEqual({ status: "deleted" });
    expect(events).toStrictEqual(["delete"]);
    expect(start).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
    expect(deleteCalls[0]!.init.headers["Authorization"]).toBe(`Bearer ${googleToken}`);
    expect(JSON.parse(deleteCalls[0]!.init.body)).toStrictEqual({ apple_authorization_code: null });
  });

  test("AD4: Apple 사용자 — 시트 1회 뒤 삭제 fetch, 본문 코드 = 시트 코드", async () => {
    const { events, deleteCalls, start } = setup({
      start: (cb) =>
        cb({ status: "completed", identityToken: "t", authorizationCode: "sheet-code" }),
    });

    const result = await deleteAccount(sessionWith(appleToken), vi.fn());

    expect(result).toStrictEqual({ status: "deleted" });
    expect(start).toHaveBeenCalledTimes(1);
    expect(events).toStrictEqual(["sheet", "delete"]);
    expect(JSON.parse(deleteCalls[0]!.init.body)).toStrictEqual({
      apple_authorization_code: "sheet-code",
    });
  });

  test("AD4: 시트 cancelled → cancelled이고 삭제 fetch 0", async () => {
    const { events } = setup({ start: (cb) => cb({ status: "cancelled" }) });

    const result = await deleteAccount(sessionWith(appleToken), vi.fn());

    expect(result).toStrictEqual({ status: "cancelled" });
    expect(events).toStrictEqual(["sheet"]);
  });

  test("AD4: 시트 실패 → failed/apple-unconfirmed이고 삭제 fetch 0", async () => {
    const { events } = setup({ start: (cb) => cb({ status: "failed" }) });

    const result = await deleteAccount(sessionWith(appleToken), vi.fn());

    expect(result).toStrictEqual({ status: "failed", reason: "apple-unconfirmed" });
    expect(events).toStrictEqual(["sheet"]);
  });

  test("AD4: 코드 없는 completed도 apple-unconfirmed(삭제 0)", async () => {
    const { events } = setup({ start: (cb) => cb({ status: "completed", identityToken: "t" }) });

    const result = await deleteAccount(sessionWith(appleToken), vi.fn());

    expect(result).toStrictEqual({ status: "failed", reason: "apple-unconfirmed" });
    expect(events).not.toContain("delete");
  });

  test("AD5: 만료 30초 전 — 갱신이 먼저, persist 1회(새 세션), 삭제 Bearer는 새 액세스 토큰", async () => {
    const newToken = tokenWith({ sub: "u1", app_metadata: { provider: "google" } });
    const { events, deleteCalls } = setup({
      refresh: {
        status: 200,
        body: { access_token: newToken, refresh_token: "refresh-new", expires_in: 3600 },
      },
    });
    const persist = vi.fn();

    const result = await deleteAccount(sessionWith(googleToken, 30_000), persist);

    expect(result).toStrictEqual({ status: "deleted" });
    expect(events).toStrictEqual(["refresh", "delete"]);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({
      accessToken: newToken,
      refreshToken: "refresh-new",
      expiresAt: nowMs + 3_600_000,
    });
    expect(deleteCalls[0]!.init.headers["Authorization"]).toBe(`Bearer ${newToken}`);
  });

  test("AD5: 갱신은 옛 refresh 토큰으로 요청한다", async () => {
    const { refreshCalls } = setup({
      refresh: {
        status: 200,
        body: { access_token: googleToken, refresh_token: "refresh-new", expires_in: 3600 },
      },
    });

    await deleteAccount(sessionWith(googleToken, 30_000), vi.fn());

    expect(refreshCalls).toHaveLength(1);
    expect(JSON.parse((refreshCalls[0] as { body: string }).body)).toStrictEqual({
      refresh_token: "refresh-old",
    });
  });

  test("AD5: 경계 — 남은 시간 60_000이면 갱신하고 60_001이면 갱신하지 않는다", async () => {
    const refreshOk = {
      status: 200 as const,
      body: { access_token: googleToken, refresh_token: "r2", expires_in: 3600 },
    };
    const atMargin = setup({ refresh: refreshOk });
    await deleteAccount(sessionWith(googleToken, 60_000), vi.fn());
    expect(atMargin.events).toStrictEqual(["refresh", "delete"]);

    const beyond = setup({ refresh: refreshOk });
    await deleteAccount(sessionWith(googleToken, 60_001), vi.fn());
    expect(beyond.events).toStrictEqual(["delete"]);
  });

  test("AD5: 재인증 여부는 갱신 뒤의 새 액세스 토큰 providers로 가른다", async () => {
    const { events } = setup({
      refresh: {
        status: 200,
        body: { access_token: appleToken, refresh_token: "r2", expires_in: 3600 },
      },
      start: (cb) => cb({ status: "completed", identityToken: "t", authorizationCode: "c" }),
    });

    await deleteAccount(sessionWith(googleToken, 1_000), vi.fn());

    expect(events).toStrictEqual(["refresh", "sheet", "delete"]);
  });

  test("AD5: 갱신 400 → failed/session-expired · persist 0 · 삭제 0", async () => {
    const { events } = setup({ refresh: { status: 400 } });
    const persist = vi.fn();

    const result = await deleteAccount(sessionWith(googleToken, 1_000), persist);

    expect(result).toStrictEqual({ status: "failed", reason: "session-expired" });
    expect(persist).not.toHaveBeenCalled();
    expect(events).toStrictEqual(["refresh"]);
  });

  test("AD5: 갱신 연결 실패 → failed/network · persist 0 · 삭제 0", async () => {
    const { events } = setup({ refresh: new Error("connection refused") });
    const persist = vi.fn();

    const result = await deleteAccount(sessionWith(googleToken, 1_000), persist);

    expect(result).toStrictEqual({ status: "failed", reason: "network" });
    expect(persist).not.toHaveBeenCalled();
    expect(events).toStrictEqual(["refresh"]);
  });

  test("AD5: 갱신 5xx → failed/unavailable", async () => {
    setup({ refresh: { status: 503 } });
    await expect(deleteAccount(sessionWith(googleToken, 1_000), vi.fn())).resolves.toStrictEqual({
      status: "failed",
      reason: "unavailable",
    });
  });

  test.each<[label: string, reply: Reply, reason: string]>([
    ["401", { status: 401 }, "session-expired"],
    ["403", { status: 403 }, "apple-unconfirmed"],
    ["502", { status: 502 }, "unavailable"],
    ["fetch 거부", new Error("connection refused"), "network"],
  ])(
    "AD6: 삭제 요청 %s → failed/%s이고 거부하지 않으며 저장소를 만지지 않는다",
    async (_l, del, reason) => {
      const { storage } = setup({ del });
      const persist = vi.fn();

      const result = await deleteAccount(sessionWith(googleToken), persist);

      expect(result).toStrictEqual({ status: "failed", reason });
      expect(persist).not.toHaveBeenCalled();
      expect(storage.set).not.toHaveBeenCalled();
      expect(storage.remove).not.toHaveBeenCalled();
    },
  );
});
