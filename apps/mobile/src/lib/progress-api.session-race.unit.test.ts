import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { clearAuthSession, loadAuthSession, saveAuthSession } from "./auth-session";
import { fetchLearningStreak, saveLearningProgress } from "./progress-api";

type Response = { status: number; text: () => Promise<string> };
type Request = { body: string; headers: Record<string, string> };

function install() {
  const store = new Map<string, string>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  const refreshes: { token: string; finish: (status?: number) => void }[] = [];
  const rpcTokens: string[] = [];
  vi.stubGlobal("fetch", (url: string, init: Request): Promise<Response> => {
    if (url.includes("grant_type=refresh_token")) {
      const token = (JSON.parse(init.body) as { refresh_token: string }).refresh_token;
      return new Promise((resolve) => {
        refreshes.push({
          token,
          finish: (status = 200) =>
            resolve({
              status,
              text: async () =>
                JSON.stringify({
                  access_token: `${token}-access`,
                  refresh_token: `${token}-next`,
                  expires_in: 3600,
                  token_type: "bearer",
                  user: { id: token },
                }),
            }),
        });
      });
    }
    rpcTokens.push(init.headers["Authorization"]!);
    return Promise.resolve({ status: 200, text: async () => "1" });
  });
  return { refreshes, rpcTokens };
}

function signIn(name: string, expiresAt = 0): void {
  saveAuthSession({ accessToken: name, refreshToken: `${name}-refresh`, expiresAt });
}

beforeEach(() => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-key");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("갱신을 기다리다 로그아웃하면 세션을 되살리거나 이전 학습 RPC를 보내지 않는다", async () => {
  const { refreshes, rpcTokens } = install();
  signIn("A");
  const pending = saveLearningProgress({ version: 1 });
  clearAuthSession();
  refreshes[0]!.finish();
  const result = await pending;
  expect({ result, session: loadAuthSession(), rpcTokens }).toEqual({
    result: false,
    session: null,
    rpcTokens: [],
  });
});

test("이전 계정의 늦은 갱신은 새 계정 세션을 덮어쓰지 않는다", async () => {
  const { refreshes, rpcTokens } = install();
  signIn("A");
  const pending = saveLearningProgress({ version: 1 });
  clearAuthSession();
  signIn("B", 4_102_444_800_000);
  refreshes[0]!.finish();
  const result = await pending;
  expect({ result, token: loadAuthSession()?.accessToken, rpcTokens }).toEqual({
    result: false,
    token: "B",
    rpcTokens: [],
  });
});

test.each(["old-first", "new-first"])(
  "계정별 갱신은 분리하고 같은 계정 호출만 공유한다: %s",
  async (order) => {
    const { refreshes, rpcTokens } = install();
    signIn("A");
    const oldSave = saveLearningProgress({ owner: "A" });
    clearAuthSession();
    signIn("B");
    const newSave = saveLearningProgress({ owner: "B" });
    const newStreak = fetchLearningStreak("2026-09-30");
    // 수정 전에는 B 요청도 A 응답을 기다립니다. 어느 구현에서도 요청을 모두 끝낸 후 단언합니다.
    const older = refreshes[0]!;
    const newer = refreshes[1];
    let extraStreak: Promise<number | null> | undefined;
    if (order === "old-first") {
      older.finish();
      await oldSave;
      extraStreak = fetchLearningStreak("2026-09-30");
      newer?.finish();
    } else {
      newer?.finish();
      older.finish();
    }
    const results = await Promise.all([oldSave, newSave, newStreak, extraStreak]);
    expect(refreshes.map(({ token }) => token)).toEqual(["A-refresh", "B-refresh"]);
    expect(results.slice(0, 3)).toEqual([false, true, 1]);
    expect(new Set(rpcTokens)).toEqual(new Set(["Bearer B-refresh-access"]));
    expect(loadAuthSession()?.accessToken).toBe("B-refresh-access");
  },
);

test("토큰 조회 직후 로그아웃해도 RPC를 보내지 않는다", async () => {
  const { rpcTokens } = install();
  signIn("A", 4_102_444_800_000);
  const pending = saveLearningProgress({ version: 1 });
  clearAuthSession();
  expect(await pending).toBe(false);
  expect(rpcTokens).toEqual([]);
});

test("갱신 실패 뒤에는 같은 세션으로 다시 갱신할 수 있다", async () => {
  const { refreshes, rpcTokens } = install();
  signIn("A");
  const failed = saveLearningProgress({ version: 1 });
  refreshes[0]!.finish(500);
  expect(await failed).toBe(false);
  const retry = saveLearningProgress({ version: 1 });
  refreshes[1]!.finish();
  expect(await retry).toBe(true);
  expect(refreshes).toHaveLength(2);
  expect(rpcTokens).toEqual(["Bearer A-refresh-access"]);
});
