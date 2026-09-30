import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { answerMessengerReplies } from "../screens/messenger/messenger.test-support";
import { TutorialSpecialsFixture } from "./TutorialSpecialsFixture";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("카페를 끝내고 다시 보아도 완료 낭독을 중복하지 않고 최종 복습으로 이동한다", () => {
  const announce = vi.fn();
  vi.stubGlobal("NativeModules", { CompletionAnnouncementModule: { announce } });
  const onExit = vi.fn();
  render(<TutorialSpecialsFixture onExit={onExit} />);

  answerMessengerReplies();
  fireEvent.tap(screen.getByTestId("messenger-finish"), {});
  fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});
  announce.mockClear();

  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("Scene 1 / 3");
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("Scene 2 / 3");
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("Story complete");
  expect(announce).toHaveBeenCalledTimes(1);

  fireEvent.tap(screen.getByTestId("visual-novel-replay-button"), {});
  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("Scene 1 / 3");
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("Story complete");
  expect(announce).toHaveBeenCalledTimes(1);

  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
  expect(screen.getByTestId("episode-final-screen-word-choice")).toBeInTheDocument();
  expect(onExit).not.toHaveBeenCalled();
});
