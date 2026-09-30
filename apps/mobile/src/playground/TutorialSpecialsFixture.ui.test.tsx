import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { answerMessengerReplies } from "../screens/messenger/messenger.test-support";
import { TutorialSpecialsFixture } from "./TutorialSpecialsFixture";
import { readFinalStory } from "../app/test-helpers/final-story";
import { episodeFinalTestFor } from "../screens/episode-final/episode-final-tests";
import { episodeFinalAdvanceDelayMs } from "../screens/episode-final/episode-final";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test.each([
  [3, "PERFECT LESSON!"],
  [2, "LESSON COMPLETE!"],
])("미리보기에서 %i개 정답 후 엔딩 → 결과 → Check 순서를 지킨다", (correctCount, title) => {
  vi.useFakeTimers();
  const onExit = vi.fn<() => void>();
  render(<TutorialSpecialsFixture initialStage={3} onExit={onExit} />);
  readFinalStory("introduction");
  const review = episodeFinalTestFor("tutorial-final-test");
  if (review.format !== "visual-novel") throw new Error("Expected visual novel");
  for (const [index, question] of review.questions.entries()) {
    if (question.kind !== "word-choice") throw new Error("Expected word choice");
    const answer = index < correctCount ? question.answerIndex : (question.answerIndex + 1) % 3;
    fireEvent.tap(screen.getByTestId(`episode-final-screen-option-${answer}`), {});
    act(() => {
      vi.advanceTimersByTime(episodeFinalAdvanceDelayMs);
    });
  }
  expect(screen.queryByTestId("lesson-complete-screen")).toBeNull();
  readFinalStory("ending");
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent(title);
  expect(onExit).not.toHaveBeenCalled();
  fireEvent.tap(screen.getByText("Check →"), {});
  expect(onExit).toHaveBeenCalledTimes(1);
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
  expect(screen.getByTestId("episode-narrative-screen-title")).toHaveTextContent("Almost There");
  expect(onExit).not.toHaveBeenCalled();
});
