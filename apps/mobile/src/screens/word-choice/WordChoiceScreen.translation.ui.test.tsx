import { describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { WordChoiceActivity } from "./WordChoiceScreen";
import type { WordChoiceQuestion } from "./word-choice-questions";

// `ui` 계층: 단어 선택의 보기 번역 줄 — 보기 아래 번역이 고르기 전부터 보이고, 번역이 있으면 보기가 세로로
// 쌓이며, 낭독은 보기 요소의 라벨이 진다. 문항은 문화 확인 매핑이 내는 꼴로 손으로 세웠다.

// 보기 글자가 모두 4자 이하인데도 번역 때문에 세로로 쌓여야 하는 문항입니다.
const withTranslations: WordChoiceQuestion = {
  prompt: "와이파이에 들어가려면 ___가 필요해요.",
  choices: ["비밀번호", "주민번호", "전화번호"],
  choiceTranslations: ["password", "ID number", "phone number"],
  answerIndex: 0,
  instruction: "Pick the right one.",
};

// 번역이 없는 짧은 보기 문항입니다.
const withoutTranslations: WordChoiceQuestion = {
  prompt: "일주일",
  choices: ["day", "week", "year"],
  answerIndex: 1,
};

function mount(question: WordChoiceQuestion) {
  render(<WordChoiceActivity questions={[question]} onExit={() => {}} onFinish={() => {}} />);
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);

describe("WordChoice 보기 번역 줄", () => {
  test("UWT1. 번역이 있는 문항은 보기가 세로로 쌓이고 보기마다 번역 줄이 선다", () => {
    mount(withTranslations);

    expect(id("word-choice-screen-options")).toHaveAttribute("data-layout", "stacked");
    expect(id("word-choice-option-0-translation")).toHaveTextContent("password");
    expect(id("word-choice-option-1-translation")).toHaveTextContent("ID number");
    expect(id("word-choice-option-2-translation")).toHaveTextContent("phone number");
    expect(id("word-choice-option-0")).toHaveTextContent("비밀번호");
  });

  test("UWT2. 보기 라벨은 글자 뒤에 번역을 잇고 고른 뒤에는 판정 접미사가 붙으며 번역 줄은 접근성 요소가 아니다", () => {
    mount(withTranslations);

    expect(id("word-choice-option-0")).toHaveAttribute("accessibility-label", "비밀번호, password");
    expect(id("word-choice-option-1")).toHaveAttribute(
      "accessibility-label",
      "주민번호, ID number",
    );

    fireEvent.tap(id("word-choice-option-0"), {});

    expect(id("word-choice-option-0")).toHaveAttribute(
      "accessibility-label",
      "비밀번호, password, correct",
    );
    for (const index of [0, 1, 2]) {
      const line = id(`word-choice-option-${index}-translation`);
      expect(line.getAttribute("accessibility-element")).not.toBe("true");
      expect(line).not.toHaveAttribute("accessibility-label");
    }
  });

  test("UWT2b. 오답을 고르면 고른 보기의 라벨에만 오답 접미사가 붙는다", () => {
    mount(withTranslations);

    fireEvent.tap(id("word-choice-option-1"), {});

    expect(id("word-choice-option-1")).toHaveAttribute(
      "accessibility-label",
      "주민번호, ID number, incorrect",
    );
    expect(id("word-choice-option-2")).toHaveAttribute(
      "accessibility-label",
      "전화번호, phone number",
    );
  });

  test("UWT3. 번역 줄은 고르기 전에도 보이고 고른 뒤에도 그대로다", () => {
    mount(withTranslations);

    for (const index of [0, 1, 2]) {
      expect(id(`word-choice-option-${index}-translation`)).toBeInTheDocument();
    }
    fireEvent.tap(id("word-choice-option-2"), {});
    for (const index of [0, 1, 2]) {
      expect(id(`word-choice-option-${index}-translation`)).toBeInTheDocument();
    }
  });

  test("UWT4. 번역이 없는 문항은 가로 한 줄이고 번역 줄이 없으며 라벨은 글자 그대로다", () => {
    mount(withoutTranslations);

    expect(id("word-choice-screen-options")).toHaveAttribute("data-layout", "row");
    for (const index of [0, 1, 2]) {
      expect(maybe(`word-choice-option-${index}-translation`)).not.toBeInTheDocument();
    }
    expect(id("word-choice-option-1")).toHaveAttribute("accessibility-label", "week");
  });
});
