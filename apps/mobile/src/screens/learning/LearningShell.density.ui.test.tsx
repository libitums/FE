import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";
import { useCompactDevice } from "./compact-device.test-support";
import type { LearningShellProps } from "./learning-shell-props";

// `ui` 계층: 셸 루트가 밀도 클래스 · data-density를 싣는지 봅니다(SH5). 테스트 환경 기본 창은 844pt(regular)이고
// 13 mini 판은 창 812pt − 안전 영역 84pt = 728pt(compact)입니다.

const restores: Array<() => void> = [];

afterEach(() => {
  cleanup();
  while (restores.length > 0) restores.pop()?.();
});

function renderShell(overrides: Partial<LearningShellProps> = {}) {
  return render(
    <LearningShell
      form="listening"
      questionIndex={0}
      questionCount={4}
      instruction="Listen and choose the answer."
      onExit={() => {}}
      card={<text data-testid="fixture-card">카드 안</text>}
      actionLabel="Next"
      onAction={() => {}}
      {...overrides}
    />,
  );
}

test("SH5. 기본 창(844pt)은 regular 클래스와 data-density를 싣는다", () => {
  renderShell();

  const root = screen.getByTestId("learning-shell");
  expect(root).toHaveClass("learning-shell-density-regular");
  expect(root).toHaveAttribute("data-density", "regular");
});

test("SH5. 13 mini 크기 창은 compact 클래스와 data-density를 싣는다", () => {
  restores.push(useCompactDevice());
  renderShell();

  const root = screen.getByTestId("learning-shell");
  expect(root).toHaveClass("learning-shell-density-compact");
  expect(root).not.toHaveClass("learning-shell-density-regular");
  expect(root).toHaveAttribute("data-density", "compact");
});

test("SH5. densityOverride=compact는 844pt 창에서도 compact다", () => {
  renderShell({ densityOverride: "compact" });

  const root = screen.getByTestId("learning-shell");
  expect(root).toHaveClass("learning-shell-density-compact");
  expect(root).toHaveAttribute("data-density", "compact");
});
