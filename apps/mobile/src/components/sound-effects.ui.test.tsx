import { afterEach, expect, test, vi } from "vitest";
import { render } from "@lynx-js/react/testing-library";

import { AnswerVerdict } from "./AnswerVerdict";
import { LearningActivityComplete } from "../screens/learning/LearningActivityComplete";
import { LessonCompleteScreen } from "../screens/lesson-complete/LessonCompleteScreen";
import { CultureQuizOption } from "../screens/culture-quiz/CultureQuizOption";
import { lessonRewardPlaceholder } from "../screens/lesson-complete/lesson-complete";

afterEach(() => vi.unstubAllGlobals());

function stubSound() {
  const play = vi.fn();
  vi.stubGlobal("NativeModules", { SoundEffectsModule: { play, stopRing: vi.fn() } });
  return play;
}

test("판정 배지는 표시된 결과음만 한 번 요청하고 같은 결과의 재렌더에서는 반복하지 않는다", () => {
  const play = stubSound();
  const view = render(<AnswerVerdict result="correct" />);
  expect(play).toHaveBeenCalledExactlyOnceWith("correct_answer");

  view.rerender(<AnswerVerdict result="correct" />);
  expect(play).toHaveBeenCalledTimes(1);
  view.rerender(<AnswerVerdict result="incorrect" />);
  expect(play).toHaveBeenLastCalledWith("wrong_answer");
  expect(play).toHaveBeenCalledTimes(2);
});

test("문화 퀴즈는 응답 전에는 조용하고 판정이 나타날 때만 효과음을 요청한다", () => {
  const play = stubSound();
  const view = render(
    <CultureQuizOption index={0} text="Answer" result={null} onSelect={() => {}} />,
  );
  expect(play).not.toHaveBeenCalled();

  view.rerender(
    <CultureQuizOption index={0} text="Answer" result="incorrect" onSelect={() => {}} />,
  );
  expect(play).toHaveBeenCalledExactlyOnceWith("wrong_answer");
});

test("활동 완료 안내는 결과 화면의 큰 축하음과 다른 소리를 한 번 요청한다", () => {
  const play = stubSound();
  render(<LearningActivityComplete questionCount={3} testId="done" />);
  expect(play).toHaveBeenCalledExactlyOnceWith("lesson_complete");
});

test.each([
  {
    verdict: "passed" as const,
    results: ["correct"] as const,
    skippedCount: 0,
    sound: "pass_lesson",
  },
  {
    verdict: "passed" as const,
    results: ["incorrect"] as const,
    skippedCount: 0,
    sound: "pass_lesson",
  },
  {
    verdict: "failed" as const,
    results: ["incorrect"] as const,
    skippedCount: 0,
    sound: "failed_lesson",
  },
  {
    verdict: "passed" as const,
    results: ["correct"] as const,
    skippedCount: 1,
    sound: "pass_lesson",
  },
])("레슨 결과 $sound 파일을 한 번 요청한다", ({ verdict, results, skippedCount, sound }) => {
  const play = stubSound();
  render(
    <LessonCompleteScreen
      verdict={verdict}
      results={results}
      skippedCount={skippedCount}
      streakDays={0}
      trophyCount={0}
      reward={lessonRewardPlaceholder}
      onExit={() => {}}
    />,
  );
  expect(play).toHaveBeenCalledExactlyOnceWith(sound);
});
