import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { LanguageSelectScreen } from "./LanguageSelectScreen";

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

test("[US22] LanguageSelectScreen → 뒤로가기는 onBack 1회", () => {
  const onBack = vi.fn<() => void>();
  render(
    <LanguageSelectScreen selected="en" onSelect={vi.fn()} onContinue={vi.fn()} onBack={onBack} />,
  );

  expect(pressBack()).toBe(true);

  expect(onBack).toHaveBeenCalledTimes(1);
});
