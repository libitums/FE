import { journeySeedBefore } from "./test-helpers/journey-seed";
import { journeySteps } from "../screens/journey-map/journey-map";
import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { AppJourneySeed } from "./App";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { systemBackEventName } from "../lib/system-back";
import type { MessengerEventSink } from "../screens/messenger/messenger.contract";
import type { SettingsEvent } from "../screens/settings/settings.contract";

// 「호스트 `systemBackPressed` 전역 이벤트 → 스택 → `navReducer` → `SystemBackModule.respond`」를
// App 전체 트리에서 봅니다(IB1~IB15, android-back 계약의 결선 훅 절). 대역은 호스트 경계뿐입니다 —
// `NativeModules.SystemBackModule`({ ready, respond })과 저장소 · 네트워크.
// 훅 모듈을 직접 부르지 않고 이벤트만 쏩니다.

const completedIntros = ["tutorial-intro"] as const;

type BackHost = {
  ready: ReturnType<typeof vi.fn<() => void>>;
  respond: ReturnType<typeof vi.fn<(token: string, outcome: string) => void>>;
};

function stubBackHost(): BackHost {
  const host: BackHost = {
    ready: vi.fn<() => void>(),
    respond: vi.fn<(token: string, outcome: string) => void>(),
  };
  vi.stubGlobal("NativeModules", { SystemBackModule: host });
  return host;
}

let tokenCounter = 0;
/** 누름 하나를 호스트처럼 쏩니다. 누름마다 새 토큰을 돌려줍니다. */
function pressBack(): string {
  tokenCounter += 1;
  const token = String(tokenCounter);
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(systemBackEventName, [token]);
  });
  return token;
}

/** 지금까지의 응답을 `[token, outcome]` 목록으로 봅니다. */
function responses(host: BackHost): unknown[][] {
  return host.respond.mock.calls as unknown[][];
}

function expectOneResponse(host: BackHost, token: string, outcome: "handled" | "leave"): void {
  expect(host.respond).toHaveBeenCalledTimes(1);
  expect(host.respond).toHaveBeenCalledWith(token, outcome);
}

const tap = (id: string): void => void fireEvent.tap(screen.getByTestId(id), {});
const openTab = (tab: "journey" | "roleplay" | "settings"): void =>
  tap(`ui-lynx-bottom-navigator-item-${tab}`);
const settingsCell = (id: string): HTMLElement =>
  within(screen.getByTestId(`ui-lynx-settings-group-item-${id}`)).getByTestId(
    "ui-lynx-settings-cell",
  );
const isSelected = (tab: string): boolean =>
  screen.getByTestId(`ui-lynx-bottom-navigator-item-${tab}`).getAttribute("data-selected") ===
  "true";

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

afterEach(() => {
  // 모듈 수준 핸들러 스택은 화면이 언마운트되며 등록을 풉니다 — 케이스 사이에 새지 않게 트리를 내립니다.
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// 진입 구간(저장소 비어 있음)을 호스트 대역과 함께 부팅합니다.
function bootEntry(host: BackHost): void {
  const store = new Map<string, string>();
  vi.stubGlobal("NativeModules", {
    SystemBackModule: host,
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
}

function advanceSplash(): void {
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
}

function onboardingNext(): void {
  fireEvent.tap(
    within(screen.getByTestId("onboarding-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
}

// 튜토리얼을 다 끝낸 진행입니다 — 롤플레이는 에피소드를 끝내야 열립니다.
const finishedTutorial: AppJourneySeed = {
  completedStepCount: journeySteps.length,
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

test("[IB1] 앱 구간에 들어서면 호스트에 준비 완료를 정확히 한 번 알린다", async () => {
  const host = stubBackHost();
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );
  await flush();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(host.ready).toHaveBeenCalledTimes(1);
});

test("[IB2] 여정 맵(루트)에서 누르면 떠남으로 응답하고 화면은 그대로다", async () => {
  const host = stubBackHost();
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );

  const token = pressBack();

  expectOneResponse(host, token, "leave");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});

test("[IB3] 롤플레이 탭 루트에서 누르면 여정 맵이 서고 탭 표시가 여정이며 처리됨으로 응답한다", async () => {
  const host = stubBackHost();
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );
  openTab("roleplay");
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();

  const token = pressBack();

  expectOneResponse(host, token, "handled");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("roleplay-list-screen-title")).not.toBeInTheDocument();
  expect(isSelected("journey")).toBe(true);
  expect(host.respond).not.toHaveBeenCalledWith(expect.anything(), "leave");
});

test("[IB4] 설정 탭 루트에서 누르면 여정 맵이 서고 처리됨으로 응답하며 settings_opened를 더 내지 않는다", async () => {
  const host = stubBackHost();
  const events: SettingsEvent[] = [];
  await renderSignedInApp(
    <App
      journeySeed={journeySeedBefore("ordering")}
      completedEpisodeIntroIds={completedIntros}
      settingsEventSink={(event) => events.push(event)}
    />,
  );
  openTab("settings");
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  const openedBefore = events.filter((event) => event.name === "settings_opened").length;

  const token = pressBack();

  expectOneResponse(host, token, "handled");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("settings-screen-title")).not.toBeInTheDocument();
  expect(isSelected("journey")).toBe(true);
  expect(events.filter((event) => event.name === "settings_opened")).toHaveLength(openedBefore);
});

test("[IB5] 학습 화면에서 누르면 나가기 확인창만 서고, 다시 누르면 확인창만 닫히며 나가지 않는다", async () => {
  const host = stubBackHost();
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );
  tap("ui-lynx-learning-unit-ordering");
  tap("step-sheet-start");
  expect(screen.getByTestId("learning-shell-exit")).toBeInTheDocument();
  expect(screen.queryByTestId("ui-lynx-dialog")).not.toBeInTheDocument();

  const first = pressBack();
  expect(screen.getByTestId("ui-lynx-dialog")).toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-exit")).toBeInTheDocument();
  expect(responses(host)).toEqual([[first, "handled"]]);

  const second = pressBack();
  expect(screen.queryByTestId("ui-lynx-dialog")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-exit")).toBeInTheDocument();
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  expect(responses(host)).toEqual([
    [first, "handled"],
    [second, "handled"],
  ]);
});

test("[IB6] 여정에서 알림 화면을 열고 누르면 맵으로 돌아오고, 한 번 더 누르면 떠남이다", async () => {
  const host = stubBackHost();
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );
  tap("top-bar-notifications");
  expect(screen.getByTestId("notifications-screen-title")).toBeInTheDocument();

  const first = pressBack();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("notifications-screen-title")).not.toBeInTheDocument();

  const second = pressBack();
  expect(responses(host)).toEqual([
    [first, "handled"],
    [second, "leave"],
  ]);
});

test("[IB7] 맵의 스텝 말풍선 · 첫 유닛 안내가 열려 있으면 그 층만 닫히고 맵은 그대로이며 처리됨으로 응답한다", async () => {
  // (a) 스텝 말풍선
  const bubbleHost = stubBackHost();
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );
  tap("ui-lynx-learning-unit-ordering");
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();

  const bubbleToken = pressBack();

  expectOneResponse(bubbleHost, bubbleToken, "handled");
  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();

  // (b) 첫 유닛 안내 — 새 설치로 다시 부팅합니다.
  cleanup();
  vi.unstubAllGlobals();
  const guideHost = stubBackHost();
  await renderSignedInApp(<App />, {
    refreshedAccessToken: `e30.${btoa(JSON.stringify({ sub: "new-learner" }))}.sig`,
    loadProgress: async () => ({ status: 200, body: "null" }),
  });
  expect(screen.getByTestId("first-unit-guide-map")).toBeInTheDocument();

  const guideToken = pressBack();

  expectOneResponse(guideHost, guideToken, "handled");
  expect(screen.queryByTestId("first-unit-guide-map")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});

test("[IB8] 여정 메신저(미완료)에서 누르면 미완료 이탈 이벤트 한 번과 함께 맵으로 돌아온다", async () => {
  const host = stubBackHost();
  const sink = vi.fn<NonNullable<MessengerEventSink>>();
  await renderSignedInApp(
    <App
      journeySeed={journeySeedBefore("appointment-confirmation")}
      completedEpisodeIntroIds={completedIntros}
      messengerEventSink={sink}
    />,
  );
  tap("ui-lynx-learning-unit-appointment-confirmation");
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();

  const token = pressBack();

  expectOneResponse(host, token, "handled");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("messenger-screen")).not.toBeInTheDocument();
  const incomplete = sink.mock.calls
    .map(([event]) => event)
    .filter((event) => event.name === "messenger_unit_exited_incomplete");
  expect(incomplete).toHaveLength(1);
});

test("[IB9] 설정 → 프로필에서 누르면 설정 루트, 여정 맵, 떠남 순으로 응답한다", async () => {
  const host = stubBackHost();
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );
  openTab("settings");
  fireEvent.tap(settingsCell("profile"), {});
  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();

  const first = pressBack();
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("profile-screen-title")).not.toBeInTheDocument();

  const second = pressBack();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(isSelected("journey")).toBe(true);

  const third = pressBack();
  expect(responses(host)).toEqual([
    [first, "handled"],
    [second, "handled"],
    [third, "leave"],
  ]);
});

test("[IB10] 롤플레이 메신저에서 누르면 롤플레이 목록으로 돌아온다 — 여정 맵이 아니다", async () => {
  const host = stubBackHost();
  await renderSignedInApp(
    <App journeySeed={finishedTutorial} completedEpisodeIntroIds={completedIntros} />,
  );
  openTab("roleplay");
  tap("roleplay-list-item-appointment-confirmation");
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();

  const token = pressBack();

  expectOneResponse(host, token, "handled");
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  expect(isSelected("roleplay")).toBe(true);
});

test("[IB11] 설정의 로그아웃 확인이 열려 있으면 확인창만 닫히고 세션은 유지된다", async () => {
  const host = stubBackHost();
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );
  openTab("settings");
  fireEvent.tap(settingsCell("sign-out"), {});
  expect(screen.getByTestId("settings-screen-sign-out-dialog")).toBeInTheDocument();

  const token = pressBack();

  expectOneResponse(host, token, "handled");
  expect(screen.queryByTestId("settings-screen-sign-out-dialog")).not.toBeInTheDocument();
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("login-screen-title")).not.toBeInTheDocument();
});

test("[IB12] 전역 머리의 연속 학습 모달이 열려 있으면 모달만 닫히고 맵은 그대로다", async () => {
  const host = stubBackHost();
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );
  tap("top-bar-streak");
  expect(screen.getByTestId("journey-stat-modal-streak")).toBeInTheDocument();

  const token = pressBack();

  expectOneResponse(host, token, "handled");
  expect(screen.queryByTestId("journey-stat-modal-streak")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});

test("[IB13] 진입 구간의 스플래시와 온보딩 첫 스텝에서는 떠남으로 응답한다", () => {
  const host = stubBackHost();
  bootEntry(host);
  expect(screen.getByTestId("splash-screen-logo")).toBeInTheDocument();

  const onSplash = pressBack();
  expect(responses(host)).toEqual([[onSplash, "leave"]]);

  advanceSplash();
  expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "0");

  const onFirstStep = pressBack();
  expect(responses(host)).toEqual([
    [onSplash, "leave"],
    [onFirstStep, "leave"],
  ]);
  expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "0");
});

test("[IB14] 온보딩 둘째 스텝은 앞 스텝으로, 로그인은 온보딩으로 돌아가며 둘 다 처리됨으로 응답한다", () => {
  const host = stubBackHost();
  bootEntry(host);
  advanceSplash();
  onboardingNext();
  expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "1");

  const onSecondStep = pressBack();
  expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "0");

  onboardingNext();
  onboardingNext();
  onboardingNext();
  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();

  const onLogin = pressBack();
  expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("login-screen-title")).not.toBeInTheDocument();
  expect(responses(host)).toEqual([
    [onSecondStep, "handled"],
    [onLogin, "handled"],
  ]);
});

test("[IB15] 인자 없는 이벤트와 수 인자는 응답하지 않고 화면도 그대로다", async () => {
  const host = stubBackHost();
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );
  openTab("settings");
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();

  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(systemBackEventName, []);
  });
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(systemBackEventName, [7]);
  });

  expect(host.respond).not.toHaveBeenCalled();
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();

  // 리스너가 살아 있다는 앵커 — 올바른 토큰은 같은 자리에서 응답을 낸다(없으면 위 단언이 공허하다).
  const token = pressBack();
  expectOneResponse(host, token, "handled");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});
