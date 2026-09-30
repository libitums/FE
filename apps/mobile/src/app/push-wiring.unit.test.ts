import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
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
