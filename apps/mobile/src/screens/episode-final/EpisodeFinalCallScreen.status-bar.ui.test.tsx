import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@lynx-js/react/testing-library";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import type { EpisodeFinalCallTest } from "./episode-final.contract";
import { EpisodeFinalCallScreen } from "./EpisodeFinalCallScreen";

// `ui` 계층: 최종 테스트의 통화 형식은 밝은 화면이라 표지를 달지 않습니다(계약 3.2).

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const markers = () =>
  Array.from(document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`));

const callTest: EpisodeFinalCallTest = {
  format: "call",
  unitId: "tutorial-final-test",
  callerName: "Yuna",
  turns: [
    { kind: "line", id: "hello", text: "여보세요?", translation: "Hello?" },
    { kind: "speaking", id: "hi", sentence: "안녕", romanization: "[an.nyeong]" },
  ],
};

test("UT8: 최종 테스트 통화 화면에는 표지가 없다", () => {
  render(
    <EpisodeFinalCallScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      episodeLabel="Episode 0."
      test={callTest}
      callerPortrait="portrait.png"
      onFinish={vi.fn()}
      onExit={vi.fn<() => void>()}
    />,
  );

  expect(markers()).toHaveLength(0);
});
