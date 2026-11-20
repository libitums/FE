import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { WordbookEntry } from "../../app/wordbook-entries";
import { WordbookReviewScreen } from "./WordbookReviewScreen";
import { wordbookTestIds as ids } from "./wordbook.contract";
import { sampleEntries } from "./wordbook.test-support";

// `ui` 계층: 오늘의 복습(ADR-0169) — 「What does this mean?」 보기 셋 · 맞음/틀림 표시 · 안내 · Next/Skip · 끝.

afterEach(() => {
  cleanup();
});

const queue = [sampleEntries[2]!, sampleEntries[1]!];
const pool = ["water", "please give", "thank you", "hello"];

function mount() {
  const onAnswer = vi.fn<(entry: WordbookEntry, correct: boolean) => void>();
  const onClose = vi.fn();
  render(
    <WordbookReviewScreen
      queue={queue}
      pool={pool}
      sound={{ sourceOf: (e) => `src:${e.roman}`, play: () => {} }}
      onAnswer={onAnswer}
      onClose={onClose}
    />,
  );
  return { onAnswer, onClose };
}

const choices = () => screen.queryAllByTestId(/^wordbook-choice-\d$/);
const choiceWith = (label: string) => choices().find((c) => c.textContent?.includes(label))!;
const next = () => screen.getByTestId(ids.reviewNext);

test("WR1. 배지 · 질문 · 단어 · 진행 1 / 2 · 보기 셋(정답 포함) · Skip", () => {
  mount();
  const root = screen.getByTestId(ids.review).textContent ?? "";
  for (const part of ["Word review", "What does this mean?", "주세요", "1 / 2"])
    expect(root).toContain(part);
  expect(choices()).toHaveLength(3);
  expect(choiceWith("please give")).toBeDefined();
  expect(next().textContent).toContain("Skip");
});

test("WR2. 맞히면 Correct 표시 · Got it 안내 · onAnswer(true) · 다시 눌러도 한 번", () => {
  const { onAnswer } = mount();
  fireEvent.tap(choiceWith("please give"), {});
  fireEvent.tap(choiceWith("please give"), {});
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(queue[0], true);
  expect(choiceWith("please give")).toHaveAttribute("data-state", "correct");
  expect(screen.getByTestId(ids.feedback).textContent).toBe("Nice! 주세요 moves to Got it.");
  expect(next().textContent).toContain("Next");
});

test("WR3. 틀리면 고른 보기 Not this · 정답 표시 · 내일 다시 안내", () => {
  const { onAnswer } = mount();
  const wrong = choices().find((c) => !c.textContent?.includes("please give"))!;
  fireEvent.tap(wrong, {});
  expect(onAnswer).toHaveBeenCalledWith(queue[0], false);
  expect(wrong).toHaveAttribute("data-state", "incorrect");
  expect(choiceWith("please give")).toHaveAttribute("data-state", "correct");
  expect(screen.getByTestId(ids.feedback).textContent).toBe(
    "It means “please give”. You will see it again tomorrow.",
  );
});

test("WR4. Next로 다음 단어, 마지막 뒤 Done → 닫기", () => {
  const { onClose } = mount();
  fireEvent.tap(choiceWith("please give"), {});
  fireEvent.tap(within(next()).getByTestId("ui-lynx-button"), {});
  expect(screen.getByTestId(ids.review).textContent).toContain("2 / 2");
  expect(screen.getByTestId(ids.review).textContent).toContain("물");
  fireEvent.tap(choiceWith("water"), {});
  expect(next().textContent).toContain("Done");
  fireEvent.tap(within(next()).getByTestId("ui-lynx-button"), {});
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("WR5. Skip은 답 없이 다음 · × 닫기", () => {
  const { onAnswer, onClose } = mount();
  fireEvent.tap(within(next()).getByTestId("ui-lynx-button"), {});
  expect(onAnswer).not.toHaveBeenCalled();
  expect(screen.getByTestId(ids.review).textContent).toContain("2 / 2");
  fireEvent.tap(
    within(screen.getByTestId(ids.reviewClose)).getByTestId("ui-lynx-round-button"),
    {},
  );
  expect(onClose).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------- 접근성 감사(ADR-0169 a11y)

test("WR6. 보기는 flatten false", () => {
  mount();
  for (const choice of choices()) expect(choice).toHaveAttribute("flatten", "false");
});
