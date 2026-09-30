import { afterEach, expect, test, vi } from "vitest";

import { authRequestTimeoutMs, requestAccountDeletion, signOutRemotely } from "./api-client";
import { deleteAccountFunctionRequest, supabaseLogoutRequest } from "./auth-request";

// test-plan §2.2 AC1(로그아웃 전송) · AC2(삭제 전송). fetch 대역으로 경계만 바꾼다.
// 기존 api-client.unit.test.ts의 AC1~AC13과 이름이 겹치지 않게 AC1-계정 · AC2-계정으로 적는다.

const config = { url: "https://test.supabase.co", anonKey: "test-anon-key" };

function stubConfig(): void {
  vi.stubEnv("PUBLIC_SUPABASE_URL", config.url);
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", config.anonKey);
}

type FakeResponse = { status: number; text: () => Promise<string> };

function response(status: number): { res: FakeResponse; text: ReturnType<typeof vi.fn> } {
  const text = vi.fn(async () => "");
  return { res: { status, text }, text };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

// ------------------------------------------------------------------ 로그아웃

test("AC1-계정. signOutRemotely — 정확히 한 번, AR1 쌍으로 보낸다", async () => {
  stubConfig();
  const fetchMock = vi.fn(async () => response(204).res);
  vi.stubGlobal("fetch", fetchMock);

  await signOutRemotely("access-1");

  const expected = supabaseLogoutRequest(config, "access-1");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith(expected.url, expected.init);
});

test.each([204, 401, 500, 0, 499])(
  "AC1-계정. status %i 응답도 undefined로 이행한다",
  async (status) => {
    stubConfig();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response(status).res),
    );

    await expect(signOutRemotely("t")).resolves.toBeUndefined();
  },
);

test("AC1-계정. fetch가 거부해도 이행한다", async () => {
  stubConfig();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("connection refused");
    }),
  );

  await expect(signOutRemotely("t")).resolves.toBeUndefined();
});

test("AC1-계정. 응답이 없어 제한 시간이 지나도 이행한다", async () => {
  stubConfig();
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => undefined)),
  );

  const settled = vi.fn();
  const pending = signOutRemotely("t").then(settled, () => undefined);
  await vi.advanceTimersByTimeAsync(authRequestTimeoutMs - 1);
  expect(settled).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  await pending;

  expect(settled).toHaveBeenCalledTimes(1);
});

test("AC1-계정. 설정이 없으면 fetch 없이 이행한다", async () => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "");
  const fetchMock = vi.fn(async () => response(204).res);
  vi.stubGlobal("fetch", fetchMock);

  await expect(signOutRemotely("t")).resolves.toBeUndefined();
  expect(fetchMock).not.toHaveBeenCalled();
});

// ------------------------------------------------------------------ 계정 삭제

test("AC2-계정. requestAccountDeletion — 요청 쌍은 AR2와 같고 정확히 한 번 보낸다", async () => {
  stubConfig();
  const fetchMock = vi.fn(async () => response(204).res);
  vi.stubGlobal("fetch", fetchMock);
  const request = { accessToken: "access-1", appleAuthorizationCode: "code-1" };

  await requestAccountDeletion(request);

  const expected = deleteAccountFunctionRequest(config, request);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith(expected.url, expected.init);
});

test.each([200, 204])("AC2-계정. 2xx(%i)는 deleted이고 본문을 읽지 않는다", async (status) => {
  stubConfig();
  const { res, text } = response(status);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => res),
  );

  const result = await requestAccountDeletion({ accessToken: "t", appleAuthorizationCode: null });

  expect(result).toStrictEqual({ status: "deleted" });
  expect(text).not.toHaveBeenCalled();
});

test.each<[status: number, reason: string]>([
  [401, "session-expired"],
  [403, "apple-unconfirmed"],
  [400, "unavailable"],
  [500, "unavailable"],
  [502, "unavailable"],
])("AC2-계정. status %i → failed/%s", async (status, reason) => {
  stubConfig();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => response(status).res),
  );

  const result = await requestAccountDeletion({ accessToken: "t", appleAuthorizationCode: null });

  expect(result).toStrictEqual({ status: "failed", reason });
});

test.each([0, 499])("AC2-계정. status %i(연결 실패)는 network다", async (status) => {
  stubConfig();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => response(status).res),
  );

  await expect(
    requestAccountDeletion({ accessToken: "t", appleAuthorizationCode: null }),
  ).resolves.toStrictEqual({ status: "failed", reason: "network" });
});

test("AC2-계정. fetch 거부는 network로 삼키고 거부하지 않는다", async () => {
  stubConfig();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("connection refused");
    }),
  );

  await expect(
    requestAccountDeletion({ accessToken: "t", appleAuthorizationCode: null }),
  ).resolves.toStrictEqual({ status: "failed", reason: "network" });
});

test("AC2-계정. 제한 시간이 지나면 network다", async () => {
  stubConfig();
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => undefined)),
  );

  const pending = requestAccountDeletion({ accessToken: "t", appleAuthorizationCode: null }).then(
    (result) => result,
    (error: unknown) => ({ rejected: error }),
  );
  await vi.advanceTimersByTimeAsync(authRequestTimeoutMs);

  await expect(pending).resolves.toStrictEqual({ status: "failed", reason: "network" });
});

test("AC2-계정. 설정이 없으면 unconfigured이고 fetch는 0회다", async () => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "");
  const fetchMock = vi.fn(async () => response(204).res);
  vi.stubGlobal("fetch", fetchMock);

  await expect(
    requestAccountDeletion({ accessToken: "t", appleAuthorizationCode: null }),
  ).resolves.toStrictEqual({ status: "failed", reason: "unconfigured" });
  expect(fetchMock).not.toHaveBeenCalled();
});
