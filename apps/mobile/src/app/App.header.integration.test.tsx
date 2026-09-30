import { journeySteps } from "../screens/journey-map/journey-map";
import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { AppJourneySeed } from "./App";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// App · 전역 머리(`AppHeader`) · 바텀 네비게이션 · 젬 구매 화면의 실제 결선을 봅니다.
// 목킹하지 않습니다(외부 IO 없음).

afterEach(() => {
  vi.unstubAllGlobals();
});

test("[AH-I1] 탭 루트 셋 모두에 머리와 바텀 네비게이션이 함께 선다", async () => {
  await renderSignedInApp(<App />);

  for (const tab of ["journey", "roleplay", "settings"] as const) {
    fireEvent.tap(screen.getByTestId(`ui-lynx-bottom-navigator-item-${tab}`), {});
    expect(screen.getByTestId("ui-lynx-bottom-navigator")).toBeInTheDocument();
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(screen.getByTestId("top-bar-gem")).toBeInTheDocument();
  }
});

test("[AH-I2] 탭 루트 위에 화면이 쌓이면 머리가 내려간다", async () => {
  await renderSignedInApp(<App />);

  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});

  expect(screen.queryByTestId("app-header")).toBeNull();
});

test("[AH-I3] 젬 구매 화면의 Pay는 준비 중 안내만 띄우고 젬은 늘지 않는다", async () => {
  await renderSignedInApp(<App />);
  expect(screen.getByTestId("top-bar-gem")).toHaveTextContent("0");

  fireEvent.tap(screen.getByTestId("top-bar-gem"), {});
  fireEvent.tap(
    screen
      .getByTestId("gem-purchase-screen-pay")
      .querySelector('[data-testid="ui-lynx-button"]') as Element,
    {},
  );

  expect(screen.getByTestId("gem-purchase-screen-notice")).toBeInTheDocument();
  expect(screen.getByTestId("top-bar-gem")).toHaveTextContent("0");
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
  await renderSignedInApp(<App completedEpisodeIntroIds={["tutorial-intro"]} />);
  expect(header()).toHaveAttribute("accessibility-elements-hidden", "false");

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  expect(header()).toHaveAttribute("accessibility-elements-hidden", "true");

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});
  expect(header()).toHaveAttribute("accessibility-elements-hidden", "false");
});

// ⟨2026-09-29⟩ 씨앗을 형제([AH-I4]·[AH-I6]·[AH-I7])와 맞춥니다 — 표지가 맵 항목이
// 되면서 에피소드의 완료가 **표지까지** 끝나야 참이 됩니다(D6). 표지를 안 끝낸 진행은
// 롤플레이 에피소드를 열어 주지 않아 플러스 줄이 서지 않습니다. 이 파일이 보는 것은
// 머리의 가림이지 표지가 아니므로, 표지는 씨앗으로 지납니다.
test("[AH-I5] 롤플레이의 플러스 안내가 떠 있는 동안 머리가 낭독에서 가려진다", async () => {
  await renderSignedInApp(
    <App journeySeed={finishedTutorial} completedEpisodeIntroIds={["tutorial-intro"]} />,
  );
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

test("[AH-I6] 말풍선이 열린 채 탭을 옮겨도 머리의 가림이 남지 않는다", async () => {
  await renderSignedInApp(<App completedEpisodeIntroIds={["tutorial-intro"]} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});

  expect(header()).toHaveAttribute("accessibility-elements-hidden", "false");
});

test("[AH-I7] 젬 수는 학습 화면의 상단 바에도 같은 값으로 선다", async () => {
  await renderSignedInApp(
    <App completedEpisodeIntroIds={["tutorial-intro"]} initialGemCount={1240} />,
  );
  expect(screen.getByTestId("top-bar-gem")).toHaveTextContent("1240");

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});

  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
  expect(screen.getByTestId("top-bar-gem")).toHaveTextContent("1240");
});
