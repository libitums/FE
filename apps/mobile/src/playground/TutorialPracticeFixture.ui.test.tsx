import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";
import { TutorialPracticeModesFixture } from "./TutorialPracticeFixture";

const tap = (id: string) => fireEvent.tap(screen.getByTestId(id), {});
const button = (id: string) =>
  fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("미리보기는 듣기 결과 확인 후 말하기·쓰기와 각 완료 화면을 거쳐 최종 복습을 연다", () => {
  // 쓰기는 호스트의 픽셀 유사도로 판정합니다 — 따라 쓴 획이 안내와 겹친 것으로 답합니다.
  vi.stubGlobal("NativeModules", {
    HandwritingTraceModule: {
      guide: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({ status: "rendered", image: "aGVsbG8=", box: "0,0,1,1", font: "Stub" }),
      compare: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({
          status: "compared",
          coverage: "1",
          stay: "1",
          drawnArea: "10",
          guideArea: "10",
          font: "Stub",
          guideBox: "0,0,1,1",
        }),
    },
  });
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
      // ⟨2026-10-19⟩ 쓰기에는 Skip이 없다 — 따라 쓰고 Check로 판정받는다(정답).
      const surface = screen.getByTestId("drawing-surface");
      fireEvent.touchstart(surface, { touches: [{ x: 100, y: 100 }] });
      fireEvent.touchmove(surface, { touches: [{ x: 150, y: 150 }] });
      fireEvent.touchend(surface, {});
      tap("learning-shell-action"); // Check
      tap("learning-shell-action"); // Next
    }
    tap("learning-shell-action");
    expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent(
      mode === "speaking" ? "LESSON COMPLETE!" : "PERFECT LESSON!",
    );
    button("lesson-complete-screen-exit");
    expect(screen.getByTestId(unit)).toHaveAttribute("data-status", "clear");
  }
  expect(screen.getByTestId("ui-lynx-special-unit-tutorial-final-test")).toHaveAttribute(
    "data-status",
    "available",
  );
});
