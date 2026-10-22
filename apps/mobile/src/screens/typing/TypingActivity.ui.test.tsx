import { zeroSafeAreaInsets } from "../../lib/safe-area";
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import type { AnswerResult } from "../../lib/answer-result";
import { composeHangul, keystrokesFor } from "../messenger/hangul-keyboard";
import { TypingActivity } from "./TypingActivity";
import type { TypingQuestion } from "./typing.contract";
import { expectCompleteScene, expectQuestionScene } from "../learning/complete-scene.test-support";

// `ui` 계층: 타자 입력 활동 — 단서 · 꺼진 재생 조작 · 한글 자판 입력 · 한 번 답하고 정답 공개 · 결과.
// 판정과 리듀서 전이는 순수 함수 unit이 지므로(여기서 다시 계산하지 않습니다) 렌더가 그 결과를
// 내는지만 봅니다. 문항은 계획 모듈이 내는 꼴로 손으로 세웠습니다. 자판 키 열은 `keystrokesFor`가 냅니다.

const dictation: TypingQuestion = {
  id: "S6-01",
  kind: "dictation",
  instruction: "Type what you read.",
  cue: "yeogwon yeogi isseoyo.",
  cueSupport: "Here's my passport.",
  hint: null,
  answers: ["여권 여기 있어요.", "여권 여기 있어요"],
  audio: null,
};

const translation: TypingQuestion = {
  id: "S4-13",
  kind: "translation",
  instruction: "Say this in Korean.",
  cue: "I'm staying a week.",
  cueSupport: null,
  hint: null,
  answers: ["일주일 묵어요."],
  audio: null,
};

const pattern: TypingQuestion = {
  id: "S8-04",
  kind: "pattern",
  instruction: "Use the pattern.",
  cue: "Where is the restroom?",
  cueSupport: null,
  hint: "{명사} 어디예요?",
  answers: ["화장실 어디예요?", "화장실 어디예요"],
  audio: null,
};

const questions: readonly TypingQuestion[] = [dictation, translation, pattern];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(
  list: readonly TypingQuestion[] = questions,
  onFinish: (results: readonly AnswerResult[], skippedCount: number) => void = () => {},
  motion?: "reduced",
) {
  const element = (
    <TypingActivity
      insets={zeroSafeAreaInsets}
      questions={list}
      gemCount={0}
      onExit={() => {}}
      onFinish={onFinish}
    />
  );
  return render(
    motion === undefined ? element : <MotionProvider motion={motion}>{element}</MotionProvider>,
  );
}

function typeText(text: string): void {
  for (const key of keystrokesFor(text)) {
    fireEvent.tap(screen.getByTestId(`messenger-key-${key}`), {});
  }
}

function tapAction(label: string): void {
  const action = screen.getByTestId("learning-shell-action");
  expect(action).toHaveAttribute("accessibility-label", label);
  fireEvent.tap(action, {});
}

const answerField = () => screen.getByTestId("typing-activity-answer");

describe("TypingActivity", () => {
  test("UT1. 첫 렌더(받아쓰기)는 로마자와 뜻을 보이고 한글 정답은 감추며 꺼진 재생 조작과 자판이 선다", () => {
    const { container } = mount();

    expect(screen.getByTestId("learning-shell-form")).toHaveTextContent("Typing");
    expect(screen.getByTestId("typing-activity-cue")).toHaveTextContent("yeogwon yeogi isseoyo.");
    expect(screen.getByTestId("typing-activity-cue-support")).toHaveTextContent(
      "Here's my passport.",
    );
    expect(screen.getByTestId("typing-activity-audio")).toHaveAttribute(
      "accessibility-traits",
      "disabled",
    );
    expect(container.textContent).not.toContain("여권 여기 있어요");
    expect(screen.getByTestId("messenger-keyboard")).toBeInTheDocument();
    expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();
  });

  test("UT2. 자판으로 정답을 치면 답 칸에 글자가 서고 낭독이 그 글자를 말하며 Check 버튼이 선다", () => {
    mount();

    typeText("여권 여기 있어요");

    expect(answerField()).toHaveTextContent("여권 여기 있어요");
    expect(answerField()).toHaveAttribute("accessibility-label", "Your answer: 여권 여기 있어요");
    expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
      "accessibility-label",
      "Check",
    );
  });

  test("UT2b. 아무것도 치지 않은 답 칸은 빈 칸으로 낭독된다", () => {
    mount();

    expect(answerField()).toHaveAttribute("accessibility-label", "Your answer, empty");
  });

  test("UT3. Check를 누르면 맞음 배지와 정답 공개가 서고 자판이 걷히며 버튼이 Next가 된다", () => {
    mount();
    typeText("여권 여기 있어요");

    tapAction("Check");

    expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
    expect(screen.getByTestId("typing-activity-reveal")).toHaveTextContent(
      "Answer: 여권 여기 있어요.",
    );
    expect(screen.queryByTestId("messenger-keyboard")).not.toBeInTheDocument();
    expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
      "accessibility-label",
      "Next",
    );
  });

  test("UT4. 다음 문항(한국어로 쓰기)에 틀린 답을 확인하면 틀림 배지와 정답 공개가 서고 패턴 안내 · 재생 조작은 없다", () => {
    mount();
    typeText("여권 여기 있어요");
    tapAction("Check");
    tapAction("Next");

    expect(screen.getByTestId("typing-activity-cue")).toHaveTextContent("I'm staying a week.");
    typeText("일주일");
    tapAction("Check");

    expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
    expect(screen.getByTestId("typing-activity-reveal")).toHaveTextContent(
      "Answer: 일주일 묵어요.",
    );
    expect(screen.queryByTestId("typing-activity-hint")).not.toBeInTheDocument();
    expect(screen.queryByTestId("typing-activity-audio")).not.toBeInTheDocument();
  });

  test("UT5. 패턴 문항은 패턴 안내를 보인다", () => {
    mount();
    typeText("여권 여기 있어요");
    tapAction("Check");
    tapAction("Next");
    typeText("일주일 묵어요");
    tapAction("Check");
    tapAction("Next");

    expect(screen.getByTestId("typing-activity-cue")).toHaveTextContent("Where is the restroom?");
    expect(screen.getByTestId("typing-activity-hint")).toHaveTextContent("{명사} 어디예요?");
  });

  test("UT6. 끝까지 풀고 See results를 누르면 판정 배열과 건너뜀 0이 한 번 올라간다", () => {
    const onFinish = vi.fn<(results: readonly AnswerResult[], skippedCount: number) => void>();
    mount(questions, onFinish);

    typeText("여권 여기 있어요");
    tapAction("Check");
    tapAction("Next");
    typeText("일주일");
    tapAction("Check");
    tapAction("Next");
    typeText("화장실 어디예요");
    tapAction("Check");
    tapAction("Next");

    expect(screen.getByTestId("typing-activity-complete")).toBeInTheDocument();
    expect(onFinish).toHaveBeenCalledTimes(0);
    tapAction("See results");

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(["correct", "incorrect", "correct"], 0);
  });

  test("UT7. 지우기는 마지막 키 하나를 지우고 윗글쇠는 켜졌다가 한 글자 뒤 꺼진다", () => {
    mount();

    const keys = keystrokesFor("여권");
    typeText("여권");
    expect(answerField()).toHaveTextContent("여권");

    fireEvent.tap(screen.getByTestId("messenger-key-backspace"), {});
    expect(answerField()).toHaveTextContent(composeHangul(keys.slice(0, -1)));

    const shift = screen.getByTestId("messenger-key-shift");
    expect(shift).toHaveAttribute("data-shifted", "false");
    fireEvent.tap(shift, {});
    expect(screen.getByTestId("messenger-key-shift")).toHaveAttribute("data-shifted", "true");
    fireEvent.tap(screen.getByTestId("messenger-key-ㅂ"), {});
    expect(screen.getByTestId("messenger-key-shift")).toHaveAttribute("data-shifted", "false");
    expect(answerField().textContent).toContain("ㅃ");
  });

  test("UT8. 모션 축소에서도 같은 흐름이 선다", () => {
    const onFinish = vi.fn<(results: readonly AnswerResult[], skippedCount: number) => void>();
    mount([dictation], onFinish, "reduced");

    expect(screen.getByTestId("typing-activity-cue")).toHaveTextContent("yeogwon yeogi isseoyo.");
    typeText("여권 여기 있어요");
    tapAction("Check");
    expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
    tapAction("Next");
    tapAction("See results");

    expect(onFinish).toHaveBeenCalledWith(["correct"], 0);
  });
});

// ACS-TY — 완료 장면: 무대가 완료 장면이고 내용 상자 안은 완료 카드 하나다. 문항 장면은 그대로다.
test("[ACS-TY] 완료 때 무대가 완료 장면이고 내용 상자의 유일한 자식이 완료 카드이며 문항 장면에는 표시가 없다", () => {
  mount();
  expectQuestionScene();

  typeText("여권 여기 있어요");
  tapAction("Check");
  tapAction("Next");
  typeText("일주일");
  tapAction("Check");
  tapAction("Next");
  typeText("화장실 어디예요");
  tapAction("Check");
  tapAction("Next");

  expectCompleteScene("typing-activity-content", "typing-activity-complete");
});
