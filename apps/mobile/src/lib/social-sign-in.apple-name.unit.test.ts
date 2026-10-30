import { afterEach, expect, test, vi } from "vitest";

import { signInWithSocialProvider } from "./social-sign-in";

// `unit` 계층: Apple이 첫 동의 때 준 이름을 계정에 적고 세션을 한 번 갱신합니다(ADR-0028 2026-10-26 보충).
// 어느 단계가 실패해도 교환한 세션으로 로그인합니다.

const rfcHex = "7418dfb49799e0254ffa607dd8adbbba16d4254d69d6bff05b58055853848d79";

function stubConfig(): void {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
}

function stubApple(payload: Record<string, unknown>): void {
  vi.stubGlobal("NativeModules", {
    WebAuthenticationModule: { start: vi.fn(), randomBytes: vi.fn(() => rfcHex) },
    AppleSignInModule: {
      start: (_args: unknown, callback: (value: unknown) => void) =>
        callback({ status: "completed", identityToken: "idt", ...payload }),
    },
  });
}

const sessionBody = (token: string) => ({
  access_token: token,
  refresh_token: `${token}-rt`,
  expires_in: 3600,
});

type Call = [string, { method: string; headers: Record<string, string>; body: string }];

function stubFetch(statusByPath: Record<string, number>, bodyByPath: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string) => {
    const path = new URL(url).pathname + new URL(url).search;
    return {
      status: statusByPath[path] ?? 500,
      text: async () => JSON.stringify(bodyByPath[path] ?? {}),
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const exchangePath = "/auth/v1/token?grant_type=id_token";
const refreshPath = "/auth/v1/token?grant_type=refresh_token";
const userPath = "/auth/v1/user";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("SN1. 이름이 오면 PUT /auth/v1/user로 full_name · name을 적고, 갱신한 세션으로 로그인한다", async () => {
  stubConfig();
  stubApple({ fullName: "김세현" });
  const fetchMock = stubFetch(
    { [exchangePath]: 200, [userPath]: 200, [refreshPath]: 200 },
    { [exchangePath]: sessionBody("at1"), [refreshPath]: sessionBody("at2") },
  );

  await expect(signInWithSocialProvider("apple")).resolves.toMatchObject({
    status: "signed-in",
    session: { accessToken: "at2", refreshToken: "at2-rt" },
  });
  const calls = fetchMock.mock.calls as unknown as Call[];
  expect(calls.map(([url]) => new URL(url).pathname)).toEqual([
    "/auth/v1/token",
    userPath,
    "/auth/v1/token",
  ]);
  const [, update] = calls[1] as Call;
  expect(update.method).toBe("PUT");
  expect(update.headers["Authorization"]).toBe("Bearer at1");
  expect(JSON.parse(update.body)).toEqual({ data: { full_name: "김세현", name: "김세현" } });
  expect(JSON.parse((calls[2] as Call)[1].body)).toEqual({ refresh_token: "at1-rt" });
});

test("SN2. 이름이 없으면(두 번째 로그인부터) 교환 한 번뿐이다", async () => {
  stubConfig();
  stubApple({});
  const fetchMock = stubFetch({ [exchangePath]: 200 }, { [exchangePath]: sessionBody("at1") });

  await expect(signInWithSocialProvider("apple")).resolves.toMatchObject({
    session: { accessToken: "at1" },
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("SN3. 이름 저장이나 갱신이 실패해도 교환한 세션으로 로그인한다", async () => {
  stubConfig();
  stubApple({ fullName: "Sehyun Kim" });
  stubFetch({ [exchangePath]: 200, [userPath]: 500 }, { [exchangePath]: sessionBody("at1") });
  await expect(signInWithSocialProvider("apple")).resolves.toMatchObject({
    status: "signed-in",
    session: { accessToken: "at1" },
  });

  stubFetch(
    { [exchangePath]: 200, [userPath]: 200, [refreshPath]: 401 },
    { [exchangePath]: sessionBody("at1") },
  );
  await expect(signInWithSocialProvider("apple")).resolves.toMatchObject({
    status: "signed-in",
    session: { accessToken: "at1" },
  });
});
