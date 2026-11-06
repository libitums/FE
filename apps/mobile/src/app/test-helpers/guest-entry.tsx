// 「비회원으로 계속」 통합 테스트(`App.guest-entry*.integration.test.tsx`)의 무대입니다. 제품 코드가 import하지
// 않습니다. 이름에 `.test.`를 넣지 않습니다 — vitest가 테스트 파일로 모읍니다.
//
// 대역은 경계뿐입니다 — `StorageModule`(기록하는 Map) · `WebAuthenticationModule` · `PushNotificationModule` ·
// `fetch`(Supabase 인증 · RPC, 모든 호출을 기록) · 호스트 globalProps(`appVersion.platform`) · 분석 sink · 식별.
// 쓰는 파일의 `afterEach`가 `resetGuestHost`를 부릅니다.

import { vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "../App";
import { resetPushWiringForTests } from "../push-wiring";
import type { EntryEvent } from "../../lib/entry-flow";
import { contentNotFoundResponse, contentPathOf, isContentRequest } from "./content-requests";
import { setGlobalProps } from "./journey-map-host";
import { passSplash } from "./pass-splash";
import { passLearnerSignup } from "./learner-signup";

/** 계약이 고정한 저장 키입니다(spec §1-2 · §1-3). 모듈을 import하지 않고 문자열로 짓습니다 — 키가 바뀌면 여기서 빨개집니다. */
export const guestMarkerKey = "libitum.auth.guest";
export const guestProgressKey = "libitum.progress.pending.guest";
export const guestDaysKey = "libitum.learning-days.pending.guest";
export const guestProfileKey = "libitum.learner-profile.guest";

const supabaseUrl = "https://test.supabase.co";

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** `sub`를 든 JWT 모양 토큰입니다(서명은 검증하지 않는 값). */
export function jwtFor(sub: string): string {
  return `${base64Url({ alg: "none" })}.${base64Url({ sub })}.sig`;
}

export type Platform = "ios" | "android";
export type WebMode = "completed" | "cancelled";

export type GuestHostOptions = {
  /** 이전 실행의 저장소를 이어 쓸 때 넘깁니다. */
  readonly store?: Map<string, string>;
  /** 로그인 교환이 돌려줄 사용자 ID. 기본 `u1`. */
  readonly userId?: string;
  /** `load_learning_progress`의 응답 본문(JSON 값). 기본 `null` — 서버에 기록 없음. */
  readonly serverProgress?: unknown;
  /** `load_learner_profile`의 응답 본문. 기본 `null`. */
  readonly serverProfile?: unknown;
  /** 콘텐츠 버킷이 돌려줄 파일(경로 → 본문). 없는 경로는 404 — 예: `app-policy.json`(ADR-0111 개정 3). */
  readonly content?: Readonly<Record<string, string>>;
};

export type Request = {
  readonly url: string;
  /** `/rest/v1/rpc/<name>`이면 이름, 아니면 `null`(인증 요청). */
  readonly rpc: string | null;
  readonly body: unknown;
};

export type GuestHost = {
  readonly store: Map<string, string>;
  /** 콘텐츠 버킷 요청을 뺀 모든 `fetch` 호출입니다. */
  readonly requests: Request[];
  readonly register: ReturnType<typeof vi.fn<(callback: (payload: unknown) => void) => void>>;
  readonly webStarts: unknown[];
  /** 웹 로그인 창이 어떻게 끝나는가 — 테스트가 바꿉니다. */
  readonly web: { mode: WebMode };
  readonly identify: ReturnType<typeof vi.fn<(userId: string) => void>>;
  readonly events: EntryEvent[];
  readonly bodiesOf: (rpc: string) => unknown[];
};

export function installGuestHost(options: GuestHostOptions = {}): GuestHost {
  const store = options.store ?? new Map<string, string>();
  const requests: Request[] = [];
  const webStarts: unknown[] = [];
  const web: { mode: WebMode } = { mode: "completed" };
  const register = vi.fn<(callback: (payload: unknown) => void) => void>((callback) =>
    callback({ permission: "authorized", token: "push-token-1", environment: "sandbox" }),
  );
  const userId = options.userId ?? "u1";
  const sessionBody = JSON.stringify({
    access_token: jwtFor(userId),
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: "refresh-token-1",
    user: { id: userId },
  });

  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    WebAuthenticationModule: {
      randomBytes: () => "7418dfb49799e0254ffa607dd8adbbba16d4254d69d6bff05b58055853848d79",
      start: (args: unknown, callback: (payload: unknown) => void) => {
        webStarts.push(args);
        callback(
          web.mode === "completed"
            ? { status: "completed", callbackUrl: "duru://auth-callback?code=abc" }
            : { status: "cancelled" },
        );
      },
    },
    PushNotificationModule: {
      getStatus: (callback: (payload: unknown) => void) =>
        callback({ permission: "not-determined" }),
      register,
      takeOpened: (callback: (payload: unknown) => void) => callback({ target: null }),
      openSettings: vi.fn<() => void>(),
    },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", supabaseUrl);
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

  const reply = (status: number, body: string) => ({ status, text: async () => body });
  vi.stubGlobal("fetch", async (url: string, init?: { body?: string }) => {
    if (isContentRequest(url)) {
      const path = contentPathOf(url);
      const served = path === null ? undefined : options.content?.[path];
      return served === undefined ? contentNotFoundResponse() : reply(200, served);
    }
    const rpc = url.split("/rest/v1/rpc/")[1] ?? null;
    let body: unknown = null;
    try {
      body = init?.body === undefined ? null : (JSON.parse(init.body) as unknown);
    } catch {
      body = init?.body ?? null;
    }
    requests.push({ url, rpc, body });
    if (rpc === null) {
      if (url.includes("/auth/v1/logout")) return reply(204, "");
      return reply(200, sessionBody);
    }
    if (rpc === "load_learning_progress") {
      return reply(200, JSON.stringify(options.serverProgress ?? null));
    }
    if (rpc === "load_learner_profile") {
      return reply(200, JSON.stringify(options.serverProfile ?? null));
    }
    if (rpc === "learning_streak" || rpc === "record_learning_days") return reply(200, "1");
    return reply(204, "");
  });

  return {
    store,
    requests,
    register,
    webStarts,
    web,
    identify: vi.fn<(userId: string) => void>(),
    events: [],
    bodiesOf: (rpc) => requests.filter((request) => request.rpc === rpc).map((r) => r.body),
  };
}

/** 각 파일의 `afterEach`가 부릅니다. */
export function resetGuestHost(): void {
  setGlobalProps(undefined);
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
}

export async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** 연쇄된 미세 작업(교환 → 저장 → 동기화)을 흘립니다. */
export async function flushRounds(rounds = 8): Promise<void> {
  for (let round = 0; round < rounds; round += 1) await flush();
}

export type RenderOptions = {
  readonly platform?: Platform;
  readonly appProps?: Partial<Parameters<typeof App>[0]>;
  /** 분석 식별 · reset 대역과 진입 sink를 달지 않습니다(GE12). */
  readonly bare?: boolean;
};

/** App을 부팅해 스플래시를 넘기고 실제 시계로 돌아옵니다. 저장소에 심어 둔 상태에 따라 온보딩 · 맵 · 세션 갱신으로 갈립니다. */
export async function renderGuestApp(host: GuestHost, options: RenderOptions = {}): Promise<void> {
  if (options.platform !== undefined) {
    setGlobalProps({ appVersion: { platform: options.platform, name: "0.1.0", build: 1 } });
  }
  const sinks = options.bare
    ? {}
    : {
        entryEventSink: (event: EntryEvent) => void host.events.push(event),
        analyticsUser: { identify: host.identify, reset: vi.fn() },
      };
  vi.useFakeTimers();
  render(<App {...sinks} {...options.appProps} />);
  try {
    await passSplash();
  } finally {
    vi.useRealTimers();
  }
  await flushRounds(4);
}

// ---------------------------------------------------------------- 조작 · 관찰

export const tapButtonIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});
export const present = (id: string): boolean => screen.queryByTestId(id) !== null;
export const openSettingsTab = (): void =>
  void fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
export const settingsCell = (id: string): HTMLElement =>
  within(screen.getByTestId(`ui-lynx-settings-group-item-${id}`)).getByTestId(
    "ui-lynx-settings-cell",
  );

export function completeOnboarding(): void {
  for (let step = 0; step < 3; step += 1) tapButtonIn("onboarding-screen-next");
}

/** 설정 목록의 항목 testid를 위에서 아래로 읽습니다. */
export function settingsItemIds(): (string | null)[] {
  return Array.from(
    screen
      .getByTestId("settings-screen-list")
      .querySelectorAll('[data-testid^="ui-lynx-settings-group-item-"]'),
  ).map((element) => element.getAttribute("data-testid"));
}

/** 로그인 화면에서 「비회원으로 계속」을 눌러 ① 이름 · ② 나라 · 언어 선택 · 여정 입장을 지나 맵까지 갑니다. */
export async function walkGuestEntryToMap(): Promise<void> {
  completeOnboarding();
  tapButtonIn("login-screen-method-guest");
  await flush();
  passLearnerSignup();
  fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-en"), {});
  tapButtonIn("language-select-screen-next");
  tapButtonIn("journey-entry-screen-start");
  await flush();
}

/** u00 표지를 건너뛰어 맵에 돌아옵니다 — 표지 완료 = 첫 유닛 완료(활동 하나). */
export async function finishFirstUnit(): Promise<void> {
  fireEvent.tap(screen.getByTestId("ui-lynx-special-unit-catalog-cover-u00-tutorial"), {});
  tapButtonIn("episode-intro-screen-skip");
  tapButtonIn("ui-lynx-dialog-action-skip");
  await flushRounds(4);
}

/** 비회원으로 완주하고 첫 유닛까지 끝낸 상태(GE3의 끝)입니다. 분석 기록은 비웁니다. */
export async function bootGuestAfterFirstUnit(host: GuestHost): Promise<void> {
  await renderGuestApp(host, { platform: "ios" });
  await walkGuestEntryToMap();
  await finishFirstUnit();
  host.events.length = 0;
}

/** 기기에 쌓인 손님 프로필 칸의 값입니다. */
export function guestProfileOf(host: GuestHost): { name: string; countryCode: string } {
  const cell = JSON.parse(host.store.get(guestProfileKey) ?? "null") as {
    name: string;
    countryCode: string;
  };
  return { name: cell.name, countryCode: cell.countryCode };
}

/** 설정 › 「로그인」 → google. 웹 창 대역의 결과는 `host.web.mode`가 정합니다. */
export async function signInFromSettingsWithGoogle(): Promise<void> {
  fireEvent.tap(settingsCell("sign-in"), {});
  await flush();
  tapButtonIn("login-screen-method-google");
  await flushRounds();
}

export function eventLabels(events: readonly EntryEvent[]): string[] {
  return events.map((event) => {
    if (event.name === "entry_screen_viewed") return `viewed:${event.screen}`;
    if ("method" in event) return `${event.name}:${event.method}`;
    return event.name;
  });
}
