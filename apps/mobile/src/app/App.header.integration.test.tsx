import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { AppJourneySeed } from "./App";
import { authTokenStorageKey } from "../lib/auth-token";
import { entrySplashDurationMs } from "../lib/entry-flow";

// App · 전역 머리(`AppHeader`) · 바텀 네비게이션 · 젬 구매 화면의 실제 결선을 봅니다.
// 목킹하지 않습니다(외부 IO 없음).

afterEach(() => {
  vi.unstubAllGlobals();
});

// 토큰이 있는 상태를 스텁하고 진입 스플래시를 건너뜁니다 — 다른 App integration 파일과
// 같은 헬퍼입니다.
function renderApp(ui: Parameters<typeof render>[0]) {
  const previousNativeModules = (globalThis as { NativeModules?: unknown }).NativeModules;
  const tokenStore = new Map<string, string>([[authTokenStorageKey, "existing-token"]]);
  vi.stubGlobal("NativeModules", {
    ...(typeof previousNativeModules === "object" && previousNativeModules !== null
      ? previousNativeModules
      : {}),
    StorageModule: {
      get: (key: string) => tokenStore.get(key) ?? null,
      set: (key: string, value: string) => void tokenStore.set(key, value),
      remove: (key: string) => void tokenStore.delete(key),
    },
  });
  vi.useFakeTimers();
  const result = render(ui);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  vi.useRealTimers();
  return result;
}

test("[AH-I1] 탭 루트 셋 모두에 머리와 바텀 네비게이션이 함께 선다", () => {
  renderApp(<App />);

  for (const tab of ["journey", "roleplay", "settings"] as const) {
    fireEvent.tap(screen.getByTestId(`ui-lynx-bottom-navigator-item-${tab}`), {});
    expect(screen.getByTestId("ui-lynx-bottom-navigator")).toBeInTheDocument();
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(screen.getByTestId("top-bar-gem")).toBeInTheDocument();
  }
});

test("[AH-I2] 탭 루트 위에 화면이 쌓이면 머리가 내려간다", () => {
  renderApp(<App />);

  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});

  expect(screen.queryByTestId("app-header")).toBeNull();
});

test("[AH-I3] 젬을 사면 머리의 젬 칩에 보너스까지 더해진다", () => {
  renderApp(<App />);
  expect(screen.getByTestId("top-bar-gem")).toHaveTextContent("0");

  fireEvent.tap(screen.getByTestId("top-bar-gem"), {});
  fireEvent.tap(
    screen
      .getByTestId("gem-purchase-screen-pay")
      .querySelector('[data-testid="ui-lynx-button"]') as Element,
    {},
  );

  expect(screen.queryByTestId("gem-purchase-screen")).toBeNull();
  expect(screen.getByTestId("top-bar-gem")).toHaveTextContent("3600");
});

// 튜토리얼을 다 끝낸 진행입니다 — 롤플레이의 플러스 안내는 에피소드가 열려야 뜹니다.
const finishedTutorial: AppJourneySeed = {
  completedStepCount: 5,
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
};

function header() {
  return screen.getByTestId("app-header");
}

test("[AH-I4] 여정의 스텝 말풍선이 열린 동안 머리가 낭독에서 가려지고, 닫으면 풀린다", () => {
  renderApp(<App seenEpisodeIntroIds={["tutorial"]} />);
  expect(header()).toHaveAttribute("accessibility-elements-hidden", "false");

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  expect(header()).toHaveAttribute("accessibility-elements-hidden", "true");

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});
  expect(header()).toHaveAttribute("accessibility-elements-hidden", "false");
});

test("[AH-I5] 롤플레이의 플러스 안내가 떠 있는 동안 머리가 낭독에서 가려진다", () => {
  renderApp(<App journeySeed={finishedTutorial} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  const row = screen.getByTestId("roleplay-list-section-premium-row-tutorial");

  fireEvent.tap(row.children[0] as Element, {});
  expect(header()).toHaveAttribute("accessibility-elements-hidden", "true");

  fireEvent.tap(
    screen
      .getByTestId("ui-lynx-dialog-action-close")
      .querySelector('[data-testid="ui-lynx-button"]') as Element,
    {},
  );
  expect(header()).toHaveAttribute("accessibility-elements-hidden", "false");
});

test("[AH-I6] 말풍선이 열린 채 탭을 옮겨도 머리의 가림이 남지 않는다", () => {
  renderApp(<App seenEpisodeIntroIds={["tutorial"]} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});

  expect(header()).toHaveAttribute("accessibility-elements-hidden", "false");
});

test("[AH-I7] 산 젬은 학습 화면의 상단 바에도 같은 값으로 선다", () => {
  renderApp(<App seenEpisodeIntroIds={["tutorial"]} />);
  fireEvent.tap(screen.getByTestId("top-bar-gem"), {});
  fireEvent.tap(
    screen
      .getByTestId("gem-purchase-screen-pay")
      .querySelector('[data-testid="ui-lynx-button"]') as Element,
    {},
  );

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});

  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
  expect(screen.getByTestId("top-bar-gem")).toHaveTextContent("3600");
});
