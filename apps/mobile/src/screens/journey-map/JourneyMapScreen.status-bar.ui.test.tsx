import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { FirstUnitGuideProvider } from "../../components/first-unit-guide";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { JourneyMapScreen } from "./JourneyMapScreen";

// `ui` 계층: 여정 맵의 루트는 밝은 화면이라 표지가 없고, 안내 스크림만 표지를 집니다 —
// 루트에 달면 맵 전체가 밝은 아이콘이 됩니다(계약 r02.2의 8).

afterEach(cleanup);

const markers = () =>
  Array.from(document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`));

function mapScreen() {
  return (
    <JourneyMapScreen
      completedEpisodeIntroIds={["tutorial-intro"]}
      onStartEpisodeIntroUnit={vi.fn()}
      completedMessengerUnitIds={[]}
      onStartMessengerUnit={vi.fn()}
      completedPhoneCallUnitIds={[]}
      onStartPhoneCallUnit={vi.fn()}
      completedVisualNovelUnitIds={[]}
      onStartVisualNovelUnit={vi.fn()}
      completedEpisodeFinalIds={[]}
      onStartEpisodeFinal={vi.fn()}
      completedStepCount={2}
      onStartStep={() => {}}
    />
  );
}

test("UT11: 안내가 뜬 맵은 표지가 스크림 하나(루트가 아니다)고 닫으면 0개다", () => {
  render(<FirstUnitGuideProvider enabled>{mapScreen()}</FirstUnitGuideProvider>);

  expect(markers()).toHaveLength(1);
  expect(markers()[0]).toBe(screen.getByTestId("first-unit-guide-map"));
  expect(markers()[0]).not.toBe(screen.getByTestId("journey-map-screen"));

  fireEvent.tap(screen.getByTestId("first-unit-guide-map"), { eventType: "catchEvent" });

  expect(screen.queryByTestId("first-unit-guide-map")).not.toBeInTheDocument();
  expect(markers()).toHaveLength(0);
});

test("UT11 가드: 안내가 없는 맵에는 표지가 없다", () => {
  render(mapScreen());

  expect(markers()).toHaveLength(0);
});
