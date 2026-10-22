import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { WordChoicePresentation } from "./WordChoicePresentation";
import type { WordChoiceQuestion } from "./word-choice-questions";

// `ui` 계층: 빈칸 문항의 제시문 · 로마자 줄은 밑줄 대신 「blank」로 읽힌다(보이는 글자는 그대로).

afterEach(cleanup);

const noop = (): void => undefined;

function renderPresentation(question: WordChoiceQuestion): void {
  render(
    <WordChoicePresentation
      question={question}
      questionIndex={0}
      answered={false}
      pictureState="loading"
      onLoad={noop}
      onError={noop}
    />,
  );
}

test("UBL1. 빈칸 제시문은 보이는 글자는 그대로, 낭독은 blank로 바뀐다", () => {
  renderPresentation({
    prompt: "카드___ 할게요.",
    romanization: "kadeu___ halgeyo.",
    choices: ["으로", "로"],
    answerIndex: 1,
  });
  const prompt = screen.getByTestId("word-choice-screen-prompt");
  expect(prompt).toHaveTextContent("카드___ 할게요.");
  expect(prompt.getAttribute("accessibility-label")).toBe("카드 blank 할게요.");
  expect(
    screen.getByTestId("word-choice-screen-romanization").getAttribute("accessibility-label"),
  ).toBe("Pronunciation: kadeu blank halgeyo.");
});

test("UBL2. 빈칸이 없는 제시문은 낭독 라벨을 따로 두지 않는다", () => {
  renderPresentation({
    prompt: "삼천 원입니다.",
    choices: ["카드로 할게요.", "아니요, 괜찮아요."],
    answerIndex: 0,
  });
  expect(
    screen.getByTestId("word-choice-screen-prompt").getAttribute("accessibility-label"),
  ).toBeNull();
});
