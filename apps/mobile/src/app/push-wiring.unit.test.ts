import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  authSessionStorageKey,
  clearAuthSession,
  saveAuthSession,
  serializeAuthSession,
} from "../lib/auth-session";
import {
  forgetPushDevice,
  openNotificationSettings,
  resetPushWiringForTests,
  syncPushDevice,
} from "./push-wiring";

const token = "c3".repeat(32);

type Host = {
  permission: string;
  register: ReturnType<typeof vi.fn>;
  openSettings: ReturnType<typeof vi.fn>;
};

function install(options: { signedIn?: boolean; permission?: string; granted?: boolean } = {}) {
  const store = new Map<string, string>();
  if (options.signedIn ?? true) {
    store.set(
      authSessionStorageKey,
      serializeAuthSession({
        accessToken: "access",
        refreshToken: "r",
        expiresAt: 4_102_444_800_000,
      }),
    );
  }
  const host: Host = {
    permission: options.permission ?? "not-determined",
    register: vi.fn((callback: (payload: unknown) => void) => {
      const granted = options.granted ?? true;
      host.permission = granted ? "authorized" : "denied";
      callback(
        granted
          ? { permission: "authorized", token, environment: "sandbox" }
          : { permission: "denied" },
      );
    }),
    openSettings: vi.fn(),
  };
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    PushNotificationModule: {
      getStatus: (callback: (payload: unknown) => void) =>
        callback({ permission: host.permission }),
      register: host.register,
      takeOpened: (callback: (payload: unknown) => void) => callback({ target: null }),
      openSettings: host.openSettings,
    },
  });
  const calls: { url: string; body: string; auth: string | undefined }[] = [];
  vi.stubGlobal("fetch", (url: string, init: { body: string; headers: Record<string, string> }) => {
    calls.push({ url, body: init.body, auth: init.headers["Authorization"] });
    return Promise.resolve({ status: 204, text: async () => "" });
  });
  return { host, calls };
}

beforeEach(() => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
});

afterEach(() => {
  resetPushWiringForTests();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("PW1 syncPushDevice", () => {
  test("ask면 미요청이어도 묻고, 받은 토큰을 사용자 것으로 등록한다", async () => {
    const { host, calls } = install();
    await syncPushDevice({ ask: true });
    expect(host.register).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([
      {
        url: "https://test.supabase.co/rest/v1/rpc/register_push_device",
        body: JSON.stringify({ p_token: token, p_environment: "sandbox" }),
        auth: "Bearer access",
      },
    ]);
  });

  test("ask가 아니면 이미 허용일 때만 등록한다 — 미요청 · 거부는 묻지 않는다", async () => {
    for (const permission of ["not-determined", "denied"]) {
      const { host, calls } = install({ permission });
      await syncPushDevice({ ask: false });
      expect(host.register).not.toHaveBeenCalled();
      expect(calls).toHaveLength(0);
      vi.unstubAllGlobals();
    }
    const { host, calls } = install({ permission: "authorized" });
    await syncPushDevice({ ask: false });
    expect(host.register).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1);
  });

  test("거부하면 요청하지 않고, 세션이 없으면 묻지도 않는다", async () => {
    const denied = install({ granted: false });
    await syncPushDevice({ ask: true });
    expect(denied.calls).toHaveLength(0);
    vi.unstubAllGlobals();

    const signedOut = install({ signedIn: false });
    await syncPushDevice({ ask: true });
    expect(signedOut.host.register).not.toHaveBeenCalled();
  });
});

describe("PW2 forgetPushDevice", () => {
  test("이 실행에서 등록한 토큰만 한 번 뗀다", async () => {
    const { calls } = install();
    forgetPushDevice("access");
    expect(calls).toHaveLength(0);

    await syncPushDevice({ ask: true });
    forgetPushDevice("access");
    forgetPushDevice("access");
    await Promise.resolve();
    expect(calls.map((call) => call.url)).toEqual([
      "https://test.supabase.co/rest/v1/rpc/register_push_device",
      "https://test.supabase.co/rest/v1/rpc/unregister_push_device",
    ]);
    expect(calls[1]!.body).toBe(JSON.stringify({ p_token: token }));
  });
});

describe("PW3 openNotificationSettings", () => {
  test("미요청이면 묻고, 물었으면 설정을 연다", async () => {
    const asked = install();
    await openNotificationSettings();
    expect(asked.host.register).toHaveBeenCalledTimes(1);
    expect(asked.host.openSettings).not.toHaveBeenCalled();
    vi.unstubAllGlobals();

    for (const permission of ["denied", "authorized"]) {
      const { host } = install({ permission });
      await openNotificationSettings();
      expect(host.register).not.toHaveBeenCalled();
      expect(host.openSettings).toHaveBeenCalledTimes(1);
      vi.unstubAllGlobals();
    }
  });
});

const tokenOne = "a1".repeat(32);
const tokenTwo = "b2".repeat(32);

const registerUrl = "https://test.supabase.co/rest/v1/rpc/register_push_device";
const unregisterUrl = "https://test.supabase.co/rest/v1/rpc/unregister_push_device";

/** 호스트가 호출마다 다음 토큰을 돌려주게 합니다. */
function hostReturns(host: Host, tokens: readonly string[]): void {
  let index = 0;
  host.register.mockImplementation((callback: (payload: unknown) => void) => {
    const next = tokens[Math.min(index, tokens.length - 1)];
    index += 1;
    host.permission = "authorized";
    callback({ permission: "authorized", token: next, environment: "sandbox" });
  });
}

describe("PW4 한 실행에서 토큰이 바뀐 경우", () => {
  test("T1 · T2를 모두 등록하면 해제는 둘을 등록 성공 순으로 한 번씩 보낸다", async () => {
    const { host, calls } = install();
    hostReturns(host, [tokenOne, tokenTwo]);
    await syncPushDevice({ ask: true });
    await syncPushDevice({ ask: true });
    forgetPushDevice("access");
    await vi.waitFor(() => expect(calls.filter((c) => c.url === unregisterUrl)).toHaveLength(2));
    const unregistered = calls.filter((c) => c.url === unregisterUrl).map((c) => c.body);
    expect(unregistered).toEqual([
      JSON.stringify({ p_token: tokenOne }),
      JSON.stringify({ p_token: tokenTwo }),
    ]);
  });
});

describe("PW5 등록 응답이 뒤바뀐 경우", () => {
  test("T2 응답이 먼저, T1 응답이 나중에 와도 T2 해제가 나간다", async () => {
    const { host, calls } = install();
    hostReturns(host, [tokenOne, tokenTwo]);
    const pending: { body: string; resolve: () => void }[] = [];
    vi.stubGlobal("fetch", (url: string, init: { body: string }) => {
      if (url === registerUrl) {
        return new Promise((resolve) => {
          pending.push({
            body: init.body,
            resolve: () => resolve({ status: 204, text: async () => "" }),
          });
        });
      }
      calls.push({ url, body: init.body, auth: undefined });
      return Promise.resolve({ status: 204, text: async () => "" });
    });

    const first = syncPushDevice({ ask: true });
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    const second = syncPushDevice({ ask: true });
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[0]!.body).toContain(tokenOne);
    expect(pending[1]!.body).toContain(tokenTwo);

    pending[1]!.resolve();
    await second;
    pending[0]!.resolve();
    await first;

    forgetPushDevice("access");
    await vi.waitFor(() => expect(calls.some((c) => c.url === unregisterUrl)).toBe(true));
    const bodies = calls.filter((c) => c.url === unregisterUrl).map((c) => c.body);
    expect(bodies).toContain(JSON.stringify({ p_token: tokenTwo }));
  });
});

describe("PW6 같은 토큰 중복 등록", () => {
  test("두 번 등록해도 해제는 한 번이고, 해제 뒤 다시 불러도 요청이 없다", async () => {
    const { calls } = install();
    await syncPushDevice({ ask: true });
    await syncPushDevice({ ask: true });
    forgetPushDevice("access");
    await vi.waitFor(() => expect(calls.filter((c) => c.url === unregisterUrl)).toHaveLength(1));
    const before = calls.length;
    forgetPushDevice("access");
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toHaveLength(before);
    expect(calls.filter((c) => c.url === unregisterUrl)).toHaveLength(1);
  });
});

/** 등록 RPC 응답을 손으로 풀 수 있게 하고, 모든 요청의 인증을 기록합니다. */
function holdRegistration() {
  const requests: { url: string; body: string; auth: string | undefined }[] = [];
  const held: (() => void)[] = [];
  vi.stubGlobal("fetch", (url: string, init: { body: string; headers: Record<string, string> }) => {
    requests.push({ url, body: init.body, auth: init.headers["Authorization"] });
    if (url === registerUrl) {
      return new Promise((resolve) => {
        held.push(() => resolve({ status: 204, text: async () => "" }));
      });
    }
    return Promise.resolve({ status: 204, text: async () => "" });
  });
  return { requests, held };
}

/** 서명 없는 JWT 모양의 액세스 토큰입니다 — 사용자는 `sub`로, 같은 사용자의 갱신은 `serial`로 구분합니다. */
function jwtFor(sub: string, serial: number): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `${encode({ alg: "none" })}.${encode({ sub, serial })}.sig`;
}

function signInWith(accessToken: string, refreshToken = "r"): void {
  saveAuthSession({ accessToken, refreshToken, expiresAt: 4_102_444_800_000 });
}

/** 로그아웃 — 계정 결선처럼 해제를 부르고 세션을 지웁니다. */
function signOut(accessToken: string): void {
  forgetPushDevice(accessToken);
  clearAuthSession();
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const userA = jwtFor("user-a", 1);
const userARefreshed = jwtFor("user-a", 2);
const userB = jwtFor("user-b", 1);

describe("PW7 · PW8 로그아웃 뒤에 도착한 등록 응답", () => {
  test("PW7 늦은 등록 성공이 집합에 다시 들어가지 않는다 — 새 사용자의 해제가 이전 토큰을 보내지 않는다", async () => {
    install();
    signInWith(userA);
    const { requests, held } = holdRegistration();
    const sync = syncPushDevice({ ask: true });
    await vi.waitFor(() => expect(held).toHaveLength(1));

    signOut(userA);
    held[0]!();
    await sync;
    await settle();

    signInWith(userB, "r-b");
    forgetPushDevice(userB);
    await settle();

    expect(requests.filter((r) => r.url === unregisterUrl && r.auth === `Bearer ${userB}`)).toEqual(
      [],
    );
  });

  test("PW8 늦게 성공한 등록의 토큰은 등록을 시작한 세션의 인증으로 한 번 해제된다", async () => {
    install();
    signInWith(userA);
    const { requests, held } = holdRegistration();
    const sync = syncPushDevice({ ask: true });
    await vi.waitFor(() => expect(held).toHaveLength(1));

    signOut(userA);
    held[0]!();
    await sync;

    await vi.waitFor(() =>
      expect(requests.filter((r) => r.url === unregisterUrl)).toEqual([
        { url: unregisterUrl, body: JSON.stringify({ p_token: token }), auth: `Bearer ${userA}` },
      ]),
    );
    await settle();
    expect(requests.filter((r) => r.url === unregisterUrl)).toHaveLength(1);
  });
});

describe("PW9 등록 대기 중 같은 사용자의 세션 갱신", () => {
  test("accessToken만 바뀌어도 등록은 유지된다 — 해제가 나가지 않고, 이후 로그아웃이 그 토큰을 해제한다", async () => {
    install();
    signInWith(userA);
    const { requests, held } = holdRegistration();
    const sync = syncPushDevice({ ask: true });
    await vi.waitFor(() => expect(held).toHaveLength(1));

    // 세션 갱신 — 같은 사용자(`sub`), 새 액세스 · 리프레시 토큰.
    signInWith(userARefreshed, "r2");
    held[0]!();
    await sync;
    await settle();
    expect(requests.filter((r) => r.url === unregisterUrl)).toEqual([]);

    forgetPushDevice(userARefreshed);
    await vi.waitFor(() =>
      expect(requests.filter((r) => r.url === unregisterUrl)).toEqual([
        {
          url: unregisterUrl,
          body: JSON.stringify({ p_token: token }),
          auth: `Bearer ${userARefreshed}`,
        },
      ]),
    );
  });
});

describe("PW10 등록 대기 중 다른 사용자가 로그인한 경우", () => {
  test("A의 늦은 등록 성공은 A의 인증으로 한 번 해제되고, B의 집합에는 들어가지 않는다", async () => {
    install();
    signInWith(userA);
    const { requests, held } = holdRegistration();
    const sync = syncPushDevice({ ask: true });
    await vi.waitFor(() => expect(held).toHaveLength(1));

    signOut(userA);
    signInWith(userB, "r-b");
    held[0]!();
    await sync;

    await vi.waitFor(() =>
      expect(requests.filter((r) => r.url === unregisterUrl)).toEqual([
        { url: unregisterUrl, body: JSON.stringify({ p_token: token }), auth: `Bearer ${userA}` },
      ]),
    );
    await settle();

    forgetPushDevice(userB);
    await settle();
    expect(requests.filter((r) => r.url === unregisterUrl && r.auth === `Bearer ${userB}`)).toEqual(
      [],
    );
    expect(requests.filter((r) => r.url === unregisterUrl)).toHaveLength(1);
  });
});

describe("PW11 사용자를 판정할 수 없는 경우", () => {
  const opaque = "opaque-access-token";

  test.each([
    ["시작은 JWT, 응답 시점은 비-JWT", userA, opaque],
    ["시작은 비-JWT, 응답 시점은 JWT", opaque, userB],
  ])("%s — 등록이 유지되고 해제가 나가지 않는다", async (_label, started, current) => {
    install();
    signInWith(started);
    const { requests, held } = holdRegistration();
    const sync = syncPushDevice({ ask: true });
    await vi.waitFor(() => expect(held).toHaveLength(1));

    signInWith(current, "r2");
    held[0]!();
    await sync;
    await settle();
    expect(requests.filter((r) => r.url === unregisterUrl)).toEqual([]);

    // 유지됐다는 증거 — 이후 로그아웃이 그 토큰을 해제한다.
    forgetPushDevice(current);
    await vi.waitFor(() =>
      expect(requests.filter((r) => r.url === unregisterUrl)).toEqual([
        { url: unregisterUrl, body: JSON.stringify({ p_token: token }), auth: `Bearer ${current}` },
      ]),
    );
  });
});
