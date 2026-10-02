import { journeySeedBefore } from "./test-helpers/journey-seed";
import { journeySteps } from "../screens/journey-map/journey-map";
import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { AppJourneySeed } from "./App";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// App · 전역 머리(`AppHeader`) · 바텀 네비게이션 의 실제 결선을 봅니다.
// 목킹하지 않습니다(외부 IO 없음).

afterEach(() => {
  vi.unstubAllGlobals();
});

test("[AH-I1] 탭 루트 셋 모두에 머리와 바텀 네비게이션이 함께 선다", async () => {
  await renderSignedInApp(<App journeySeed={journeySeedBefore("ordering")} />);

  for (const tab of ["journey", "roleplay", "settings"] as const) {
    fireEvent.tap(screen.getByTestId(`ui-lynx-bottom-navigator-item-${tab}`), {});
    expect(screen.getByTestId("ui-lynx-bottom-navigator")).toBeInTheDocument();
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(screen.queryByTestId("top-bar-gem")).not.toBeInTheDocument();
    expect(screen.queryByTestId("gem-purchase-screen")).not.toBeInTheDocument();
  }
});

test("[AH-I2] 탭 루트 위에 화면이 쌓이면 머리가 내려간다", async () => {
  await renderSignedInApp(<App journeySeed={journeySeedBefore("ordering")} />);

  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});

  expect(screen.queryByTestId("app-header")).toBeNull();
});

// 튜토리얼을 다 끝낸 진행입니다 — 롤플레이의 플러스 안내는 에피소드가 열려야 뜹니다.
const finishedTutorial: AppJourneySeed = {
  completedStepCount: journeySteps.length,
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

function header() {
  return screen.getByTestId("app-header");
}

test("[AH-I4] 여정의 스텝 말풍선이 열린 동안 머리가 낭독에서 가려지고, 닫으면 풀린다", async () => {
  await renderSignedInApp(
    <App
      journeySeed={journeySeedBefore("ordering")}
      completedEpisodeIntroIds={["tutorial-intro"]}
    />,
  );
  expect(header()).toHaveAttribute("accessibility-elements-hidden", "false");

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  expect(header()).toHaveAttribute("accessibility-elements-hidden", "true");

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});
  expect(header()).toHaveAttribute("accessibility-elements-hidden", "false");
});

test("[AH-I5] 롤플레이에서 Plus 예고를 숨겨도 머리는 그대로 보인다", async () => {
  await renderSignedInApp(
    <App journeySeed={finishedTutorial} completedEpisodeIntroIds={["tutorial-intro"]} />,
  );
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  expect(screen.queryByTestId("roleplay-list-section-premium-tutorial")).not.toBeInTheDocument();
  expect(header()).toHaveAttribute("accessibility-elements-hidden", "false");
});

test("[AH-I6] 말풍선이 열린 채 탭을 옮겨도 머리의 가림이 남지 않는다", async () => {
  await renderSignedInApp(
    <App
      journeySeed={journeySeedBefore("ordering")}
      completedEpisodeIntroIds={["tutorial-intro"]}
    />,
  );
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});

  expect(header()).toHaveAttribute("accessibility-elements-hidden", "false");
});

test("[AH-I7] 젬 잔액이 있어도 탭과 학습 화면의 상단 젬 칩은 숨긴다", async () => {
  await renderSignedInApp(
    <App
      journeySeed={journeySeedBefore("ordering")}
      completedEpisodeIntroIds={["tutorial-intro"]}
      initialGemCount={1240}
    />,
  );
  expect(screen.queryByTestId("top-bar-gem")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});

  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
  expect(screen.queryByTestId("top-bar-gem")).not.toBeInTheDocument();
});
