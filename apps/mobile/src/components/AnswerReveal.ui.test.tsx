import { expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { AnswerReveal } from "./AnswerReveal";

// `ui` 계층: 정답 상자의 글자 · 머리 줄 · 이름만 봅니다(ADR-0006 D4). 계산 스타일은 보지 않습니다.

test("[FDU6] 글자는 text이고 어두운 면 변형 표지가 없다", () => {
  const view = render(<AnswerReveal testId="reveal-text" text="Answer: 카드로 할게요." />);

  const text = screen.getByTestId("reveal-text");
  expect(text).toHaveTextContent("Answer: 카드로 할게요.");
  expect(text).not.toHaveAttribute("data-surface");
  expect(view.container.innerHTML).not.toContain("surface-dark");
  expect(screen.queryByTestId("answer-reveal-label")).not.toBeInTheDocument();
});

test("RV1. label을 주면 글자 앞에 머리 줄이 서고 상자 이름은 `label, text`다", () => {
  const view = render(<AnswerReveal testId="reveal-text" label="Answer" text="카드로 할게요." />);

  const label = screen.getByTestId("answer-reveal-label");
  const text = screen.getByTestId("reveal-text");
  expect(label).toHaveTextContent("Answer");
  expect(text).toHaveTextContent("카드로 할게요.");
  expect(label.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(
    view.container.querySelector('[accessibility-label="Answer, 카드로 할게요."]'),
  ).not.toBeNull();
  expect(view.container.innerHTML).not.toContain("surface-dark");
  expect(text).not.toHaveAttribute("data-surface");
});
