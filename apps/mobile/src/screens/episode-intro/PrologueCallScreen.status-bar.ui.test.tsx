import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { FirstUnitGuideProvider } from "../../components/first-unit-guide";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import type { PrologueCall } from "./episode-intro.contract";
import { PrologueCallScreen } from "./PrologueCallScreen";

// `ui` 계층: 통화 화면은 밝은 화면이라 표지를 달지 않습니다. 첫 단원 안내가 뜨면 그 안내만
// 표지를 집니다(계약 3.2 · r02.2).

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const markers = () =>
  Array.from(document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`));

const call: PrologueCall = {
  callerName: "Minseo",
  lines: [{ text: "여보세요?", translation: "Hello?" }],
};

function callScreen(guided = false) {
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: { play: () => {}, stopRing: () => {} },
  });
  return (
    <PrologueCallScreen
      guided={guided}
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      episodeLabel="Episode 0."
      call={call}
      callerPortrait="portrait.png"
      onComplete={vi.fn<() => void>()}
      onBack={vi.fn<() => void>()}
    />
  );
}

test("UT8: 안내 없는 통화 화면에는 표지가 없다", () => {
  render(callScreen());

  expect(markers()).toHaveLength(0);
});

test("UT13: 안내가 뜬 통화는 표지가 안내 하나고 닫으면 0개다", () => {
  render(<FirstUnitGuideProvider enabled>{callScreen(true)}</FirstUnitGuideProvider>);

  expect(markers()).toHaveLength(1);
  expect(markers()[0]).toBe(screen.getByTestId("first-unit-guide-call"));

  fireEvent.tap(screen.getByTestId("first-unit-guide-call"), { eventType: "catchEvent" });

  expect(markers()).toHaveLength(0);
});
