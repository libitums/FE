import { expect, test } from "vitest";
import { render, screen, within } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";
import type { LearningShellProps } from "./learning-shell-props";

// `ui` 계층: 판정 배지가 지시문 자리에 겹쳐 서는 것(SH1 · SH2). 높이는 보지 않습니다 — 밀림 없음은 클래스 · 요소 수로,
// 실제 높이는 기기 수동 확인(EU)이 가집니다.

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

test("SH1. verdict가 없으면 판정 배지가 없고 지시문이 보인다", () => {
  renderShell();

  expect(screen.getByTestId("learning-shell-prompt")).toBeInTheDocument();
  expect(screen.queryByTestId("learning-shell-verdict")).not.toBeInTheDocument();
  const instruction = screen.getByTestId("learning-shell-instruction");
  expect(instruction).toHaveTextContent("Listen and choose the answer.");
  expect(instruction).not.toHaveAttribute("accessibility-element");
  expect(instruction).not.toHaveAttribute("accessibility-elements-hidden");
});

test.each(["correct", "incorrect"] as const)(
  "SH2. verdict=%s이면 지시문 줄 안에 배지가 서고 지시문은 흐름에 남되 낭독에서 빠진다",
  (result) => {
    renderShell({ verdict: result });

    const prompt = screen.getByTestId("learning-shell-prompt");
    const verdict = within(prompt).getByTestId("learning-shell-verdict");
    expect(within(verdict).getByTestId("answer-verdict")).toHaveAttribute("data-result", result);
    const instruction = within(prompt).getByTestId("learning-shell-instruction");
    expect(instruction).toHaveTextContent("Listen and choose the answer.");
    // 잎 `<text>`는 가림 속성이 무동작이라(ADR-0016 D5) 접근성 요소 자체를 끕니다.
    expect(instruction).toHaveAttribute("accessibility-element", "false");
    expect(instruction).not.toHaveAttribute("accessibility-elements-hidden");
  },
);

test("SH2. 한 줄 지시문과 두 줄 지시문이 판정 때문에 다른 요소 구조가 되지 않는다", () => {
  const short = renderShell({ instruction: "Pick one.", verdict: "correct" });
  const shortCount = screen.getByTestId("learning-shell-prompt").querySelectorAll("*").length;
  short.unmount();

  renderShell({
    instruction:
      "Listen to the whole conversation carefully and then choose the best answer for the last line.",
    verdict: "correct",
  });
  const longCount = screen.getByTestId("learning-shell-prompt").querySelectorAll("*").length;

  expect(longCount).toBe(shortCount);
  expect(screen.getAllByTestId("learning-shell-instruction")).toHaveLength(1);
});

test("SH2. 판정이 없던 문항에서 판정이 생겨도 지시문 요소는 그대로 남는다", () => {
  const view = renderShell();
  const before = screen.getByTestId("learning-shell-instruction");

  view.rerender(
    <LearningShell
      form="listening"
      questionIndex={0}
      questionCount={4}
      instruction="Listen and choose the answer."
      onExit={() => {}}
      card={<text data-testid="fixture-card">카드 안</text>}
      actionLabel="Next"
      onAction={() => {}}
      verdict="correct"
    />,
  );

  expect(screen.getByTestId("learning-shell-instruction")).toBe(before);
  expect(screen.getByTestId("learning-shell-verdict")).toBeInTheDocument();
});
