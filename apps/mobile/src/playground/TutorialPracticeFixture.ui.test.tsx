import { expect, test } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";
import { TutorialPracticeModesFixture } from "./TutorialPracticeFixture";

const tap = (id: string) => fireEvent.tap(screen.getByTestId(id), {});
const button = (id: string) =>
  fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});

test("미리보기는 듣기 결과 확인 후 말하기·쓰기와 각 완료 화면을 거쳐 최종 복습을 연다", () => {
  render(<TutorialPracticeModesFixture onFinal={() => {}} />);
  tap("listening-choice-0");
  tap("learning-shell-advance");
  tap("learning-shell-action");
  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
  button("lesson-complete-screen-exit");
  for (const mode of ["speaking", "writing"] as const) {
    const unit = `ui-lynx-learning-unit-tutorial-${mode}`;
    expect(screen.getByTestId(unit)).toHaveAttribute("data-status", "active");
    tap(unit);
    tap("step-sheet-start");
    button(`${mode}-screen-skip`);
    tap("learning-shell-action");
    expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent(
      "LESSON COMPLETE!",
    );
    button("lesson-complete-screen-exit");
    expect(screen.getByTestId(unit)).toHaveAttribute("data-status", "clear");
  }
  expect(screen.getByTestId("ui-lynx-learning-unit-tutorial-final-test")).toHaveAttribute(
    "data-status",
    "available",
  );
});
