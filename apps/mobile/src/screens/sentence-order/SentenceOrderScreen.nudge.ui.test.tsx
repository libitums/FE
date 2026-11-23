import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { SentenceOrderActivity } from "./SentenceOrderScreen";
import type { SentenceOrderQuestion } from "./sentence-order";

// `ui` 계층: 고민 힌트(ADR-0177) — 5초 동안 아무것도 누르지 않으면 다음에 놓을 창고 조각에 브랜드 색 그림자가 선다.

const question: SentenceOrderQuestion = {
  prompt: "뭐 했어?",
  // 정답 문장은 "나는 밥을 먹었다" — chips[1] → chips[0] → chips[2].
  chips: ["밥을", "나는", "먹었다"],
  answerOrder: [1, 0, 2],
};
const dialogue: SentenceOrderQuestion = {
  prompt: "",
  chips: ["네, 좋아요", "커피 마실래요?"],
  answerOrder: [1, 0],
  dialogue: {
    opening: { speaker: "counterpart", text: "안녕하세요" },
    speakers: ["me", "counterpart"],
  },
};

const chip = (index: number) => screen.getByTestId(`sentence-order-chip-${index}`);
const nudged = (index: number) => chip(index).className.includes("answer-nudge-target");
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const mount = (questions: readonly SentenceOrderQuestion[]) =>
  render(<SentenceOrderActivity questions={questions} onExit={() => {}} onFinish={() => {}} />);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("SO-UI60 5초 동안 누르지 않으면 첫 정답 조각에 그림자 — 그 전에는 없고, 다른 조각에는 서지 않는다", () => {
  mount([question]);
  wait(4_900);
  expect(nudged(1)).toBe(false);
  wait(100);
  expect(nudged(1)).toBe(true);
  expect(nudged(0)).toBe(false);
  expect(nudged(2)).toBe(false);
  expect(screen.getAllByTestId("answer-nudge-glow")).toHaveLength(1);
  // 낭독 이름은 그대로 — 정답을 읽어 주지 않는다.
  expect(chip(1).getAttribute("accessibility-label")).toBe("나는");
});

test("SO-UI61 조각을 누르면 꺼지고 시간을 처음부터 다시 센다 — 맞게 놓았으면 5초 뒤 그다음 조각", () => {
  mount([question]);
  wait(5_000);
  fireEvent.tap(chip(1), {});
  expect(screen.queryByTestId("answer-nudge-glow")).toBeNull();
  wait(4_000);
  expect(nudged(0)).toBe(false);
  wait(1_000);
  expect(nudged(0)).toBe(true);
});

test("SO-UI62 틀린 조각이 놓여 있으면 켜지지 않는다 — 빼면 다시 센다", () => {
  mount([question]);
  fireEvent.tap(chip(0), {}); // 「밥을」을 먼저 놓음 — 틀림
  wait(10_000);
  expect(screen.queryByTestId("answer-nudge-glow")).toBeNull();
  fireEvent.tap(chip(0), {}); // 답 줄에서 뺌
  wait(5_000);
  expect(nudged(1)).toBe(true);
});

test("SO-UI63 칸을 다 채운 뒤 · 대화 조립에서는 켜지지 않는다", () => {
  mount([question]);
  for (const index of [1, 0, 2]) fireEvent.tap(chip(index), {});
  wait(10_000);
  expect(screen.queryByTestId("answer-nudge-glow")).toBeNull();
  cleanup();

  mount([dialogue]);
  wait(10_000);
  expect(screen.queryByTestId("answer-nudge-glow")).toBeNull();
});
