import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";
import { learningShellFeedbackLabel } from "./learning-shell.contract";
import type { LearningShellFeedback, LearningShellProps } from "./learning-shell-props";

// `ui` 계층: 해설 판(SH3)과 아래 버튼 행의 자리(SH4)를 봅니다.

const feedback: LearningShellFeedback = {
  tone: "correct",
  title: "Nice reply!",
  lines: [
    { text: "Koreans love it when you reply with a smile.", lang: "en" },
    { text: "웃으며 대답하면 좋아해요.", lang: "ko" },
  ],
};

function renderShell(overrides: Partial<LearningShellProps> = {}) {
  return render(
    <LearningShell
      form="word-choice"
      questionIndex={0}
      questionCount={4}
      instruction="What do you say?"
      onExit={() => {}}
      card={<text data-testid="fixture-card">카드 안</text>}
      actionLabel="Continue"
      onAction={() => {}}
      {...overrides}
    />,
  );
}

test("SH3. feedback이 없으면 해설 판이 없다", () => {
  renderShell();

  expect(screen.queryByTestId("learning-shell-feedback")).not.toBeInTheDocument();
});

test("SH3. feedback은 tone · 제목 · 줄 순서로 서고 판 전체가 하나의 이름이다", () => {
  renderShell({ feedback });

  const panel = screen.getByTestId("learning-shell-feedback");
  expect(panel).toHaveAttribute("data-tone", "correct");
  expect(panel).toHaveAttribute("accessibility-element", "true");
  expect(panel).toHaveAttribute("accessibility-label", learningShellFeedbackLabel(feedback));
  expect(panel).toHaveAttribute(
    "accessibility-label",
    "Nice reply!, Koreans love it when you reply with a smile., 웃으며 대답하면 좋아해요.",
  );
  const text = panel.textContent ?? "";
  expect(text.indexOf("Nice reply!")).toBeGreaterThanOrEqual(0);
  expect(text.indexOf("Nice reply!")).toBeLessThan(text.indexOf("Koreans love it"));
  expect(text.indexOf("Koreans love it")).toBeLessThan(text.indexOf("웃으며"));
});

test("SH3. 오답 tone도 판에 실린다", () => {
  renderShell({ feedback: { ...feedback, tone: "incorrect", title: "Not quite" } });

  expect(screen.getByTestId("learning-shell-feedback")).toHaveAttribute("data-tone", "incorrect");
});

test("SH3. 아래 버튼은 판 안에 서고 흐름 안 행이며 탭하면 onAction이 불린다", () => {
  const onAction = vi.fn<() => void>();
  renderShell({ feedback, onAction });

  const panel = screen.getByTestId("learning-shell-feedback");
  const button = within(panel).getByTestId("learning-shell-action");
  expect(button).toHaveAttribute("accessibility-label", "Continue");
  expect(screen.getByTestId("learning-shell-actions")).toHaveClass(
    "learning-shell-actions-in-flow",
  );

  fireEvent.tap(button, {});

  expect(onAction).toHaveBeenCalledTimes(1);
});

test("SH4. actionPlacement=in-flow는 흐름 안 행이고 포그가 없다", () => {
  const view = renderShell({ actionPlacement: "in-flow" });

  expect(screen.getByTestId("learning-shell-actions")).toHaveClass(
    "learning-shell-actions-in-flow",
  );
  expect(view.container.querySelector(".learning-shell-fog")).toBeNull();
});

test("SH4. 기본 배치는 지금처럼 떠 있다(흐름 안 클래스 · 판 없음, 포그 있음)", () => {
  const view = renderShell();

  expect(screen.getByTestId("learning-shell-actions")).not.toHaveClass(
    "learning-shell-actions-in-flow",
  );
  expect(view.container.querySelector(".learning-shell-fog")).not.toBeNull();
  expect(screen.queryByTestId("learning-shell-feedback")).not.toBeInTheDocument();
});

test("SH4. actionPlacement=floating을 밝혀 적어도 기본과 같다", () => {
  renderShell({ actionPlacement: "floating" });

  expect(screen.getByTestId("learning-shell-actions")).not.toHaveClass(
    "learning-shell-actions-in-flow",
  );
});
