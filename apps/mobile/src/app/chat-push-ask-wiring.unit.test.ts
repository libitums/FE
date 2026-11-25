import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { CHAT_PUSH_ASK_GAP_MS } from "./chat-push-ask";
import { chatPushAskPort } from "./chat-push-ask-wiring";
import { resetPushWiringForTests } from "./push-wiring";

// `unit` 계층: 알림 권한 카드 포트(ADR-0197 D5) — 권한 읽기 → 판정 → 기록 · 조용한 등록, Turn on → 시스템 창 결과.
// 대역은 경계뿐 — 호스트 `StorageModule` · `PushNotificationModule` · `fetch`(기기 등록 RPC).

const token = "c3".repeat(32);
const NOW = 1_800_000_000_000;
const accessToken = `e30.${btoa(JSON.stringify({ sub: "user-1" })).replace(/=+$/, "")}.sig`;

function install(options: { signedIn?: boolean; permission?: string; granted?: boolean } = {}) {
  const store = new Map<string, string>();
  if (options.signedIn ?? true)
    store.set(
      authSessionStorageKey,
      serializeAuthSession({ accessToken, refreshToken: "r", expiresAt: 4_102_444_800_000 }),
    );
  const host = {
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
      openSettings: () => undefined,
    },
  });
  const calls: string[] = [];
  vi.stubGlobal("fetch", (url: string) => {
    calls.push(url);
    return Promise.resolve({ status: 204, text: async () => "" });
  });
  return { store, host, calls };
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

describe("chatPushAskPort", () => {
  test("CPA-W1. 미결정이면 카드(1번째)를 세우고 기록을 적는다 — 3일 안에는 다시 없고, 지나면 2번째, 그 뒤로는 없다", async () => {
    const { store, host } = install();
    let now = NOW;
    const port = chatPushAskPort(() => now);

    expect(await port.due()).toEqual({ show: true, count: 1 });
    expect(JSON.parse(store.get("libitum.chat-push-ask.user-1") ?? "null")).toEqual({
      shown: 1,
      lastShownAtMs: NOW,
    });
    expect(await port.due()).toEqual({ show: false });
    now += CHAT_PUSH_ASK_GAP_MS;
    expect(await port.due()).toEqual({ show: true, count: 2 });
    now += 10 * CHAT_PUSH_ASK_GAP_MS;
    expect(await port.due()).toEqual({ show: false });
    expect(host.register).not.toHaveBeenCalled();
  });

  test("CPA-W2. 이미 허용이면 카드 없이 조용히 기기를 등록하고 기록을 적지 않는다", async () => {
    const { store, host, calls } = install({ permission: "authorized" });
    expect(await chatPushAskPort(() => NOW).due()).toEqual({ show: false });
    expect(host.register).toHaveBeenCalledTimes(1);
    expect(calls.filter((url) => url.endsWith("/rest/v1/rpc/register_push_device"))).toHaveLength(
      1,
    );
    expect(store.has("libitum.chat-push-ask.user-1")).toBe(false);
  });

  test("CPA-W3. 손님 · 거절이면 카드도 등록도 없다", async () => {
    const guest = install({ signedIn: false });
    expect(await chatPushAskPort(() => NOW).due()).toEqual({ show: false });
    expect(guest.host.register).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    const denied = install({ permission: "denied" });
    expect(await chatPushAskPort(() => NOW).due()).toEqual({ show: false });
    expect(denied.host.register).not.toHaveBeenCalled();
  });

  test("CPA-W4. Turn on은 시스템 창을 띄워 허용이면 allowed(기기 등록까지), 거절이면 denied, 모듈이 없으면 null", async () => {
    const allowed = install();
    expect(await chatPushAskPort(() => NOW).turnOn()).toBe("allowed");
    expect(allowed.host.register).toHaveBeenCalledTimes(1);
    expect(
      allowed.calls.filter((url) => url.endsWith("/rest/v1/rpc/register_push_device")),
    ).toHaveLength(1);
    vi.unstubAllGlobals();
    install({ granted: false });
    expect(await chatPushAskPort(() => NOW).turnOn()).toBe("denied");
    vi.unstubAllGlobals();
    vi.stubGlobal("NativeModules", {});
    expect(await chatPushAskPort(() => NOW).turnOn()).toBeNull();
  });
});
