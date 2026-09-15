import { render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test } from "vitest";

import { AnswerLabel } from "./AnswerLabel";

describe("AnswerLabel UI", () => {
  test("Pending은 icon 자리와 tap handler 없이 Label만 표시한다", () => {
    render(<AnswerLabel result="pending" label="잘 들어 보세요" />);

    const root = screen.getByTestId("ui-lynx-answer-label");
    expect(root).toHaveAttribute("data-result", "pending");
    expect(root).toHaveAttribute("data-emphasis", "solid");
    expect(root).toHaveAttribute("data-size", "m");
    expect(root).toHaveAttribute("accessibility-label", "잘 들어 보세요");
    expect(root).not.toHaveAttribute("accessibility-traits");
    expect(root).not.toHaveAttribute("bindtap");
    expect(screen.queryByTestId("ui-lynx-answer-label-icon")).not.toBeInTheDocument();
    expect(screen.getByTestId("ui-lynx-answer-label-text")).toHaveTextContent("잘 들어 보세요");
  });

  test.each([
    ["correct", "정답이에요"],
    ["incorrect", "오답이에요"],
  ] as const)("%s는 판정 icon과 기본 Label을 함께 표시한다", (result, label) => {
    render(<AnswerLabel result={result} />);

    expect(screen.getByTestId("ui-lynx-answer-label-icon")).toBeInTheDocument();
    expect(screen.getByTestId("ui-lynx-answer-label-text")).toHaveTextContent(label);
    expect(screen.getByTestId("ui-lynx-answer-label-content")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
  });

  test("Emphasis와 Size를 독립적인 상태로 노출한다", () => {
    render(<AnswerLabel result="correct" emphasis="subtle" size="l" contextLabel="3번 문제" />);

    const root = screen.getByTestId("ui-lynx-answer-label");
    expect(root).toHaveClass("ui-lynx-answer-label-correct");
    expect(root).toHaveClass("ui-lynx-answer-label-subtle");
    expect(root).toHaveClass("ui-lynx-answer-label-l");
    expect(root).toHaveAttribute("accessibility-label", "3번 문제, 정답이에요");
  });
});
