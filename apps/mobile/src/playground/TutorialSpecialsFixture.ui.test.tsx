import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";
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
  fireEvent.tap(screen.getByText("Check"), {});
  expect(onExit).toHaveBeenCalledTimes(1);
});

test("카페의 마지막 내 대사를 읽은 뒤에만 최종 복습으로 이동한다", () => {
  const announce = vi.fn();
  vi.stubGlobal("NativeModules", { CompletionAnnouncementModule: { announce } });
  const onExit = vi.fn();
  render(<TutorialSpecialsFixture initialStage={2} onExit={onExit} />);
  for (let i = 0; i < 5; i++) fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toHaveTextContent("고마워요!");
  expect(announce).not.toHaveBeenCalled();
  fireEvent.tap(screen.getByTestId("visual-novel-finish-button"), {});
  expect(announce).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("episode-narrative-screen-title")).toHaveTextContent("Almost There");
  expect(onExit).not.toHaveBeenCalled();
});
