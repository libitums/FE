import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { useCompactDevice } from "../learning/compact-device.test-support";
import { WordChoiceActivity } from "./WordChoiceScreen";
import type { WordChoiceQuestion } from "./word-choice-questions";

// `ui` 계층: 단어 선택 텍스트 카드(S6 · S9 · S10 · 질문 카드)의 글 역할 순서 · 클래스 · 구분선, CLOZE 로마자 조각을 봅니다.
// 문항은 매핑이 내는 꼴로 손으로 세웠습니다(CLOZE는 채운 로마자 + 강조 범위를 이미 가진 꼴).

const restores: Array<() => void> = [];

afterEach(() => {
  cleanup();
  while (restores.length > 0) restores.pop()?.();
});

function mount(question: WordChoiceQuestion) {
  return render(
    <WordChoiceActivity questions={[question]} onExit={() => {}} onFinish={() => {}} />,
  );
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);

function follows(first: HTMLElement, second: HTMLElement): boolean {
  return (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

// 열 글자 한글(공백 포함) — regular에서 display 단계입니다.
const withMeaning: WordChoiceQuestion = {
  prompt: "한국은 처음이세요?",
  romanization: "hangugeun cheoeumiseyo?",
  translation: "Is this your first time in Korea?",
  choices: ["네", "아니요", "몰라요"],
  answerIndex: 0,
  instruction: "Pick the right reply.",
};

const withoutMeaning: WordChoiceQuestion = {
  prompt: "한국은 처음이세요?",
  romanization: "hangugeun cheoeumiseyo?",
  choices: ["네", "아니요", "몰라요"],
  answerIndex: 0,
};

// 빈칸이 가운데인 CLOZE — 로마자는 정답을 채운 문장이고 강조는 그 조각입니다.
const cloze: WordChoiceQuestion = {
  prompt: "한국은 ___ 이세요?",
  romanization: "hangugeun cheoeum iseyo?",
  romanizationEmphasis: { start: 10, length: 7 },
  choices: ["처음", "두 번", "자주"],
  answerIndex: 0,
  instruction: "Fill in the blank.",
};

test("WC1. 텍스트 카드는 한글 → 로마자 → 구분선 → 뜻 순서로 서고 각 역할 클래스를 진다", () => {
  mount(withMeaning);

  const korean = id("word-choice-screen-prompt");
  const roman = id("word-choice-screen-romanization");
  const divider = id("word-choice-screen-divider");
  const meaning = id("word-choice-screen-translation");
  expect(follows(korean, roman)).toBe(true);
  expect(follows(roman, divider)).toBe(true);
  expect(follows(divider, meaning)).toBe(true);
  expect(korean).toHaveClass("korean-text-display");
  expect(korean).toHaveClass("korean-text-tone-brand-primary");
  expect(roman).toHaveClass("text-role-romanization");
  expect(divider).toHaveClass("text-role-divider");
  expect(meaning).toHaveClass("text-role-meaning");
  expect(meaning).toHaveTextContent("Is this your first time in Korea?");
});

test("WC1. 뜻이 없으면 구분선도 없다", () => {
  mount(withoutMeaning);

  expect(id("word-choice-screen-romanization")).toBeInTheDocument();
  expect(maybe("word-choice-screen-divider")).not.toBeInTheDocument();
  expect(maybe("word-choice-screen-translation")).not.toBeInTheDocument();
});

test("WC1. 13 mini 창에서는 한글이 한 단계 아래(heading-l)이고 로마자는 같은 m 크기다", () => {
  restores.push(useCompactDevice());
  mount(withMeaning);

  expect(id("word-choice-screen-prompt")).toHaveClass("korean-text-heading-l");
  expect(id("word-choice-screen-romanization")).not.toHaveClass("text-role-romanization-s");
});

test("WC2. CLOZE 로마자는 채운 문장이 조각 셋으로 서고 정답 조각만 answer 클래스를 진다", () => {
  mount(cloze);

  const roman = id("word-choice-screen-romanization");
  expect(roman).toHaveTextContent("hangugeun cheoeum iseyo?");
  expect(roman.textContent).not.toContain("___");
  const pieces = [...roman.querySelectorAll("text")];
  expect(pieces.map((piece) => piece.textContent)).toEqual(["hangugeun ", "cheoeum", " iseyo?"]);
  expect(pieces.map((piece) => piece.classList.contains("text-role-romanization-answer"))).toEqual([
    false,
    true,
    false,
  ]);
});

test("WC2. CLOZE 로마자 줄의 이름은 채운 문장 그대로이고 한글 제시문은 빈칸을 blank로 읽는다", () => {
  mount(cloze);

  const name = id("word-choice-screen-romanization").getAttribute("accessibility-label");
  expect(name === null || name === "hangugeun cheoeum iseyo?").toBe(true);
  expect(id("word-choice-screen-prompt")).toHaveAttribute(
    "accessibility-label",
    "한국은 blank 이세요?",
  );
});

test("AX1. 읽는 순서는 지시문 → 한글 → 로마자 → 구분선 → 뜻 → 보기다", () => {
  mount(withMeaning);

  const ids = [
    "learning-shell-instruction",
    "word-choice-screen-prompt",
    "word-choice-screen-romanization",
    "word-choice-screen-divider",
    "word-choice-screen-translation",
    "word-choice-screen-options",
  ];
  const order = [...document.querySelectorAll("[data-testid]")]
    .map((element) => element.getAttribute("data-testid") ?? "")
    .filter((id) => ids.includes(id));
  expect(order).toEqual(ids);
});
