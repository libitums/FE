import { expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { UiCopyContext } from "../lib/ui-copy";
import { markedUiCopy } from "../lib/ui-copy.test-support";
import { AnswerVerdict } from "./AnswerVerdict";

// `ui` 계층: 판정 배지의 낱말과 낭독 이름이 문구표의 것인지 봅니다(ADR-0006 D4).

test.each([
  ["correct", "Correct"],
  ["incorrect", "Incorrect"],
] as const)("[SH4-E] %s 판정은 보이는 글자와 낭독 이름이 영어 %s이다", (result, word) => {
  render(<AnswerVerdict result={result} />);

  const badge = screen.getByTestId("answer-verdict");
  expect(badge).toHaveAttribute("data-result", result);
  expect(badge).toHaveAttribute("accessibility-label", word);
  expect(badge).toHaveTextContent(word);
});

test.each(["correct", "incorrect"] as const)(
  "[SH4-M] 문구표를 주입하면 %s 판정의 글자와 이름이 answerResult 경로로 나온다",
  (result) => {
    render(
      <UiCopyContext.Provider value={markedUiCopy}>
        <AnswerVerdict result={result} />
      </UiCopyContext.Provider>,
    );

    const badge = screen.getByTestId("answer-verdict");
    expect(badge).toHaveAttribute("accessibility-label", `⟦common.answerResult.${result}⟧`);
    expect(badge).toHaveTextContent(`⟦common.answerResult.${result}⟧`);
  },
);
