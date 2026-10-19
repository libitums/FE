import { journeySeedBefore } from "./test-helpers/journey-seed";
import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { systemBackEventName } from "../lib/system-back";
import * as messengerData from "../screens/messenger/messenger";
import { keyboardConversation } from "../screens/messenger/messenger-keyboard-fixture.test-support";
import { answerMessengerReplies } from "../screens/messenger/messenger.test-support";
import type { AppJourneySeed } from "./journey-progress";
import { journeySteps } from "../screens/journey-map/journey-map";

// 호스트가 넘기는 globalProps(`safeAreaInsets` · `tappableBottomInset`)가 App 전체 트리에서
// 셸의 아래 여백(`app-shell`)과 탭 바 바닥 면(`app-navigator-floor`)으로 이어지는지 봅니다
// (android-tabbar-inset 계획 II1~II6). 입력은 `lynx.__globalProps`에 둡니다 —
// `useGlobalProps`가 이 값을 읽습니다. 관찰은 화면에 보이는 것(testid 요소의 style)뿐입니다.

type HostInsets = {
  readonly safeAreaInsets: { top: number; bottom: number; left: number; right: number };
  readonly tappableBottomInset?: number;
};

// 수치는 기대 수치 표(Pixel_8 · iPhone)입니다.
const threeButton: HostInsets = {
  safeAreaInsets: { top: 24, bottom: 48, left: 0, right: 0 },
  tappableBottomInset: 48,
};
const gesture: HostInsets = {
  safeAreaInsets: { top: 24, bottom: 24, left: 0, right: 0 },
  tappableBottomInset: 0,
};
// iOS 호스트는 tappableBottomInset 키를 넘기지 않습니다.
const ios: HostInsets = {
  safeAreaInsets: { top: 59, bottom: 34, left: 0, right: 0 },
};

const completedIntros = ["tutorial-intro"] as const;

function setHostInsets(value: HostInsets | undefined): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = value;
}

afterEach(() => {
  cleanup();
  setHostInsets(undefined);
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function boot(host: HostInsets, withIntroDone = true): Promise<void> {
  setHostInsets(host);
  vi.stubGlobal("NativeModules", {
    SystemBackModule: {
      ready: vi.fn<() => void>(),
      respond: vi.fn<(token: string, outcome: string) => void>(),
    },
  });
  await renderSignedInApp(
    withIntroDone ? (
      <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />
    ) : (
      <App journeySeed={journeySeedBefore("ordering")} />
    ),
  );
}

const tap = (id: string): void => void fireEvent.tap(screen.getByTestId(id), {});
const openTab = (tab: "journey" | "roleplay" | "settings"): void =>
  tap(`ui-lynx-bottom-navigator-item-${tab}`);

function pressBack(): void {
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(systemBackEventName, ["1"]);
  });
}

function shellPaddingBottom(): string {
  return screen.getByTestId("app-shell").style.paddingBottom;
}
function floorHeight(): string | undefined {
  return screen.queryByTestId("app-navigator-floor")?.style.height;
}
const hasNavigator = (): boolean => screen.queryByTestId("app-navigator") !== null;

test("[II1] 3버튼 · 여정 맵: 셸 아래 여백과 바닥 면이 48px다", async () => {
  await boot(threeButton);

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(shellPaddingBottom()).toBe("48px");
  expect(floorHeight()).toBe("48px");
});

test("[II2] 3버튼 · 롤플레이 탭과 설정 탭도 같은 여백과 바닥 면이다", async () => {
  await boot(threeButton);

  openTab("roleplay");
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
  expect(shellPaddingBottom()).toBe("48px");
  expect(floorHeight()).toBe("48px");

  openTab("settings");
  expect(screen.queryByTestId("roleplay-list-screen-title")).not.toBeInTheDocument();
  expect(shellPaddingBottom()).toBe("48px");
  expect(floorHeight()).toBe("48px");
});

test("[II3] 제스처 · 여정 맵: 여백 0px, 바닥 면 없음", async () => {
  await boot(gesture);

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(hasNavigator()).toBe(true);
  expect(shellPaddingBottom()).toBe("0px");
  expect(screen.queryByTestId("app-navigator-floor")).not.toBeInTheDocument();
});

test("[II4] iOS(키 없음) · 탭 루트는 0px에 바닥 면 없음, 알림 화면은 34px에 탭 바 없음", async () => {
  await boot(ios);

  expect(shellPaddingBottom()).toBe("0px");
  expect(screen.queryByTestId("app-navigator-floor")).not.toBeInTheDocument();

  tap("top-bar-notifications");
  expect(screen.getByTestId("notifications-screen-title")).toBeInTheDocument();
  expect(hasNavigator()).toBe(false);
  expect(shellPaddingBottom()).toBe("34px");
});

test("[II5] 3버튼 · 알림 화면은 48px에 탭 바 없음, 뒤로 가면 맵에서 48px와 바닥 면이 돌아온다", async () => {
  await boot(threeButton);

  tap("top-bar-notifications");
  expect(screen.getByTestId("notifications-screen-title")).toBeInTheDocument();
  expect(hasNavigator()).toBe(false);
  expect(shellPaddingBottom()).toBe("48px");

  pressBack();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(shellPaddingBottom()).toBe("48px");
  expect(floorHeight()).toBe("48px");
});

test("[II6] 3버튼 · 서사 표지(전체 화면 그림 화면): 여백 0px, 탭 바 없음", async () => {
  await boot(threeButton, false);

  openTab("journey");
  tap("ui-lynx-special-unit-tutorial-intro");

  expect(screen.getByTestId("episode-intro-screen-next")).toBeInTheDocument();
  expect(hasNavigator()).toBe(false);
  expect(shellPaddingBottom()).toBe("0px");
});

// ---------------------------------------------------------------- 자판 도킹 (II7 ~ II10)

const messengerUnitId = "appointment-confirmation";
const finishedTutorial: AppJourneySeed = {
  completedStepCount: journeySteps.length,
  completedMessengerUnitIds: [messengerUnitId],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

// 첫 답장이 자판인 대화로 고정합니다 — 실데이터의 첫 답장은 보기입니다.
async function bootMessenger(host: HostInsets, seed: AppJourneySeed): Promise<void> {
  vi.spyOn(messengerData, "messengerConversationFor").mockReturnValue(keyboardConversation);
  setHostInsets(host);
  vi.stubGlobal("NativeModules", {
    SystemBackModule: {
      ready: vi.fn<() => void>(),
      respond: vi.fn<(token: string, outcome: string) => void>(),
    },
  });
  await renderSignedInApp(<App journeySeed={seed} completedEpisodeIntroIds={completedIntros} />);
}

const bootJourneyMessenger = async (host: HostInsets): Promise<void> => {
  await bootMessenger(host, journeySeedBefore(messengerUnitId));
  openTab("journey");
  tap(`ui-lynx-special-unit-${messengerUnitId}`);
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
};

const shellStyle = () => screen.getByTestId("app-shell").style;
const rowsMargin = (): string => screen.getByTestId("messenger-keyboard-rows").style.marginBottom;
const surfaceMargin = (): string =>
  screen.getByTestId("messenger-screen-surface").style.marginBottom;

test("[II7] 3버튼 · 여정 메신저: 셸은 아래 · 좌우 0에 위 24, 자판 묶음이 48px를 진다", async () => {
  await bootJourneyMessenger(threeButton);

  expect(hasNavigator()).toBe(false);
  expect(shellStyle().paddingTop).toBe("24px");
  expect(shellStyle().paddingBottom).toBe("0px");
  expect(shellStyle().paddingLeft).toBe("0px");
  expect(shellStyle().paddingRight).toBe("0px");
  expect(rowsMargin()).toBe("48px");
  expect(surfaceMargin()).toBe("0px");
});

test("[II8] iOS · 메신저: 자판이 있는 동안 묶음 34px, 대화가 끝나면 표면이 34px를 이어받고 셸은 0px 그대로다", async () => {
  await bootJourneyMessenger(ios);

  expect(shellPaddingBottom()).toBe("0px");
  expect(rowsMargin()).toBe("34px");

  answerMessengerReplies();

  expect(screen.queryByTestId("messenger-keyboard")).not.toBeInTheDocument();
  expect(surfaceMargin()).toBe("34px");
  expect(shellPaddingBottom()).toBe("0px");
});

test("[II9] 3버튼 · 롤플레이 메신저: 셸 0px · 탭 바 없음 · 묶음 48px", async () => {
  await bootMessenger(threeButton, finishedTutorial);
  openTab("roleplay");
  tap(`roleplay-list-item-${messengerUnitId}`);

  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
  expect(hasNavigator()).toBe(false);
  expect(shellPaddingBottom()).toBe("0px");
  expect(rowsMargin()).toBe("48px");
});

test("[II10] 3버튼 · 메신저에서 시스템 뒤로 가면 맵에서 셸 48px와 바닥 면 48px가 돌아온다", async () => {
  await bootJourneyMessenger(threeButton);
  expect(shellPaddingBottom()).toBe("0px");

  pressBack();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(shellPaddingBottom()).toBe("48px");
  expect(floorHeight()).toBe("48px");
});

// ⟨2026-10-19⟩ 여정 맵은 상태 표시줄 뒤까지 스크롤한다(사용자 결정) — 셸이 위 안전 영역을 칠하던 흰 띠 뒤로 맵이
// 뚝 끊겨 보였다. 셸은 여정 맵에서 위 여백을 잡지 않고, 칩 · 맵 첫 내용은 그 높이만큼 스스로 내려 같은 화면 자리에 선다.
const styleOf = (testId: string): string => screen.getByTestId(testId).getAttribute("style") ?? "";

test("[II11] iOS · 여정 맵: 셸 위 여백 0px, 칩은 안전 영역 아래(12 + 59), 맵 첫 내용도 그만큼 내려온다", async () => {
  await boot(ios);

  expect(screen.getByTestId("app-shell").style.paddingTop).toBe("0px");
  expect(styleOf("app-header")).toMatch(/top:\s*71px/);
  expect(styleOf("journey-map-screen-map")).toMatch(/padding-top:\s*271px/);
});

test("[II12] iOS · 다른 탭 루트는 셸이 위 여백을 그대로 잡고 칩은 기본 자리다", async () => {
  await boot(ios);

  openTab("settings");
  expect(screen.getByTestId("app-shell").style.paddingTop).toBe("59px");
  expect(styleOf("app-header")).toMatch(/top:\s*12px/);

  openTab("journey");
  expect(screen.getByTestId("app-shell").style.paddingTop).toBe("0px");
});
