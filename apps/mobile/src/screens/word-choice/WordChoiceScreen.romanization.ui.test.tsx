import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { choiceItemId } from "../../components/question-options.test-support";
import { WordChoiceActivity } from "./WordChoiceScreen";
import type { WordChoiceActivityProps } from "./WordChoiceScreen";
import type { WordChoiceQuestion } from "./word-choice-questions";

// `ui` 계층: 단어 선택 활동의 보기 로마자 줄 — 켬(기본) · 끔 · 빈 자리 · 문화 확인 · 그림 고르기 · 판정 뒤.
// 문항은 매핑이 내는 꼴로 손으로 세웠습니다. 매핑 계산은 unit이 지고 여기서는 그려진 결과만 봅니다.

const replyQuestion: WordChoiceQuestion = {
  prompt: "안녕하세요. 이름이 뭐예요?",
  choices: ["안녕하세요", "감사합니다", "저는 민아예요"],
  choiceRomanizations: ["annyeonghaseyo", "gamsahamnida", "jeoneun minayeyo"],
  answerIndex: 2,
  instruction: "Pick the reply.",
};

const cultureQuestion: WordChoiceQuestion = {
  prompt: "한국어 잘하시네요!",
  choices: ["잘 먹겠습니다!", "안녕하세요!", "감사합니다!"],
  choiceTranslations: ["Thanks for the meal!", "Hello!", "Thank you!"],
  choiceRomanizations: ["jal meokgetseumnida!", "annyeonghaseyo!", "gamsahamnida!"],
  answerIndex: 2,
  instruction: "What do you say?",
  culture: { scene: null, explanation: { en: 'Say "Thank you."' } },
};

const imageQuestion: WordChoiceQuestion = {
  prompt: "water",
  choices: ["카드", "물"],
  choiceRomanizations: ["kadeu", "mul"],
  answerIndex: 1,
  instruction: "Which word matches the picture?",
  picture: { url: "https://cdn/images/u01-water/s1-05.jpg", answerRomanization: "mul" },
};

const translateQuestion: WordChoiceQuestion = {
  prompt: "물 주세요.",
  choices: ["Water, please.", "Tea, please."],
  answerIndex: 0,
  instruction: "Pick the translation.",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(question: WordChoiceQuestion, extra: Partial<WordChoiceActivityProps> = {}) {
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (_: { content: string }, callback: (result: unknown) => void) =>
        callback("announced"),
    },
  });
  return render(
    <WordChoiceActivity questions={[question]} onExit={() => {}} onFinish={() => {}} {...extra} />,
  );
}

const romanId = (index: number): string => `ui-lynx-option-selector-romanization-choice-${index}`;
const labelId = (index: number): string => `ui-lynx-option-selector-label-choice-${index}`;
const meaningId = (index: number): string => `ui-lynx-option-selector-meaning-choice-${index}`;
const item = (index: number) => screen.getByTestId(choiceItemId(index));
const nameOf = (index: number): string | null => item(index).getAttribute("accessibility-label");

function orderInItem(index: number): (string | null)[] {
  const text = screen.getByTestId(labelId(index)).parentElement;
  return Array.from(text?.children ?? []).map((child) => child.getAttribute("data-testid"));
}

describe("단어 선택 보기 로마자", () => {
  test("UI-CR1. 기본(shown)이면 보기마다 로마자 줄이 라벨 위에 서고 이름은 한글, 로마자다", () => {
    mount(replyQuestion);

    replyQuestion.choiceRomanizations?.forEach((roman, index) => {
      expect(screen.getByTestId(romanId(index))).toHaveTextContent(roman ?? "");
      expect(orderInItem(index)).toEqual([romanId(index), labelId(index)]);
      expect(nameOf(index)).toBe(`${replyQuestion.choices[index]}, Pronunciation: ${roman}`);
    });
  });

  test("UI-CR2. hidden이면 로마자 줄이 하나도 없고 이름은 한글만이다", () => {
    mount(replyQuestion, { choiceRomanization: "hidden" });

    for (const index of [0, 1, 2]) {
      expect(screen.queryByTestId(romanId(index))).toBeNull();
      expect(nameOf(index)).toBe(replyQuestion.choices[index]);
    }
  });

  test("UI-CR3. 로마자가 null인 보기만 줄이 없고 나머지는 선다", () => {
    mount({ ...replyQuestion, choiceRomanizations: ["annyeonghaseyo", null, "jeoneun minayeyo"] });

    expect(screen.getByTestId(romanId(0))).toBeInTheDocument();
    expect(screen.queryByTestId(romanId(1))).toBeNull();
    expect(screen.getByTestId(romanId(2))).toBeInTheDocument();
    expect(nameOf(1)).toBe("감사합니다");
  });

  test("UI-CR4. 문화 확인은 로마자, 한글, 뜻 순서로 서고 이름도 같은 순서다", () => {
    mount(cultureQuestion);

    cultureQuestion.choiceRomanizations?.forEach((roman, index) => {
      expect(orderInItem(index)).toEqual([romanId(index), labelId(index), meaningId(index)]);
      expect(nameOf(index)).toBe(
        `${cultureQuestion.choices[index]}, Pronunciation: ${roman}, ${cultureQuestion.choiceTranslations?.[index]}`,
      );
    });
  });

  test("UI-CR5. 그림 고르기 두 칸 모두 로마자 줄이 서고 배치는 grid 그대로다", () => {
    mount(imageQuestion);

    expect(screen.getByTestId(romanId(0))).toHaveTextContent("kadeu");
    expect(screen.getByTestId(romanId(1))).toHaveTextContent("mul");
    const selector = within(screen.getByTestId("word-choice-screen-options")).getByTestId(
      "ui-lynx-option-selector",
    );
    expect(selector).toHaveAttribute("data-layout", "grid");
  });

  test("UI-CR6. 정답을 고르면 고른 보기 이름이 한글, 로마자, 판정이 되고 줄은 남는다", () => {
    mount(replyQuestion);

    fireEvent.tap(item(2), {});

    expect(screen.getByTestId(romanId(2))).toHaveTextContent("jeoneun minayeyo");
    expect(nameOf(2)).toBe("저는 민아예요, Pronunciation: jeoneun minayeyo, correct");
  });

  test("UI-CR7. 로마자 데이터가 없는 영어 보기 문항에는 줄이 없다", () => {
    mount(translateQuestion);

    expect(screen.queryByTestId(romanId(0))).toBeNull();
    expect(screen.queryByTestId(romanId(1))).toBeNull();
    expect(nameOf(0)).toBe("Water, please.");
  });
});
