import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { OnboardingScreen } from "./OnboardingScreen";
import { onboardingScrollId, onboardingTextId } from "./onboarding.contract";

// `ui` 계층: 2026-11-19 사용자 보고(iPhone 13 mini) — 「Get started」 위 제목 · 본문이 잘린다.
// 카드 영역이 스크롤 영역 · 묶음의 잰 높이를 받아 줄어드는지 봅니다. 픽셀 · 실제 스크롤은 이 계층이 못
// 봅니다(시뮬레이터 확인의 몫). `toHaveStyle`을 쓰지 않고 `style` 속성 문자열을 봅니다
// (docs/conventions/code.md).
//
// `<scroll-view>`는 요소를 그대로 넘기면 `fireEvent`가 거부하므로 `lynx.createSelectorQuery()`가 준
// NodesRef에 `layoutchange`를 `detail: { height }`로 쏩니다(`LearningShell.merged.ui.test.tsx`와 같은 법).

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function report(id: string, height: number): void {
  const ref = lynx.createSelectorQuery().select(`#${id}`);
  act(() => {
    fireEvent.layoutchange(ref as unknown as Element, { detail: { height } });
  });
}

const stageStyle = (): string =>
  screen.getByTestId("onboarding-screen-stage").getAttribute("style") ?? "";

test("[OB-F1] 재기 전에는 카드 영역이 디자인 높이 400이다", () => {
  render(<OnboardingScreen onComplete={vi.fn()} />);
  expect(stageStyle()).toMatch(/height:\s*400px/);
});

test("[OB-F2] 13 mini 높이(549 · 묶음 101)를 재면 카드 영역이 336으로 줄어 묶음이 버튼 위에 다 든다", () => {
  render(<OnboardingScreen onComplete={vi.fn()} />);
  report(onboardingScrollId, 549);
  report(onboardingTextId, 101);
  expect(stageStyle()).toMatch(/height:\s*336px/);
});

test("[OB-F3] 스텝이 바뀌어 묶음 높이가 달라지면 카드 영역을 다시 맞춘다", () => {
  render(<OnboardingScreen onComplete={vi.fn()} />);
  report(onboardingScrollId, 549);
  report(onboardingTextId, 142);
  expect(stageStyle()).toMatch(/height:\s*295px/);
  report(onboardingTextId, 101);
  expect(stageStyle()).toMatch(/height:\s*336px/);
});
