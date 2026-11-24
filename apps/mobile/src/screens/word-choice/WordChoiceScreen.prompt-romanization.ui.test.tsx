import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, within } from "@lynx-js/react/testing-library";

import type { ChoiceRomanization } from "../../lib/session-options";
import { WordChoiceActivity } from "./WordChoiceScreen";
import type { WordChoiceQuestion } from "./word-choice-questions";

// `ui` 계층(ADR-0188 D1): 레슨 문장(단어 선택 제시문 · 문화 확인 장면 말풍선)의 로마자 줄이 로마자 스위치를 따르는지 봅니다.

const promptQuestion: WordChoiceQuestion = {
  prompt: "안녕하세요. 이름이 뭐예요?",
  romanization: "annyeonghaseyo. ireumi mwoyeyo?",
  translation: "Hello. What's your name?",
  choices: ["안녕하세요", "감사합니다"],
  answerIndex: 0,
  instruction: "Pick the reply.",
};

const sceneQuestion: WordChoiceQuestion = {
  prompt: "한국어 잘하시네요!",
  choices: ["잘 먹겠습니다!", "감사합니다!"],
  answerIndex: 1,
  instruction: "What do you say?",
  culture: {
    scene: {
      imageUrl: null,
      line: {
        ko: "한국어 잘하시네요!",
        romanization: "hangugeo jalhasineyo!",
        meaning: "Your Korean is so good!",
      },
    },
    explanation: { en: "Say thank you." },
  },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(question: WordChoiceQuestion, choiceRomanization?: ChoiceRomanization) {
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (_: { content: string }, callback: (result: unknown) => void) =>
        callback("announced"),
    },
  });
  return render(
    <WordChoiceActivity
      questions={[question]}
      onExit={() => {}}
      onFinish={() => {}}
      cast={{ counterpart: { name: "Mina" }, me: { name: "Alex" } }}
      {...(choiceRomanization === undefined ? {} : { choiceRomanization })}
    />,
  );
}

test("WPR-U1. 켬(기본)이면 제시문 로마자 줄이 서고 뜻 줄도 선다", () => {
  mount(promptQuestion);
  expect(screen.getByTestId("word-choice-screen-romanization")).toHaveTextContent(
    "annyeonghaseyo. ireumi mwoyeyo?",
  );
  expect(screen.getByTestId("word-choice-screen-translation")).toBeInTheDocument();
});

test("WPR-U2. 끔이면 제시문 로마자 줄이 없고, 뜻 줄은 그대로다", () => {
  mount(promptQuestion, "hidden");
  expect(screen.queryByTestId("word-choice-screen-romanization")).toBeNull();
  expect(screen.getByTestId("word-choice-screen-translation")).toHaveTextContent(
    "Hello. What's your name?",
  );
});

const partner = () => within(screen.getByTestId("word-choice-culture-scene-partner"));

test("WPR-U3. 문화 확인 장면 — 켬이면 말풍선에 로마자 · 뜻", () => {
  mount(sceneQuestion, "shown");
  expect(partner().getByTestId("ui-lynx-chat-bubble-annotation-romanization")).toHaveTextContent(
    "hangugeo jalhasineyo!",
  );
});

test("WPR-U4. 문화 확인 장면 — 끔이면 뜻 한 줄", () => {
  mount(sceneQuestion, "hidden");
  expect(partner().queryByTestId("ui-lynx-chat-bubble-annotation-romanization")).toBeNull();
  expect(partner().getByTestId("ui-lynx-chat-bubble-translation")).toHaveTextContent(
    "Your Korean is so good!",
  );
});
