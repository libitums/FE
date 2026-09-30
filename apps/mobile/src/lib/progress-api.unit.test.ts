import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { authSessionStorageKey, serializeAuthSession } from "./auth-session";
import {
  currentAccessToken,
  fetchLearningStreak,
  loadLearningProgress,
  localDayFrom,
  recordLearningDay,
  saveLearningProgress,
} from "./progress-api";

type Call = { url: string; body: string; auth: string | undefined };

function install(
  options: { expiresAt?: number; reply?: (url: string) => { status: number; body: string } } = {},
) {
  const store = new Map<string, string>();
  store.set(
    authSessionStorageKey,
    serializeAuthSession({
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: options.expiresAt ?? 4_102_444_800_000,
    }),
  );
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  const calls: Call[] = [];
  vi.stubGlobal("fetch", (url: string, init: { body: string; headers: Record<string, string> }) => {
    calls.push({ url, body: init.body, auth: init.headers["Authorization"] });
    const reply = options.reply?.(url) ?? { status: 200, body: "null" };
    return Promise.resolve({ status: reply.status, text: async () => reply.body });
  });
  return { calls, store };
}

beforeEach(() => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("PA1 요청", () => {
  test("RPC 넷이 사용자 토큰으로 경로 · 본문을 싣는다", async () => {
    const { calls } = install({
      reply: (url) =>
        url.endsWith("load_learning_progress")
          ? { status: 200, body: '{"version":1}' }
          : { status: 200, body: "4" },
    });
    await expect(loadLearningProgress()).resolves.toEqual({ ok: true, raw: { version: 1 } });
    await expect(saveLearningProgress({ version: 1 })).resolves.toBe(true);
    await expect(recordLearningDay("2026-09-30")).resolves.toBe(4);
    await expect(fetchLearningStreak("2026-09-30")).resolves.toBe(4);
    expect(
      calls.map((call) => [call.url.replace("https://test.supabase.co", ""), call.body]),
    ).toEqual([
      ["/rest/v1/rpc/load_learning_progress", "{}"],
      ["/rest/v1/rpc/save_learning_progress", '{"p_progress":{"version":1}}'],
      ["/rest/v1/rpc/record_learning_day", '{"p_day":"2026-09-30"}'],
      ["/rest/v1/rpc/learning_streak", '{"p_today":"2026-09-30"}'],
    ]);
    expect(new Set(calls.map((call) => call.auth))).toEqual(new Set(["Bearer access"]));
  });

  test("저장된 적 없음(null)은 성공, 요청 실패는 ok: false — 둘을 가른다", async () => {
    install({ reply: () => ({ status: 200, body: "null" }) });
    await expect(loadLearningProgress()).resolves.toEqual({ ok: true, raw: null });
    vi.unstubAllGlobals();
    install({ reply: () => ({ status: 500, body: "" }) });
    await expect(loadLearningProgress()).resolves.toEqual({ ok: false });
    await expect(saveLearningProgress({})).resolves.toBe(false);
    await expect(recordLearningDay("2026-09-30")).resolves.toBeNull();
  });

  test("연속 일수는 0 이상 정수만 받는다", async () => {
    install({ reply: () => ({ status: 200, body: '"3"' }) });
    await expect(fetchLearningStreak("2026-09-30")).resolves.toBeNull();
  });
});

describe("PA2 currentAccessToken", () => {
  test("세션이 없으면 null이고 요청하지 않는다", async () => {
    const { calls, store } = install();
    store.clear();
    await expect(currentAccessToken()).resolves.toBeNull();
    await expect(saveLearningProgress({})).resolves.toBe(false);
    expect(calls).toHaveLength(0);
  });

  test("만료가 가까우면 먼저 갱신해 저장하고 새 토큰을 쓴다", async () => {
    const { calls, store } = install({
      expiresAt: 0,
      reply: (url) =>
        url.includes("grant_type=refresh_token")
          ? {
              status: 200,
              body: JSON.stringify({
                access_token: "fresh",
                refresh_token: "r2",
                expires_in: 3600,
                token_type: "bearer",
                user: { id: "u" },
              }),
            }
          : { status: 200, body: "null" },
    });
    await saveLearningProgress({ version: 1 });
    expect(calls).toHaveLength(2);
    expect(calls[0]!.url).toContain("grant_type=refresh_token");
    expect(calls[1]!.url).toContain("/rest/v1/rpc/save_learning_progress");
    expect(calls[1]!.auth).toBe("Bearer fresh");
    expect(store.get(authSessionStorageKey)).toContain("fresh");
  });
});

describe("PA3 localDayFrom", () => {
  test("기기 시간대의 날짜를 YYYY-MM-DD로 낸다", () => {
    expect(localDayFrom(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localDayFrom(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
  });
});
