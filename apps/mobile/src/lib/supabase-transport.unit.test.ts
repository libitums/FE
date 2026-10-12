import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { authRequestTimeoutMs, sendGet } from "./supabase-transport";

// `unit` 계층: `sendGet`(GET 전용 전송)의 입출력을 `fetch` 대역으로 봅니다.

const URL_BASE = "https://x.supabase.co";

beforeEach(() => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", URL_BASE);
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "anon-key");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const build = (config: { url: string }): string =>
  `${config.url}/storage/v1/object/public/content/m.json`;
const headers = (config: { anonKey: string }): Record<string, string> => ({
  apikey: config.anonKey,
});

describe("sendGet", () => {
  test("G1. 설정이 없으면 전송 없이 unconfigured", async () => {
    vi.stubEnv("PUBLIC_SUPABASE_URL", "");
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect(await sendGet(build, headers)).toEqual({ ok: false, reason: "unconfigured" });
    expect(spy).not.toHaveBeenCalled();
  });

  test.each([0, 499])("G2. status %i는 network", async (status) => {
    vi.stubGlobal("fetch", async () => ({ status, text: async () => "" }));
    expect(await sendGet(build, headers)).toEqual({ ok: false, reason: "network" });
  });

  test("G3. 전송이 reject해도 던지지 않고 network", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("down")));
    expect(await sendGet(build, headers)).toEqual({ ok: false, reason: "network" });
  });

  test("G4. 제한 시간 안에 응답이 없으면 network", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", () => new Promise(() => undefined));
    const pending = sendGet(build, headers);
    await vi.advanceTimersByTimeAsync(authRequestTimeoutMs + 1);
    expect(await pending).toEqual({ ok: false, reason: "network" });
  });

  test("G5. 성공하면 status와 본문을 낸다 · GET · 헤더 · 본문 없음", async () => {
    const spy = vi.fn(async () => ({ status: 200, text: async () => "hello" }));
    vi.stubGlobal("fetch", spy);
    expect(await sendGet(build, headers)).toEqual({ ok: true, status: 200, bodyText: "hello" });
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(url).toBe(`${URL_BASE}/storage/v1/object/public/content/m.json`);
    expect(init["method"]).toBe("GET");
    expect(init["headers"]).toEqual({ apikey: "anon-key" });
    expect(init["body"]).toBeUndefined();
  });
});
