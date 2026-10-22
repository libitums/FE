import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { StepSentenceOrder } from "./StepSentenceOrder.test-support";
import { stepQuestions } from "./sentence-order-steps.test-support";

afterEach(() => vi.unstubAllGlobals());

test("문장 만들기는 칩 클릭, 채점 판정, 다음 버튼 소리를 순서대로 낸다", () => {
  const calls: string[] = [];
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: { play: (id: string) => calls.push(id), stopRing: () => {} },
  });
  const first = stepQuestions.ordering[0];
  if (first === undefined) throw new Error("ordering 학습 문항이 없다");

  render(<StepSentenceOrder stepId="ordering" onExit={() => {}} onFinish={() => {}} />);
  for (const index of first.answerOrder) {
    fireEvent.tap(screen.getByTestId(`sentence-order-chip-${index}`), {});
  }
  expect(calls).toEqual(first.answerOrder.map(() => "button"));

  // Check는 ui-lynx 버튼이고, 판정음만 나며 클릭음은 나지 않는다.
  fireEvent.tap(
    within(screen.getByTestId("sentence-order-check")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(calls).toEqual([...first.answerOrder.map(() => "button"), "correct_answer"]);

  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
  expect(calls.slice(-2)).toEqual(["button", "lesson_complete"]);
});
