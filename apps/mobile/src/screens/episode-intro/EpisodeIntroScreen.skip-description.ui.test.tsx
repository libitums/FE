import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { EpisodeIntroScreen } from "./EpisodeIntroScreen";

// `ui` 계층: 건너뛰기 확인 모달의 설명 문구를 호출자가 바꿀 수 있는지만 봅니다.
afterEach(cleanup);

const insets = { top: 0, bottom: 0, left: 0, right: 0 };

function openSkipDialog(skipDescription: string | undefined) {
  render(
    <EpisodeIntroScreen
      insets={insets}
      label="Episode 1."
      title="Water"
      skipDescription={skipDescription}
      onBack={() => {}}
      onSkip={() => {}}
      onNext={() => {}}
    />,
  );
  fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-skip")).getByTestId("ui-lynx-button"),
    {},
  );
  return screen.getByTestId("episode-intro-screen-confirm");
}

test("[SD1] skipDescription을 주면 확인 모달의 설명이 그 문구다", () => {
  const dialog = openSkipDialog("You can watch it again anytime from the episode intro.");

  expect(dialog).toHaveTextContent("You can watch it again anytime from the episode intro.");
  expect(dialog).not.toHaveTextContent("won't appear again");
});

test("[SD2] 주지 않으면 튜토리얼의 기본 설명 그대로다", () => {
  const dialog = openSkipDialog(undefined);

  expect(dialog).toHaveTextContent("If you skip it, this episode's story won't appear again.");
});
