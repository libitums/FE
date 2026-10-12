import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { WordChoiceActivity } from "./WordChoiceScreen";
import type { WordChoiceQuestion } from "./word-choice-questions";

// `ui` 계층: 데이터 활동 `WordChoiceActivity` — 카탈로그 문항(제시문 아래 로마자 · 뜻 줄, 문항 지시문,
// 보기 셋)과 튜토리얼 꼴 문항(지원 줄 · 지시문 없음)이 같은 활동으로 서는지 봅니다. 문항은 계획
// 모듈이 내는 꼴로 손으로 세웠습니다 — 매핑 계산은 unit이 집니다.

const roleLine: WordChoiceQuestion = {
  prompt: "이름이 어떻게 되세요?",
  romanization: "ireumi eotteoke doeseyo?",
  translation: "May I have your name?",
  choices: ["저는 민수예요.", "삼천 원이에요.", "여기 있어요."],
  answerIndex: 0,
  instruction: "What do you say?",
};

const translateToEn: WordChoiceQuestion = {
  prompt: "일주일",
  romanization: "iljuil",
  choices: ["a day", "a month", "a week", "a year"],
  answerIndex: 2,
  instruction: "Choose the meaning.",
};

const tutorialShaped: WordChoiceQuestion = {
  prompt: "문항 1의 제시문입니다.",
  choices: ["사과", "바나나", "포도", "딸기"],
  answerIndex: 2,
};

function mount(
  questions: readonly WordChoiceQuestion[],
  onFinish: (results: readonly AnswerResult[], skippedCount: number) => void = () => {},
) {
  return render(<WordChoiceActivity questions={questions} onExit={() => {}} onFinish={onFinish} />);
}

test("UW1. 보기가 셋인 문항은 보기 셋 · 로마자 줄 · 뜻 줄 · 문항의 지시문을 그린다", () => {
  mount([roleLine]);

  expect(screen.getByTestId("word-choice-option-0")).toBeInTheDocument();
  expect(screen.getByTestId("word-choice-option-1")).toBeInTheDocument();
  expect(screen.getByTestId("word-choice-option-2")).toBeInTheDocument();
  expect(screen.queryByTestId("word-choice-option-3")).not.toBeInTheDocument();
  expect(screen.getByTestId("word-choice-screen-prompt")).toHaveTextContent(
    "이름이 어떻게 되세요?",
  );
  expect(screen.getByTestId("word-choice-screen-romanization")).toHaveTextContent(
    "ireumi eotteoke doeseyo?",
  );
  expect(screen.getByTestId("word-choice-screen-translation")).toHaveTextContent(
    "May I have your name?",
  );
  expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent("What do you say?");
});

test("UW2. 뜻을 고르는 문항은 뜻 줄이 없고(정답을 드러내지 않는다) 보기가 넷이다", () => {
  mount([translateToEn]);

  expect(screen.getByTestId("word-choice-screen-romanization")).toHaveTextContent("iljuil");
  expect(screen.queryByTestId("word-choice-screen-translation")).not.toBeInTheDocument();
  for (const index of [0, 1, 2, 3]) {
    expect(screen.getByTestId(`word-choice-option-${index}`)).toBeInTheDocument();
  }
});

test("UW3. 정답 보기를 탭하고 넘긴 뒤 결과를 보면 판정 배열과 건너뜀 0이 한 번 올라간다", () => {
  const onFinish = vi.fn<(results: readonly AnswerResult[], skippedCount: number) => void>();
  mount([roleLine], onFinish);

  fireEvent.tap(screen.getByTestId(`word-choice-option-${roleLine.answerIndex}`), {});
  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});
  expect(onFinish).toHaveBeenCalledTimes(0);
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith(["correct"], 0);
});

test("UW4. 튜토리얼 꼴 문항은 지원 줄이 없고 지시문은 문구표의 기본값이다", () => {
  mount([tutorialShaped]);

  expect(screen.queryByTestId("word-choice-screen-romanization")).not.toBeInTheDocument();
  expect(screen.queryByTestId("word-choice-screen-translation")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent(
    uiCopyEn.wordChoice.instruction,
  );
});
