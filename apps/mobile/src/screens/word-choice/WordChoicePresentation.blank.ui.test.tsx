import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { WordChoicePresentation } from "./WordChoicePresentation";
import type { WordChoiceQuestion } from "./word-choice-questions";

// `ui` 계층: 빈칸 문항의 제시문 · 로마자 줄은 밑줄 대신 「blank」로 읽힌다(보이는 글자는 그대로).

afterEach(cleanup);

const noop = (): void => undefined;

function renderPresentation(question: WordChoiceQuestion, answered = false): void {
  render(
    <WordChoicePresentation
      question={question}
      questionIndex={0}
      answered={answered}
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

// 시뮬레이터 접근성 트리에서 빈칸 없는 제시문 · 로마자 줄의 이름이 빈 값으로 잡혔다(튜토리얼 · 음성 e2e의 S9 · S10 ·
// S13) — 라벨 속성을 비워 두면 호스트가 빈 이름을 붙입니다. 빈칸이 없어도 보이는 글자가 곧 이름이 되도록 고정합니다.
test("UBL2. 빈칸이 없는 제시문 · 로마자 줄도 이름이 비지 않는다 — 제시문은 보이는 글자, 로마자는 Pronunciation 접두", () => {
  renderPresentation({
    prompt: "삼천 원입니다.",
    romanization: "samcheon wonimnida.",
    choices: ["카드로 할게요.", "아니요, 괜찮아요."],
    answerIndex: 0,
  });
  expect(screen.getByTestId("word-choice-screen-prompt").getAttribute("accessibility-label")).toBe(
    "삼천 원입니다.",
  );
  expect(
    screen.getByTestId("word-choice-screen-romanization").getAttribute("accessibility-label"),
  ).toBe("Pronunciation: samcheon wonimnida.");
});

// QA 2026-11-20(위키 QA 2번, u00 S2-01): 빈칸 채우기 로마자 줄이 답 전에 빈칸 자리 정답 로마자(밑줄)를 보여 답을 알려 줬습니다.
const cloze: WordChoiceQuestion = {
  prompt: "___! 한국은 처음이세요?",
  romanization: "annyeonghaseyo! hangugeun cheoeumiseyo?",
  romanizationEmphasis: { start: 0, length: 14 },
  choices: ["한국어", "처음이에요", "안녕하세요"],
  answerIndex: 2,
};

test("UBL3. 답 전 빈칸 채우기 로마자는 빈칸 자리가 ___이고 정답 로마자 · 밑줄 · 낭독에 정답이 없다", () => {
  renderPresentation(cloze);
  const line = screen.getByTestId("word-choice-screen-romanization");
  expect(line).toHaveTextContent("___! hangugeun cheoeumiseyo?");
  expect(line.textContent).not.toContain("annyeonghaseyo");
  expect(line.querySelector(".text-role-romanization-answer")).toBeNull();
  expect(line.getAttribute("accessibility-label")).toBe(
    "Pronunciation: blank ! hangugeun cheoeumiseyo?",
  );
});

test("UBL4. 답한 뒤에는 지금처럼 정답이 든 전체 로마자와 정답 밑줄이 선다", () => {
  renderPresentation(cloze, true);
  const line = screen.getByTestId("word-choice-screen-romanization");
  expect(line).toHaveTextContent("annyeonghaseyo! hangugeun cheoeumiseyo?");
  expect(line.querySelector(".text-role-romanization-answer")).toHaveTextContent("annyeonghaseyo");
});
