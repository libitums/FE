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
    if (mode === "speaking") {
      button("speaking-screen-skip");
    } else {
      // ⟨2026-10-19⟩ 쓰기에는 Skip이 없다 — 이 미리보기에는 판정 모듈이 없어 Check 뒤 Next로 넘어간다.
      const surface = screen.getByTestId("drawing-surface");
      fireEvent.touchstart(surface, { touches: [{ x: 100, y: 100 }] });
      fireEvent.touchmove(surface, { touches: [{ x: 150, y: 150 }] });
      fireEvent.touchend(surface, {});
      tap("learning-shell-action"); // Check
      tap("learning-shell-action"); // Next
    }
    tap("learning-shell-action");
    expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent(
      "LESSON COMPLETE!",
    );
    button("lesson-complete-screen-exit");
    expect(screen.getByTestId(unit)).toHaveAttribute("data-status", "clear");
  }
  expect(screen.getByTestId("ui-lynx-special-unit-tutorial-final-test")).toHaveAttribute(
    "data-status",
    "available",
  );
});
