import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";
import { EpisodeFinalJourneyScreen } from "./EpisodeFinalJourneyScreen";
import { episodeFinalTestFor } from "../screens/episode-final/episode-final-tests";
import { episodeFinalAdvanceDelayMs } from "../screens/episode-final/episode-final";
import { readFinalStory } from "./test-helpers/final-story";

const review = episodeFinalTestFor("tutorial-final-test");
if (review.format !== "visual-novel") throw new Error("Expected visual novel");
const testData = review;
const insets = { top: 0, bottom: 0, left: 0, right: 0 };

afterEach(() => vi.useRealTimers());
function open() {
  vi.useFakeTimers();
  const onFinish = vi.fn();
  const onExit = vi.fn();
  render(
    <EpisodeFinalJourneyScreen
      insets={insets}
      episodeLabel="Tutorial"
      test={testData}
      onFinish={onFinish}
      onExit={onExit}
    />,
  );
  return { onFinish, onExit };
}
function answer(correct: number) {
  for (const [i, question] of testData.questions.entries()) {
    if (question.kind !== "word-choice") throw new Error("Expected word choice");
    const choice = i < correct ? question.answerIndex : (question.answerIndex + 1) % 3;
    fireEvent.tap(screen.getByTestId(`episode-final-screen-option-${choice}`), {});
    act(() => {
      vi.advanceTimersByTime(episodeFinalAdvanceDelayMs);
    });
  }
}

test("이야기 → 상황별 복습 → 통과 후 도착 이야기 → 완료 콜백 순서를 지킨다", () => {
  const { onFinish } = open();
  expect(screen.getByTestId("episode-narrative-screen-dialog")).toHaveTextContent(
    "The airport draws closer",
  );
  expect(screen.queryByTestId("episode-final-screen")).toBeNull();
  readFinalStory("introduction");
  expect(screen.getByTestId("episode-final-screen-context")).toHaveTextContent("Minseo arrives");
  answer(2);
  expect(onFinish).not.toHaveBeenCalled();
  expect(screen.getByTestId("episode-narrative-screen-dialog")).toHaveTextContent("Minseo smiles");
  readFinalStory("ending");
  expect(onFinish).toHaveBeenCalledExactlyOnceWith(["correct", "correct", "incorrect"]);
  // 완료 직후 연속 탭도 App 경계를 다시 넘지 않습니다.
  fireEvent.tap(screen.getByTestId("episode-narrative-screen-advance"), {});
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test("1개 정답이면 마무리를 열지 않고 힌트 뒤 현재 시도의 결과로 다시 평가한다", () => {
  const { onFinish } = open();
  readFinalStory("introduction");
  answer(1);
  expect(onFinish).not.toHaveBeenCalled();
  expect(screen.getByTestId("episode-narrative-screen-dialog")).toHaveTextContent(
    "Let's try the three replies again",
  );
  readFinalStory("retry");
  answer(3);
  expect(onFinish).not.toHaveBeenCalled();
  readFinalStory("ending");
  expect(onFinish).toHaveBeenCalledExactlyOnceWith(["correct", "correct", "correct"]);
});

test("통과 후 마무리 중 나가면 완료 콜백을 보내지 않는다", () => {
  const { onFinish, onExit } = open();
  readFinalStory("introduction");
  answer(3);
  fireEvent.tap(
    within(screen.getByTestId("episode-narrative-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );
  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onFinish).not.toHaveBeenCalled();
});

test("시험 중 이탈하면 예약된 판정 넘김을 취소한다", () => {
  vi.useFakeTimers();
  const onFinish = vi.fn();
  const { unmount } = render(
    <EpisodeFinalJourneyScreen
      insets={insets}
      episodeLabel="Tutorial"
      test={testData}
      onFinish={onFinish}
      onExit={vi.fn()}
    />,
  );
  readFinalStory("introduction");
  fireEvent.tap(screen.getByTestId("episode-final-screen-option-0"), {});
  unmount();
  act(() => {
    vi.advanceTimersByTime(episodeFinalAdvanceDelayMs * 2);
  });
  expect(onFinish).not.toHaveBeenCalled();
});
