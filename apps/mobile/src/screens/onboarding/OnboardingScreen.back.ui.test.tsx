import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { OnboardingScreen } from "./OnboardingScreen";

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

function next() {
  fireEvent.tap(
    within(screen.getByTestId("onboarding-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
}

test("[US19] 둘째 스텝 → 뒤로가기는 data-step을 0으로 · onComplete 0회(뒤로 버튼과 같다)", () => {
  const onComplete = vi.fn();
  render(<OnboardingScreen onComplete={onComplete} />);
  next();
  expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "1");

  expect(pressBack()).toBe(true);

  expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "0");
  expect(onComplete).not.toHaveBeenCalled();
});

test("[UN2] 첫 스텝 → 등록이 없어 runTop()은 false", () => {
  render(<OnboardingScreen onComplete={vi.fn<() => void>()} />);

  expect(pressBack()).toBe(false);
  expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "0");
});
