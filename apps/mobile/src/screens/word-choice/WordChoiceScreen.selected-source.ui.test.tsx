import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { choiceItemId } from "../../components/question-options.test-support";
import type { ItemAnswerReport } from "../../lib/item-answer";
import { WordChoiceActivity } from "./WordChoiceScreen";
import type { WordChoiceQuestion } from "./word-choice-questions";

// `ui` 계층: 보기형 측정 `selectedAnswer`는 치환 전 원문(#449 리뷰 C1) — 학습자 이름이 보고에 실리지 않는다.

afterEach(cleanup);

const reply: WordChoiceQuestion = {
  prompt: "성함이요?",
  choices: ["Max(으)로 예약했어요.", "네, 맞아요."],
  choicesSource: ["{이름}(으)로 예약했어요.", "네, 맞아요."],
  answerIndex: 0,
};

function mount(question: WordChoiceQuestion) {
  const onItemAnswered = vi.fn<(report: ItemAnswerReport) => void>();
  render(
    <WordChoiceActivity
      questions={[question]}
      onExit={() => {}}
      onFinish={() => {}}
      onItemAnswered={onItemAnswered}
    />,
  );
  return onItemAnswered;
}

test("SA1. {이름} 든 보기를 고르면 보고에는 치환 전 원문이 실리고 학습자 이름이 없다", () => {
  const report = mount(reply);
  fireEvent.tap(screen.getByTestId(choiceItemId(0)), {});
  expect(report).toHaveBeenCalledWith(
    expect.objectContaining({ selectedAnswer: "{이름}(으)로 예약했어요." }),
  );
  expect(JSON.stringify(report.mock.calls)).not.toContain("Max");
});

test("SA2. 원문이 없는 문항은 selectedAnswer를 싣지 않는다", () => {
  const { choicesSource: _drop, ...withoutSource } = reply;
  const report = mount(withoutSource as WordChoiceQuestion);
  fireEvent.tap(screen.getByTestId(choiceItemId(1)), {});
  expect(report.mock.calls[0]?.[0]).not.toHaveProperty("selectedAnswer");
});
