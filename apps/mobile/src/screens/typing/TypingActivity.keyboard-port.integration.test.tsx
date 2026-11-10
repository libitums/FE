import { zeroSafeAreaInsets } from "../../lib/safe-area";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { keyboardPlanFor } from "../messenger-chat/keyboard-plan";
import { unknownKoreanKeyboardProbe } from "../messenger-chat/keyboard-ports";
import { TypingActivity } from "./TypingActivity";
import type { TypingQuestion } from "./typing.contract";

// `integration` 계층(MC-I7): 한국어 키보드 탐지 포트(wiring이 방에 꽂는 probe)를 「있음」으로 바꿔 끼워도
// 학습 타자 활동(받아쓰기)은 늘 학습 키보드이고 토글이 없다(spec §5.2 — keyboardPlanFor의 lesson 행은 규칙 기록,
// TypingActivity는 이 함수를 부르지 않는다). 포트 모듈 · 키보드 규칙 · TypingActivity · MessengerKeyboard가 맞물린다.

vi.mock("../messenger-chat/keyboard-ports", async (importOriginal) => {
  const original = await importOriginal<typeof import("../messenger-chat/keyboard-ports")>();
  return {
    ...original,
    unknownKoreanKeyboardProbe: { presence: () => "present" as const },
  };
});

const dictation: TypingQuestion = {
  id: "S6-01",
  kind: "dictation",
  instruction: "Type what you read.",
  cue: "annyeonghaseyo",
  cueSupport: null,
  hint: null,
  answers: ["안녕하세요"],
  audio: null,
};

afterEach(() => {
  cleanup();
});

function mount() {
  return render(
    <TypingActivity
      insets={zeroSafeAreaInsets}
      questions={[dictation]}
      onExit={() => {}}
      onFinish={() => {}}
    />,
  );
}

test("MC-I7. 바꿔 끼운 probe는 실제로 「있음」을 답한다(전제)", () => {
  expect(unknownKoreanKeyboardProbe.presence()).toBe("present");
});

test("MC-I7. probe가 「있음」이어도 키보드 규칙의 lesson 행은 학습 키보드 · 토글 숨김이다", () => {
  expect(keyboardPlanFor("lesson", unknownKoreanKeyboardProbe.presence())).toEqual({
    initial: "learning",
    toggle: "hidden",
  });
});

test("MC-I7. probe가 「있음」이어도 받아쓰기 활동은 학습 키보드(messenger-key-*)를 그린다", () => {
  mount();

  expect(screen.getByTestId("messenger-keyboard")).toBeInTheDocument();
  expect(screen.getByTestId("messenger-key-ㅇ")).toBeInTheDocument();
  expect(screen.getByTestId("messenger-key-ㅏ")).toBeInTheDocument();
});

test("MC-I7. probe가 「있음」이어도 학습 활동에는 키보드 전환 토글도 휴대폰 입력도 없다", () => {
  mount();

  expect(screen.queryByTestId("messenger-chat-toggle")).toBeNull();
  expect(screen.queryByTestId("messenger-chat-toggle-phone")).toBeNull();
  expect(screen.queryByTestId("messenger-chat-input")).toBeNull();
  expect(screen.queryByTestId("messenger-chat-slot")).toBeNull();
});

test("MC-I7. probe가 「있음」이어도 학습 키로 받아쓰기 답이 써진다", () => {
  mount();

  fireEvent.tap(screen.getByTestId("messenger-key-ㅇ"), {});
  fireEvent.tap(screen.getByTestId("messenger-key-ㅏ"), {});
  fireEvent.tap(screen.getByTestId("messenger-key-ㄴ"), {});

  expect(screen.getByTestId("typing-activity-answer").textContent).toContain("안");
});
