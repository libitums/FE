import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { JourneyStatModal } from "./JourneyStatModal";

// `ui` 계층: 시스템 뒤로가기(`backHandlers.runTop()`)가 보이는 닫기를 누른 것과 같은 결과를
// 내는지 봅니다. 스택은 실물이고, 케이스 사이에 정리 뒤 비어 있어야 합니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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

test("[UL9] 연속 모달 → 뒤로가기는 onClose 1회", () => {
  const onClose = vi.fn<() => void>();
  render(
    <JourneyStatModal kind="streak" value={3} track={{ completedCount: 3 }} onClose={onClose} />,
  );

  expect(pressBack()).toBe(true);

  expect(onClose).toHaveBeenCalledTimes(1);
});
