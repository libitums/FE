import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { zeroSafeAreaInsets } from "../../lib/safe-area";
import { keystrokesFor } from "../messenger/hangul-keyboard";
import { TypingActivity } from "./TypingActivity";
import type { TypingQuestion } from "./typing.contract";

// `ui` 계층: 타자 입력의 정답 상자도 듣기 카드와 같이 펼쳐진다(ADR-0212 — 같은 모양의 자리).

const question: TypingQuestion = {
  id: "S6-01",
  kind: "dictation",
  instruction: "Type what you read.",
  cue: "yeogwon yeogi isseoyo.",
  cueSupport: "Here's my passport.",
  hint: null,
  answers: ["여권 여기 있어요."],
  audio: null,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const box = () => screen.queryByTestId("typing-activity-reveal-box");

function checkAnswer(motion: "standard" | "reduced"): void {
  render(
    <MotionProvider motion={motion}>
      <TypingActivity
        insets={zeroSafeAreaInsets}
        questions={[question]}
        onExit={() => {}}
        onFinish={() => {}}
      />
    </MotionProvider>,
  );
  for (const key of keystrokesFor("여권 여기 있어요")) {
    fireEvent.tap(screen.getByTestId(`messenger-key-${key}`), {});
  }
  expect(box()).not.toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
}

test("TE1. Check하면 정답 상자가 펼침 상자 안에서 재는 중으로 선다", () => {
  checkAnswer("standard");

  expect(box()).toHaveAttribute("data-phase", "measuring");
  expect(screen.getByTestId("typing-activity-reveal")).toHaveTextContent(
    "Answer: 여권 여기 있어요.",
  );
});

test("TE2. 움직임 줄이기 — 바로 열림", () => {
  checkAnswer("reduced");

  expect(box()).toHaveAttribute("data-phase", "open");
});
