import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";

import { CultureScreen } from "./CultureScreen";

// `ui` 계층: 시스템 뒤로가기(`backHandlers.runTop()`)가 보이는 닫기를 누른 것과 같은 결과를
// 내는지 봅니다. 스택은 실물이고, 케이스 사이에 정리 뒤 비어 있어야 합니다.

afterEach(() => {
  cleanup();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function pressBack(): boolean {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
}

test("[US4] 뒤로가기 → onExit 1회(맵으로와 같다) · onStartQuiz 0회", () => {
  const onExit = vi.fn<() => void>();
  const onStartQuiz = vi.fn<() => void>();
  render(
    <CultureScreen
      stepOrdinal={3}
      narrative={{ title: "인사말", paragraphs: ["첫째 문단이다."] }}
      onExit={onExit}
      onStartQuiz={onStartQuiz}
    />,
  );

  expect(pressBack()).toBe(true);

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onStartQuiz).not.toHaveBeenCalled();
});
