import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { StepSheet } from "./StepSheet";

// `ui` 계층: 말풍선 꼬리의 가로 치우침을 prop으로 받아 속성으로 내는지만 봅니다. 치우침 값을 어떻게
// 구하는지(`stepSheetCaretOffset`)는 unit이, 화면이 잰 값으로 이 prop을 채우는지는
// `JourneyMapScreen.caret.ui.test.tsx`가 봅니다. 꼬리가 화면에서 실제로 어디에 그려지는지는 기기에서만 닫힙니다.

test("SS1. 꼬리에 caretOffset이 data-caret-offset으로 실리고 패널 · 닫기 · 시작은 그대로 있다", () => {
  const onStart = vi.fn<() => void>();
  const onClose = vi.fn<() => void>();
  render(
    <StepSheet
      caretOffset={-81}
      title="Ordering"
      top={0}
      lessonOrdinal={3}
      completedActivityCount={0}
      totalActivityCount={4}
      onStart={onStart}
      onClose={onClose}
    />,
  );

  expect(screen.queryByTestId("step-sheet-caret")?.getAttribute("data-caret-offset")).toBe("-81");
  expect(screen.queryByTestId("step-sheet-panel")).not.toBeNull();

  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  expect(onStart).toHaveBeenCalledTimes(1);
  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});
  expect(onClose).toHaveBeenCalledTimes(1);
});
