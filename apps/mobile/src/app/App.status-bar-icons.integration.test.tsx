import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { passLearnerSignup } from "./test-helpers/learner-signup";
import { legacyPassedSeed, u01OpenSeed } from "./test-helpers/progress-seed";
import { catalogNodeTestId } from "./test-helpers/map-unit-testid";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { lightStatusBarIcons } from "../lib/status-bar-icons";
import { systemBackEventName } from "../lib/system-back";

// `integration` 계층: 상태바 아이콘 표지(`data-statusbar`)가 App 전체 트리에서 화면 흐름을 따라
// 0 ↔ 1(첫 단원 안내가 서사 위에 겹칠 때만 2)로 오가는지 봅니다. 호스트가 읽는 값이라 판정식은
// ui 계층과 같습니다 — 렌더 결과 문서 전체에서 표지의 수입니다. 정본은 android-status-bar-appearance
// 계약 3.2 · 3.6 · r02.2 · r02.3, 계획은 test-plan.md의 integration IS1~IS11(r02의 IS3 · IS10 · IS11 포함)입니다.
// 표지는 이미 컴포넌트에 달려 있어 이 파일은 구현 전에도 통과할 수 있습니다 — 그 경우 가드입니다
// (0과 1 · 2를 오가는 단언이라 공허하지 않습니다).

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const markerElements = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(`[data-statusbar="${lightStatusBarIcons}"]`));
const markers = (): number => markerElements().length;
const markerIds = (): string[] =>
  markerElements()
    .map((element) => element.getAttribute("data-testid") ?? "(no testid)")
    .sort();

const tap = (id: string): void => void fireEvent.tap(screen.getByTestId(id), {});
const tapButtonIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});
const tapRoundButtonIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-round-button"), {});
const openTab = (tab: "journey" | "roleplay" | "settings"): void =>
  tap(`ui-lynx-bottom-navigator-item-${tab}`);
const catchTap = (id: string): void =>
  void fireEvent.tap(screen.getByTestId(id), { eventType: "catchEvent" });

const introUnit = "ui-lynx-special-unit-catalog-cover-u00-tutorial";

function pressBack(): void {
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(systemBackEventName, ["1"]);
  });
}

// ------------------------------------------------------------ 준비

/** 안내가 서지 않는 준비입니다 — 진행을 불러오지 않습니다(`renderSignedInApp` 기본). */
async function bootWithoutGuide(ui: Parameters<typeof renderSignedInApp>[0]): Promise<void> {
  vi.stubGlobal("NativeModules", {
    SystemBackModule: {
      ready: vi.fn<() => void>(),
      respond: vi.fn<(token: string, outcome: string) => void>(),
    },
  });
  await renderSignedInApp(ui);
}

/** 안내가 서는 준비입니다 — 새 사용자입니다. */
const newLearner = {
  refreshedAccessToken: `e30.${btoa(JSON.stringify({ sub: "new-learner" }))}.sig`,
  loadProgress: async () => ({ status: 200, body: "null" }),
};

function openIntro(): void {
  openTab("journey");
  tap(introUnit);
}

// ------------------------------------------------------------ 진입 구간(스플래시 · 온보딩 · 로그인)

function stubStorageOnly(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
}

function advanceSplash(): void {
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
}

function completeOnboarding(): void {
  // 온보딩 세 스텝 — `onboarding-screen-next`는 스텝마다 같은 testid입니다.
  tapButtonIn("onboarding-screen-next");
  tapButtonIn("onboarding-screen-next");
  tapButtonIn("onboarding-screen-next");
}

async function flush(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

const sessionBody = JSON.stringify({
  access_token: "access-token-1",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 9999999999,
  refresh_token: "refresh-token-1",
  user: { id: "user-1" },
});

/** 구글 로그인으로 ① 이름 · ② 나라를 지나 언어 선택 화면까지 갑니다(`App.entry.integration.test.tsx`의 IE7b와 같은 대역). */
async function signInWithGoogleToLanguageSelect(): Promise<void> {
  const store = new Map<string, string>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    WebAuthenticationModule: {
      start: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({ status: "completed", callbackUrl: "duru://auth-callback?code=abc" }),
      randomBytes: () => "7418dfb49799e0254ffa607dd8adbbba16d4254d69d6bff05b58055853848d79",
    },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  // 진행 불러오기는 실패시킵니다 — 첫 단원 안내가 맵에 서지 않게 합니다.
  vi.stubGlobal("fetch", async (url: string) =>
    url.includes("/rest/v1/rpc/")
      ? { status: 404, text: async () => "{}" }
      : { status: 200, text: async () => sessionBody },
  );
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();
  tapButtonIn("login-screen-method-google");
  await flush();
  expect(screen.getByTestId("learner-name-screen-title")).toBeInTheDocument();
  passLearnerSignup();
  expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();
}

function expectJourneyEntryMarker(): void {
  const [only, ...rest] = markerElements();
  expect(rest).toHaveLength(0);
  expect(only?.querySelector('[data-testid="journey-entry-screen-title"]')).not.toBeNull();
}

// ============================================================ IS1 ~ IS11

test("[IS1] 부팅(스플래시) → 온보딩 → 로그인: 표지 0 · 0 · 0", () => {
  stubStorageOnly();
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);

  expect(screen.getByTestId("splash-screen-logo")).toBeInTheDocument();
  expect(markers()).toBe(0);

  advanceSplash();
  expect(screen.getByTestId("onboarding-screen-next")).toBeInTheDocument();
  expect(markers()).toBe(0);

  completeOnboarding();
  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(markers()).toBe(0);
});

test("[IS2] 여정 맵 → 표지 항목 탭(episode-intro) → 뒤로: 0 → 1 → 0", async () => {
  await bootWithoutGuide(<App />);
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(markers()).toBe(0);

  openIntro();
  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
  expect(markerIds()).toEqual(["episode-intro-screen"]);

  tapRoundButtonIn("episode-intro-screen-back");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-intro-screen")).not.toBeInTheDocument();
  expect(markers()).toBe(0);
});

test("[IS4] 맵에서 연속 칩 → 지표 모달 → 닫기, 트로피 칩도 같게. 롤플레이 · 설정 탭 루트는 0", async () => {
  await bootWithoutGuide(<App progressSeed={legacyPassedSeed} />);
  expect(markers()).toBe(0);

  for (const kind of ["streak", "trophy"] as const) {
    tap(`top-bar-${kind}`);
    expect(screen.getByTestId(`journey-stat-modal-${kind}`)).toBeInTheDocument();
    expect(markerIds()).toEqual([`journey-stat-modal-${kind}`]);

    tapRoundButtonIn("journey-stat-modal-back");
    expect(screen.queryByTestId(`journey-stat-modal-${kind}`)).not.toBeInTheDocument();
    expect(markers()).toBe(0);
  }

  openTab("roleplay");
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
  expect(markers()).toBe(0);

  openTab("settings");
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  expect(markers()).toBe(0);
});

test("[IS5] 표지에서 Skip → 확인창 → 머무르기: 1 → 1 → 1", async () => {
  await bootWithoutGuide(<App />);
  openIntro();
  expect(markers()).toBe(1);

  tapButtonIn("episode-intro-screen-skip");
  expect(screen.getByTestId("episode-intro-screen-confirm")).toBeInTheDocument();
  expect(markerIds()).toEqual(["episode-intro-screen"]);

  tapButtonIn("ui-lynx-dialog-action-stay");
  expect(screen.queryByTestId("episode-intro-screen-confirm")).not.toBeInTheDocument();
  expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
  expect(markerIds()).toEqual(["episode-intro-screen"]);
});

test("[IS8] 언어 선택 → journey-entry → 뒤로 → 다시 → 여정 시작(맵): 0 → 1 → 0 → 1 → 0", async () => {
  await signInWithGoogleToLanguageSelect();
  expect(markers()).toBe(0);

  tapButtonIn("language-select-screen-next");
  expect(screen.getByTestId("journey-entry-screen-title")).toBeInTheDocument();
  expectJourneyEntryMarker();

  tapRoundButtonIn("journey-entry-screen-header");
  expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();
  expect(markers()).toBe(0);

  tapButtonIn("language-select-screen-next");
  expect(screen.getByTestId("journey-entry-screen-title")).toBeInTheDocument();
  expectJourneyEntryMarker();

  tapButtonIn("journey-entry-screen-start");
  await flush();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("journey-entry-screen-title")).not.toBeInTheDocument();
  expect(markers()).toBe(0);
});

test("[IS9] 설정의 로그아웃 확인창 · 학습 화면의 나가기 확인 · 로그인의 국가 시트를 연 상태: 0 (스크림 0.45는 표지가 없다)", async () => {
  // (a) 설정의 로그아웃 확인 Dialog
  await bootWithoutGuide(<App progressSeed={legacyPassedSeed} />);
  openTab("settings");
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-settings-group-item-sign-out")).getByTestId(
      "ui-lynx-settings-cell",
    ),
    {},
  );
  expect(screen.getByTestId("ui-lynx-dialog")).toBeInTheDocument();
  expect(markers()).toBe(0);
  cleanup();

  // (b) 학습 화면의 나가기 확인 Dialog
  await bootWithoutGuide(<App progressSeed={u01OpenSeed} />);
  tap(catalogNodeTestId("u01-water", "S1"));
  tap("step-sheet-start");
  expect(screen.getByTestId("learning-run-header-exit")).toBeInTheDocument();
  pressBack();
  expect(screen.getByTestId("ui-lynx-dialog")).toBeInTheDocument();
  expect(markers()).toBe(0);
  cleanup();
  vi.unstubAllGlobals();

  // (c) 로그인의 국가 시트
  stubStorageOnly();
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();
  tap("login-screen-country");
  expect(screen.getByTestId("ui-lynx-bottom-sheet")).toBeInTheDocument();
  expect(markers()).toBe(0);
});

test("[IS10] 안내가 뜬 여정 맵: 표지 1(first-unit-guide-map, 화면 루트가 아니다) → 스크림 탭으로 닫으면 0", async () => {
  await renderSignedInApp(<App />, newLearner);

  expect(screen.getByTestId("first-unit-guide-map")).toBeInTheDocument();
  expect(markerIds()).toEqual(["first-unit-guide-map"]);
  expect(screen.getByTestId("journey-map-screen")).not.toHaveAttribute("data-statusbar");

  catchTap("first-unit-guide-map");
  expect(screen.queryByTestId("first-unit-guide-map")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(markers()).toBe(0);
});

test("[IS11] 첫 사용자의 u00 표지: 안내를 닫은 뒤 표지를 열면 표지 하나, 돌아오면 0이다", async () => {
  await renderSignedInApp(<App />, newLearner);
  expect(markerIds()).toEqual(["first-unit-guide-map"]);
  catchTap("first-unit-guide-map");
  expect(markers()).toBe(0);

  tap(introUnit);
  expect(markerIds()).toEqual(["episode-intro-screen"]);

  tapRoundButtonIn("episode-intro-screen-back");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(markers()).toBe(0);
});
