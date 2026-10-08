import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { EpisodeIntroScreen } from "./EpisodeIntroScreen";

// `ui` 계층: 상태바 아이콘 표지(`data-statusbar`)가 계약이 정한 요소에 달리는지 봅니다.
// 호스트가 읽는 값이라 렌더 결과의 속성을 문서에서 질의합니다 — 정본은
// android-status-bar-appearance 계약 3.2 · r02.2.

afterEach(cleanup);

const markers = () =>
  Array.from(document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`));

function renderIntro() {
  return render(
    <EpisodeIntroScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      label="Episode 0."
      title="Tutorial."
      onBack={vi.fn<() => void>()}
      onSkip={vi.fn<() => void>()}
      onNext={vi.fn<() => void>()}
    />,
  );
}

test("UT1: 표지 화면의 루트에 표지가 하나 선다", () => {
  renderIntro();

  expect(markers()).toHaveLength(1);
  expect(markers()[0]).toBe(screen.getByTestId("episode-intro-screen"));
});

test("UT2: Skip 확인창을 열어도 표지는 하나고 스크림에는 없다", () => {
  renderIntro();
  fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-skip")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(screen.getByTestId("episode-intro-screen-confirm")).toBeInTheDocument();

  expect(markers()).toHaveLength(1);
  expect(markers()[0]).toBe(screen.getByTestId("episode-intro-screen"));
});
