import { expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { AnswerReveal } from "./AnswerReveal";

// `ui` 계층: 정답 표시의 글자와 면 밝기 속성만 봅니다(ADR-0006 D4). 클래스 · 계산 스타일은 보지 않습니다.

test("[FDU6] surface를 생략하면 글자의 data-surface가 light이고 글자는 text다", () => {
  render(<AnswerReveal testId="reveal-text" text="Answer: 카드로 할게요." />);

  const label = screen.getByTestId("reveal-text");
  expect(label).toHaveAttribute("data-surface", "light");
  expect(label).toHaveTextContent("Answer: 카드로 할게요.");
});

test("[FDU6] dark를 주면 data-surface가 dark이고 글자는 그대로다", () => {
  render(<AnswerReveal testId="reveal-text" text="Answer: 카드로 할게요." surface="dark" />);

  const label = screen.getByTestId("reveal-text");
  expect(label).toHaveAttribute("data-surface", "dark");
  expect(label).toHaveTextContent("Answer: 카드로 할게요.");
});
