import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { StepSentenceOrder } from "./StepSentenceOrder.test-support";
import { bottomAction } from "./sentence-order-check.test-support";
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

  fireEvent.tap(bottomAction(), {});
  expect(calls.slice(-2)).toEqual(["button", "lesson_complete"]);
});

// HF-I1: 진동 메서드가 있는 새 호스트에서는 채점 판정에만 진동이 한 번 붙는다.
test("문장 만들기 흐름에서 진동은 정답 판정 직후 한 번만 요청된다", () => {
  const calls: string[] = [];
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: {
      play: (id: string) => calls.push(`play:${id}`),
      stopRing: () => {},
      haptic: (kind: string) => calls.push(`haptic:${kind}`),
    },
  });
  const first = stepQuestions.ordering[0];
  if (first === undefined) throw new Error("ordering 학습 문항이 없다");

  render(<StepSentenceOrder stepId="ordering" onExit={() => {}} onFinish={() => {}} />);
  for (const index of first.answerOrder) {
    fireEvent.tap(screen.getByTestId(`sentence-order-chip-${index}`), {});
  }
  expect(calls).toEqual(first.answerOrder.map(() => "play:button"));

  fireEvent.tap(
    within(screen.getByTestId("sentence-order-check")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(calls.slice(-2)).toEqual(["play:correct_answer", "haptic:success"]);

  fireEvent.tap(bottomAction(), {});
  expect(calls.slice(-2)).toEqual(["play:button", "play:lesson_complete"]);
  expect(calls.filter((call) => call.startsWith("haptic:"))).toEqual(["haptic:success"]);
});
