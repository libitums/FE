import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import type { StorageModuleDouble } from "./test-helpers/signed-in-app";
import type { AnalyticsConfig, AnalyticsTransport } from "../lib/analytics.contract";
import { analyticsConfigFrom } from "../lib/analytics-config";
import { authSessionStorageKey, parseAuthSession, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import type { EntryEvent } from "../lib/entry-flow";
import { analyticsQueueStorageKey, createAnalyticsSession } from "../lib/posthog-client";
import { uiLanguageStorageKey } from "../lib/ui-language";
import { notificationItems } from "../screens/notifications/notification-items";
import type { SettingsEvent } from "../screens/settings/settings.contract";

// 「설정 → 결선 → 저장소 · 분석 · 전송 · 호스트 대역 → App 세션 재시작」을 한 트리에서 봅니다.
// 대역은 경계뿐입니다 — `StorageModule`(기록하는 저장소) · `fetch`(Supabase · 삭제 함수) ·
// `AppleSignInModule` · `WebAuthenticationModule.randomBytes` · 분석 transport(IA5b만).
// 부팅은 공용 `renderSignedInApp`(갱신 → 앱 구간)이고, 부팅 뒤에 `fetch`를 이 파일의 표로 바꿉니다.

const completedIntros = ["tutorial-intro"] as const;
const supabaseUrl = "https://test.supabase.co";
const sessionKey = authSessionStorageKey;

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// payload에 `sub` · `app_metadata`가 있는 JWT 모양 토큰입니다(서명은 검증하지 않는 값).
function jwt(sub: string, providers: readonly string[]): string {
  const payload = { sub, app_metadata: { provider: providers[0], providers } };
  return `${base64Url({ alg: "none" })}.${base64Url(payload)}.sig`;
}

type Reply = { readonly status: number; readonly body?: string } | "reject" | "hang" | "status0";
type Net = { logout: Reply; fn: Reply; refresh: Reply; pkce: Reply };
type FetchCall = {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: string;
};

const sessionBody = (accessToken: string): string =>
  JSON.stringify({
    access_token: accessToken,
    refresh_token: "next-refresh",
    expires_in: 3600,
    token_type: "bearer",
    user: { id: "u" },
  });

type Harness = {
  readonly store: Map<string, string>;
  readonly order: string[];
  readonly calls: FetchCall[];
  readonly net: Net;
  readonly identify: ReturnType<typeof vi.fn>;
  readonly reset: ReturnType<typeof vi.fn>;
  readonly events: EntryEvent[];
  readonly settingsEvents: SettingsEvent[];
  readonly appleStarts: { nonce: string }[];
  readonly accessToken: string;
  readonly props: Parameters<typeof App>[0];
};

type BootOptions = {
  readonly providers?: readonly string[];
  readonly apple?: unknown;
  readonly withAnalytics?: boolean;
  readonly seed?: Record<string, string>;
  readonly session?: { expiresInMs: number; accessToken: string };
};

const fixedRandomHex = "7418dfb49799e0254ffa607dd8adbbba16d4254d69d6bff05b58055853848d79";

function installNet(h: Pick<Harness, "calls" | "net" | "order">): void {
  vi.stubGlobal(
    "fetch",
    (url: string, init: { method: string; headers: Record<string, string>; body: string }) => {
      h.calls.push({ url, method: init.method, headers: init.headers, body: init.body });
      let reply: Reply;
      if (url.includes("/auth/v1/logout")) reply = h.net.logout;
      else if (url.includes("/functions/v1/delete-account")) {
        h.order.push("fetch:function");
        reply = h.net.fn;
      } else if (url.includes("grant_type=refresh_token")) reply = h.net.refresh;
      else if (url.includes("grant_type=pkce")) reply = h.net.pkce;
      else return Promise.reject(new Error(`예상 밖 요청 ${url}`));
      if (reply === "reject") return Promise.reject(new Error("network down"));
      if (reply === "hang") return new Promise(() => undefined);
      if (reply === "status0") return Promise.resolve({ status: 0, text: async () => "" });
      return Promise.resolve({ status: reply.status, text: async () => reply.body ?? "" });
    },
  );
}

async function bootApp(options: BootOptions = {}): Promise<Harness> {
  const providers = options.providers ?? ["google"];
  const accessToken = jwt("user-1", providers);
  const store = new Map<string, string>(Object.entries(options.seed ?? {}));
  const order: string[] = [];
  store.set(
    sessionKey,
    serializeAuthSession({
      accessToken: "stale-access",
      refreshToken: "boot-refresh",
      expiresAt: 4_102_444_800_000,
    }),
  );
  const storageModule: StorageModuleDouble = {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => void store.set(key, value),
    remove: (key) => {
      order.push(`remove:${key}`);
      store.delete(key);
    },
  };
  const appleStarts: { nonce: string }[] = [];
  vi.stubGlobal("NativeModules", {
    WebAuthenticationModule: {
      randomBytes: () => fixedRandomHex,
      start: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({ status: "completed", callbackUrl: "duru://auth-callback?code=abc" }),
    },
    AppleSignInModule: {
      start: (args: { nonce: string }, callback: (payload: unknown) => void) => {
        appleStarts.push(args);
        order.push("apple:start");
        callback(options.apple ?? { status: "cancelled" });
      },
    },
  });

  const identify = vi.fn();
  const reset = vi.fn((scope: string) => void order.push(`reset:${scope}`));
  const events: EntryEvent[] = [];
  const settingsEvents: SettingsEvent[] = [];
  const props: Parameters<typeof App>[0] = {
    completedEpisodeIntroIds: completedIntros,
    entryEventSink: (event) => {
      events.push(event);
      order.push(`event:${event.name === "entry_screen_viewed" ? event.screen : event.name}`);
    },
    settingsEventSink: (event) => void settingsEvents.push(event),
    ...(options.withAnalytics === false ? {} : { analyticsUser: { identify, reset } }),
  };

  await renderSignedInApp(<App {...props} />, {
    refreshedAccessToken: accessToken,
    storageModule,
  });
  const h: Harness = {
    store,
    order,
    calls: [],
    net: {
      logout: { status: 204 },
      fn: { status: 204 },
      refresh: { status: 200, body: sessionBody(jwt("user-1", providers)) },
      pkce: { status: 200, body: sessionBody(jwt("user-2", ["google"])) },
    },
    identify,
    reset,
    events,
    settingsEvents,
    appleStarts,
    accessToken,
    props,
  };
  installNet(h);
  if (options.session !== undefined) {
    store.set(
      sessionKey,
      serializeAuthSession({
        accessToken: options.session.accessToken,
        refreshToken: "near-expiry-refresh",
        expiresAt: Date.now() + options.session.expiresInMs,
      }),
    );
  }
  // 부팅이 남긴 기록은 관심 밖입니다.
  order.length = 0;
  events.length = 0;
  settingsEvents.length = 0;
  identify.mockClear();
  return h;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------- 조작 헬퍼

const cell = (id: string): HTMLElement =>
  within(screen.getByTestId(`ui-lynx-settings-group-item-${id}`)).getByTestId(
    "ui-lynx-settings-cell",
  );
const dialogAction = (id: string): HTMLElement =>
  within(screen.getByTestId(`ui-lynx-dialog-action-${id}`)).getByTestId("ui-lynx-button");
const openSettings = (): void =>
  void fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
const onLogin = () =>
  vi.waitFor(() => expect(screen.getByTestId("login-screen-title")).toBeTruthy());
const navigatorItems = (): HTMLElement[] =>
  screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/);
const functionCalls = (h: Harness): FetchCall[] =>
  h.calls.filter((call) => call.url.includes("/functions/v1/delete-account"));
const sessionStored = (h: Harness): boolean => h.store.has(sessionKey);

function signOut(): void {
  openSettings();
  fireEvent.tap(cell("sign-out"), {});
  fireEvent.tap(dialogAction("sign-out"), {});
}

function startDelete(): void {
  openSettings();
  fireEvent.tap(cell("delete-account"), {});
  fireEvent.tap(dialogAction("delete"), {});
}

const failureText = {
  other: "Couldn't delete your account. Please try again.",
  network: "Couldn't delete your account. Check your connection and try again.",
};

async function expectFailure(h: Harness, text: string): Promise<void> {
  await vi.waitFor(() =>
    expect(screen.getByTestId("settings-screen-account-error")).toHaveTextContent(text),
  );
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("settings-screen-delete-dialog")).not.toBeInTheDocument();
  expect(sessionStored(h)).toBe(true);
  expect(h.reset).not.toHaveBeenCalled();
  expect(h.events).toEqual([]);
}

function expectSignedOutEnd(h: Harness, scope: "identity" | "identity-and-queue"): void {
  expect(navigatorItems()).toHaveLength(0);
  expect(sessionStored(h)).toBe(false);
  expect(h.reset).toHaveBeenCalledTimes(1);
  expect(h.reset).toHaveBeenCalledWith(scope);
  expect(h.events).toEqual([{ name: "entry_screen_viewed", screen: "login" }]);
  expect(h.order.filter((entry) => !entry.startsWith("fetch:") && entry !== "apple:start")).toEqual(
    [`remove:${sessionKey}`, `reset:${scope}`, "event:login"],
  );
}

// ---------------------------------------------------------------- 로그아웃

test("[IA1] 로그아웃: 로그인 화면 · 원격 로그아웃 1회 · 세션 삭제 → reset → 이벤트 순서", async () => {
  const h = await bootApp();
  signOut();
  await onLogin();

  expectSignedOutEnd(h, "identity");
  const logouts = h.calls.filter((call) => call.url.includes("/auth/v1/logout"));
  expect(logouts).toHaveLength(1);
  expect(logouts[0]?.method).toBe("POST");
  expect(logouts[0]?.url).toBe(`${supabaseUrl}/auth/v1/logout?scope=local`);
  expect(logouts[0]?.headers["Authorization"]).toBe(`Bearer ${h.accessToken}`);
});

test("[IA2] 로그아웃 뒤 로그인의 뒤로가기는 온보딩이다", async () => {
  await bootApp();
  signOut();
  await onLogin();

  fireEvent.tap(
    within(screen.getByTestId("login-screen-header")).getByTestId("ui-lynx-round-button"),
    {},
  );
  expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();
});

test.each<[string, Reply]>([
  ["끝나지 않는 fetch", "hang"],
  ["거부하는 fetch", "reject"],
])("[IA3] 원격 로그아웃이 %s여도 같은 결말이 즉시 난다", async (_name, logout) => {
  const h = await bootApp();
  h.net.logout = logout;
  signOut();

  // 기다림 없이 곧바로 봅니다 — fetch 결과에 기대지 않습니다.
  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expectSignedOutEnd(h, "identity");
});

test("[IA4] 로그아웃 → 다시 로그인하면 알림 · 세션 옵션이 처음 값이고 새 사용자로 식별한다", async () => {
  const h = await bootApp();
  const item = notificationItems()[0];
  if (item === undefined) throw new Error("no notification item");

  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});
  const card = screen.getByTestId(`notification-list-item-${item.id}`);
  fireEvent.touchstart(card, { touches: [{ pageX: 300, pageY: 200 }] });
  fireEvent.touchmove(card, { touches: [{ pageX: 240, pageY: 204 }] });
  fireEvent.tap(screen.getByTestId(`notification-list-item-delete-${item.id}`), {});
  expect(screen.queryByTestId(`notification-list-item-${item.id}`)).not.toBeInTheDocument();
  fireEvent.tap(
    within(screen.getByTestId("notifications-screen-exit")).getByTestId("ui-lynx-round-button"),
    {},
  );
  openSettings();
  fireEvent.tap(cell("auto-play-audio"), {});
  expect(cell("auto-play-audio")).toHaveAttribute("data-checked", "false");

  fireEvent.tap(cell("sign-out"), {});
  fireEvent.tap(dialogAction("sign-out"), {});
  await onLogin();

  fireEvent.tap(
    within(screen.getByTestId("login-screen-method-google")).getByTestId("ui-lynx-button"),
    {},
  );
  await vi.waitFor(() => expect(screen.getByTestId("language-select-screen-title")).toBeTruthy());
  fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-en"), {});
  fireEvent.tap(
    within(screen.getByTestId("language-select-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
  fireEvent.tap(
    within(screen.getByTestId("journey-entry-screen-start")).getByTestId("ui-lynx-button"),
    {},
  );

  expect(h.identify).toHaveBeenCalledTimes(1);
  expect(h.identify).toHaveBeenCalledWith("user-2");
  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});
  expect(screen.getByTestId(`notification-list-item-${item.id}`)).toBeInTheDocument();
  fireEvent.tap(
    within(screen.getByTestId("notifications-screen-exit")).getByTestId("ui-lynx-round-button"),
    {},
  );
  openSettings();
  expect(cell("auto-play-audio")).toHaveAttribute("data-checked", "true");
});

// ---------------------------------------------------------------- 삭제

test.each(["google", "facebook"])(
  "[IA5] %s 계정 삭제: 함수 1회 · Apple 시트 0 · 로그인 화면 · 뒤처리",
  async (provider) => {
    const h = await bootApp({ providers: [provider] });
    startDelete();
    await onLogin();

    const calls = functionCalls(h);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe(`${supabaseUrl}/functions/v1/delete-account`);
    expect(calls[0]?.headers["Authorization"]).toBe(`Bearer ${h.accessToken}`);
    expect(JSON.parse(calls[0]?.body ?? "null")).toEqual({ apple_authorization_code: null });
    expect(h.appleStarts).toHaveLength(0);
    expectSignedOutEnd(h, "identity-and-queue");
  },
);

test("[IA5b] 삭제하면 저장된 분석 대기열이 지워지고 옛 사용자 ID로 이벤트가 나가지 않는다", async () => {
  const config: AnalyticsConfig | null = analyticsConfigFrom("phc_test", "development");
  let mode: "fail" | "ok" = "fail";
  const sent: { distinct_id: string; event: string }[] = [];
  const transport: AnalyticsTransport = async (_url, init) => {
    if (mode === "fail") return { status: 503, text: async () => "", json: async () => ({}) };
    const body = JSON.parse(init.body) as { batch?: typeof sent };
    sent.push(...(body.batch ?? []));
    return { status: 200, text: async () => "", json: async () => ({}) };
  };
  const session = createAnalyticsSession(config, transport);
  const store = new Map<string, string>();
  store.set(
    sessionKey,
    serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  const storageModule: StorageModuleDouble = {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => void store.set(key, value),
    remove: (key) => void store.delete(key),
  };
  const accessToken = jwt("user-1", ["google"]);
  await renderSignedInApp(
    <App
      {...session.sinks}
      analyticsUser={session.user}
      completedEpisodeIntroIds={completedIntros}
    />,
    { refreshedAccessToken: accessToken, storageModule },
  );
  const calls: FetchCall[] = [];
  installNet({
    calls,
    order: [],
    net: {
      logout: { status: 204 },
      fn: { status: 204 },
      refresh: { status: 500 },
      pkce: { status: 500 },
    },
  });

  openSettings();
  await vi.waitFor(() => expect(store.has(analyticsQueueStorageKey)).toBe(true));
  mode = "ok";
  fireEvent.tap(cell("delete-account"), {});
  fireEvent.tap(dialogAction("delete"), {});
  await onLogin();

  expect(store.has(sessionKey)).toBe(false);
  // 옛 대기열(settings_opened · user-1)은 저장소에도 전송에도 남지 않습니다. 삭제 뒤 새 이벤트의
  // 대기열은 있을 수 있어 「키 없음」이 아니라 「옛 내용 없음」을 봅니다.
  const stored = store.get(analyticsQueueStorageKey) ?? "";
  expect(stored).not.toContain("settings_opened");
  expect(stored).not.toContain("user-1");
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(sent.every((e) => e.distinct_id !== "user-1")).toBe(true);
  expect(sent.some((e) => e.event === "settings_opened")).toBe(false);
});

test("[IA6] Apple 계정 삭제: 시트(nonce 64자 16진) 뒤에 함수 · 코드 c1 · id_token 교환 0", async () => {
  const h = await bootApp({
    providers: ["apple"],
    apple: { status: "completed", identityToken: "idt", authorizationCode: "c1" },
  });
  startDelete();
  await onLogin();

  expect(h.appleStarts).toHaveLength(1);
  expect(Object.keys(h.appleStarts[0] ?? {})).toEqual(["nonce"]);
  expect(h.appleStarts[0]?.nonce).toMatch(/^[0-9a-f]{64}$/);
  expect(h.order.indexOf("apple:start")).toBeLessThan(h.order.indexOf("fetch:function"));
  const calls = functionCalls(h);
  expect(calls).toHaveLength(1);
  expect(JSON.parse(calls[0]?.body ?? "null")).toEqual({ apple_authorization_code: "c1" });
  expect(h.calls.some((call) => call.url.includes("grant_type=id_token"))).toBe(false);
  expectSignedOutEnd(h, "identity-and-queue");
});

test("[IA7] Apple 시트를 취소하면 함수 0 · 대화상자가 로딩 전으로 · 세션 · reset · 이벤트 그대로", async () => {
  const h = await bootApp({ providers: ["apple"], apple: { status: "cancelled" } });
  startDelete();

  await vi.waitFor(() => expect(h.appleStarts).toHaveLength(1));
  await vi.waitFor(() => expect(dialogAction("delete")).toHaveAttribute("data-loading", "false"));
  expect(screen.getByTestId("settings-screen-delete-dialog")).toBeInTheDocument();
  expect(functionCalls(h)).toEqual([]);
  expect(sessionStored(h)).toBe(true);
  expect(h.reset).not.toHaveBeenCalled();
  expect(h.events).toEqual([]);
  expect(screen.queryByTestId("settings-screen-account-error")).not.toBeInTheDocument();
});

test("[IA8] 함수가 502면 설정 그대로 · other 문구 · 세션 그대로 · 머리 가림 해제", async () => {
  const h = await bootApp();
  h.net.fn = { status: 502, body: '{"error":"apple_revoke_failed"}' };
  startDelete();

  await expectFailure(h, failureText.other);
  expect(screen.getByTestId("app-header")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
});

test.each<[string, Reply]>([
  ["거부", "reject"],
  ["status 0", "status0"],
])("[IA9] 함수 fetch가 %s이면 network 문구 · 세션 그대로", async (_name, fn) => {
  const h = await bootApp();
  h.net.fn = fn;
  startDelete();
  await expectFailure(h, failureText.network);
});

test("[IA10] 만료 30초 전 세션은 갱신이 먼저 · 새 세션 저장 · 함수는 새 토큰 · 실패해도 새 세션이 남는다", async () => {
  const fresh = jwt("user-1", ["google"]) + "x";
  const h = await bootApp({
    session: { expiresInMs: 30_000, accessToken: jwt("user-1", ["google"]) },
  });
  h.net.refresh = { status: 200, body: sessionBody(fresh) };
  h.net.fn = { status: 502 };
  startDelete();

  await expectFailureKeepingSession(h);
  const urls = h.calls.map((call) => call.url);
  expect(urls[0]).toContain("grant_type=refresh_token");
  expect(urls[1]).toContain("/functions/v1/delete-account");
  expect(h.calls[1]?.headers["Authorization"]).toBe(`Bearer ${fresh}`);
  expect(parseAuthSession(h.store.get(sessionKey) ?? null)?.accessToken).toBe(fresh);
});

async function expectFailureKeepingSession(h: Harness): Promise<void> {
  await vi.waitFor(() => expect(screen.getByTestId("settings-screen-account-error")).toBeTruthy());
  expect(sessionStored(h)).toBe(true);
}

test("[IA11] 갱신이 거절되면 함수 0 · other 문구 · 세션을 지우지 않는다", async () => {
  const h = await bootApp({
    session: { expiresInMs: 30_000, accessToken: jwt("user-1", ["google"]) },
  });
  const before = h.store.get(sessionKey);
  h.net.refresh = { status: 400, body: '{"error_code":"refresh_token_not_found"}' };
  startDelete();

  await expectFailure(h, failureText.other);
  expect(functionCalls(h)).toEqual([]);
  expect(h.store.get(sessionKey)).toBe(before);
});

test("[IA12] 삭제 대화상자가 열린 동안 전역 머리가 낭독에서 가려지고 닫히면 풀린다", async () => {
  await bootApp();
  openSettings();
  const header = (): HTMLElement => screen.getByTestId("app-header");
  expect(header()).toHaveAttribute("accessibility-elements-hidden", "false");

  fireEvent.tap(cell("delete-account"), {});
  expect(header()).toHaveAttribute("accessibility-elements-hidden", "true");

  fireEvent.tap(dialogAction("keep"), {});
  expect(header()).toHaveAttribute("accessibility-elements-hidden", "false");
});

test.each(["sign-out", "delete"] as const)(
  "[IA13] %s 뒤 같은 저장소로 다시 실행하면 스플래시 → 온보딩이고 갱신 요청이 없다",
  async (flow) => {
    const h = await bootApp();
    if (flow === "sign-out") signOut();
    else startDelete();
    await onLogin();
    cleanup();
    const before = h.calls.length;

    vi.useFakeTimers();
    render(<App {...h.props} />);
    expect(screen.getByTestId("splash-screen-logo")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(entrySplashDurationMs);
    });
    expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();
    expect(h.calls).toHaveLength(before);
  },
);

test("[IA14] 삭제 뒤에도 UI 언어 키가 남는다", async () => {
  const h = await bootApp({ seed: { [uiLanguageStorageKey]: "vi" } });
  startDelete();
  await onLogin();

  expect(h.store.get(uiLanguageStorageKey)).toBe("vi");
  expect(sessionStored(h)).toBe(false);
});

test("[IA15] 계정 동작이 내는 이벤트는 기존 사전 안이고 성공 전에는 없다", async () => {
  const entryNames = ["entry_screen_viewed", "entry_login_method_selected", "entry_completed"];
  const settingsNames = [
    "settings_opened",
    "profile_opened",
    "terms_opened",
    "session_option_changed",
  ];
  type Scenario = { name: string; run: (h: Harness) => void; opts?: BootOptions; ok: boolean };
  const scenarios: Scenario[] = [
    { name: "sign-out", run: () => signOut(), ok: true },
    { name: "delete", run: () => startDelete(), ok: true },
    {
      name: "502",
      run: (h) => {
        h.net.fn = { status: 502 };
        startDelete();
      },
      ok: false,
    },
    {
      name: "network",
      run: (h) => {
        h.net.fn = "reject";
        startDelete();
      },
      ok: false,
    },
    { name: "apple-cancel", run: () => startDelete(), opts: { providers: ["apple"] }, ok: false },
    {
      name: "refresh-400",
      run: (h) => {
        h.net.refresh = { status: 400, body: "{}" };
        startDelete();
      },
      opts: { session: { expiresInMs: 30_000, accessToken: jwt("user-1", ["google"]) } },
      ok: false,
    },
  ];

  for (const scenario of scenarios) {
    const h = await bootApp(scenario.opts);
    scenario.run(h);
    if (scenario.ok) await onLogin();
    else await new Promise((resolve) => setTimeout(resolve, 30));
    for (const event of h.events) expect(entryNames).toContain(event.name);
    for (const event of h.settingsEvents) expect(settingsNames).toContain(event.name);
    const screens = h.events.flatMap((e) => (e.name === "entry_screen_viewed" ? [e.screen] : []));
    expect(screens, scenario.name).toEqual(scenario.ok ? ["login"] : []);
    cleanup();
    vi.unstubAllGlobals();
  }
});

test("[IA16] 분석 없는 부팅에서도 로그아웃 · 삭제가 같은 화면 결말로 끝난다", async () => {
  const signedOut = await bootApp({ withAnalytics: false });
  signOut();
  await onLogin();
  expect(sessionStored(signedOut)).toBe(false);
  cleanup();
  vi.unstubAllGlobals();

  const deleted = await bootApp({ withAnalytics: false });
  startDelete();
  await onLogin();
  expect(sessionStored(deleted)).toBe(false);
  expect(navigatorItems()).toHaveLength(0);
});

// 떠난 뒤 새 세션은 화면이 통째로 바뀌므로 결과를 한 번 낭독합니다(접근성 검토 W2).
test.each([
  ["sign-out", "You're signed out."],
  ["delete", "Your account was deleted."],
] as const)("[IA17] %s 뒤 새 세션이 결과를 정확히 한 번 낭독한다", async (action, expected) => {
  const h = await bootApp({ providers: ["google"] });
  const announced: string[] = [];
  (globalThis as unknown as { NativeModules: Record<string, unknown> }).NativeModules[
    "LynxAccessibilityModule"
  ] = {
    accessibilityAnnounce: (args: { content: string }, callback: () => void) => {
      announced.push(args.content);
      callback();
    },
  };

  if (action === "sign-out") signOut();
  else startDelete();
  await onLogin();

  await vi.waitFor(() => expect(announced).toContain(expected));
  expect(announced.filter((content) => content === expected)).toHaveLength(1);
  expect(sessionStored(h)).toBe(false);
});
