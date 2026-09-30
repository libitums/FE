import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";
import { App } from "./App";
import { journeySeedBefore } from "./test-helpers/journey-seed";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { journeySteps, learningFormsForStep } from "../screens/journey-map/journey-map";
import { sentenceOrderQuestionsForStep } from "../screens/sentence-order/sentence-order";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// 배정·문항·채점·진행을 대역하지 않습니다. 각 유닛이 잠금 해제된 바로 그 상태에서 시작합니다.
test.each(journeySteps.filter((step) => learningFormsForStep(step.id)[0] === "sentence-order"))(
  "$id: 안내 한 문항으로 완료하고 맵 순서의 다음 유닛을 연다",
  async (step) => {
    const ordinal = journeySteps.findIndex(({ id }) => id === step.id);
    await renderSignedInApp(
      <App
        completedEpisodeIntroIds={["tutorial-intro"]}
        journeySeed={{ ...journeySeedBefore(step.id), completedStepCount: ordinal }}
        initialGemCount={1240}
      />,
    );
    expect(learningFormsForStep(step.id)).toEqual(["sentence-order"]);
    const questions = sentenceOrderQuestionsForStep(step.id);
    expect(questions).toHaveLength(1);
    const question = questions[0]!;
    expect(question.chips.length).toBeLessThanOrEqual(2);
    expect(question.answerOrder).toHaveLength(question.chips.length);
    expect(question.answerOrder.map((index) => question.chips[index]).join(" ")).toBe(
      question.prompt,
    );

    fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${step.id}`), {});
    fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
    expect(screen.getByTestId("top-bar-gem")).toHaveTextContent("1240");
    expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 1 / 1");
    expect(screen.getByTestId("sentence-order-screen-prompt")).toHaveTextContent(question.prompt);
    expect(screen.getByTestId("sentence-order-screen-translation")).toHaveTextContent(
      question.support!.translation,
    );
    expect(screen.getByTestId("sentence-order-screen-romanization")).toHaveTextContent(
      question.support!.romanization,
    );
    expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent(
      question.support!.instruction,
    );
    expect(screen.queryByTestId("listening-screen-content")).not.toBeInTheDocument();
    for (const index of question.answerOrder) {
      fireEvent.tap(screen.getByTestId(`sentence-order-chip-${index}`), {});
    }
    fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
    expect(screen.getByTestId("answer-verdict")).toHaveTextContent("Correct");
    fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
    expect(screen.getByTestId("learning-activity-complete")).toHaveTextContent(
      "1 of 1 question completed",
    );
    fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
    expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
    fireEvent.tap(
      screen
        .getByTestId("lesson-complete-screen-exit")
        .querySelector('[data-testid="ui-lynx-button"]')!,
      {},
    );
    expect(screen.getByTestId(`ui-lynx-learning-unit-${step.id}`)).toHaveAttribute(
      "data-status",
      "clear",
    );
    if (step.id === "appointment") {
      expect(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation")).toHaveAttribute(
        "data-status",
        "available",
      );
    }
    const next = journeySteps[ordinal + 1];
    if (next !== undefined) {
      expect(screen.getByTestId(`ui-lynx-learning-unit-${next.id}`)).toHaveAttribute(
        "data-status",
        step.id === "appointment" ? "default" : "active",
      );
    }
  },
);
