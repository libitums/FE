import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { EpisodeIntroScreen } from "./EpisodeIntroScreen";

function renderIntro() {
  const props = {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    label: "Episode 0.",
    title: "Tutorial.",
    onBack: vi.fn<() => void>(),
    onSkip: vi.fn<() => void>(),
    onNext: vi.fn<() => void>(),
  };
  render(<EpisodeIntroScreen {...props} />);
  return props;
}

// `ui` 계층: 시스템 뒤로가기(`backHandlers.runTop()`)가 보이는 닫기를 누른 것과 같은 결과를
// 내는지 봅니다. 스택은 실물이고, 케이스 사이에 정리 뒤 비어 있어야 합니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function pressBack(): boolean {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
}

test("[US13] 뒤로가기 → onBack 1회 · onSkip 0회 · 확인창 없음(Skip이 아니다)", () => {
  const props = renderIntro();

  expect(pressBack()).toBe(true);

  expect(props.onBack).toHaveBeenCalledTimes(1);
  expect(props.onSkip).not.toHaveBeenCalled();
  expect(props.onNext).not.toHaveBeenCalled();
  expect(screen.queryByTestId("episode-intro-screen-confirm")).not.toBeInTheDocument();
});

test("[UL2] Skip 확인 열림 → 뒤로가기는 확인창만 닫는다(onSkip 0회 · onBack 0회)", () => {
  const props = renderIntro();
  // 확인창은 보이는 Skip으로 엽니다 — 이 케이스는 층 등록만 따로 봅니다.
  fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-skip")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(screen.getByTestId("episode-intro-screen-confirm")).toBeInTheDocument();

  expect(pressBack()).toBe(true);

  expect(screen.queryByTestId("episode-intro-screen-confirm")).not.toBeInTheDocument();
  expect(props.onSkip).not.toHaveBeenCalled();
  expect(props.onBack).not.toHaveBeenCalled();
});
