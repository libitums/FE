import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { CultureQuizOption } from "./CultureQuizOption";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태·상호작용을 본다(ADR-0006 D4). 이 컴포넌트는
// 상태를 갖지 않는다 — props에서만 파생한다(계약 §4.2 · §4.5). `toHaveClass` ·
// `toHaveStyle` · `toBeVisible`을 쓰지 않는다(docs/conventions/code.md 「jest-dom
// 매처는 절반만 쓴다」).
//
// 계약: .agent-harness/work/lib-244/spec.md §4.5(CultureQuizOption 표) · §8.2
// (ui — required, O1~O5).
//
// D7 — WordChoiceOption·ListeningChoice를 import하지 않는다(값·타입 둘 다 0건).
// 이 파일은 그 두 화면의 어떤 모듈도 참조하지 않는다.

const RESULTS: readonly (AnswerResult | null)[] = [null, "correct", "incorrect"];

// ---------------------------------------------------------------- O1: 판정 없음

test("[O1] result=null이면 라벨이 text 그대로이고 접미사가 없다 · data-result='none'", () => {
  render(<CultureQuizOption index={0} text="세배" result={null} onSelect={() => {}} />);

  const root = screen.getByTestId("culture-quiz-option-0");
  expect(root).toHaveAttribute("accessibility-label", "세배");
  expect(root).toHaveAttribute("data-result", "none");
});

// ---------------------------------------------------------------- O2: 정답 접미사

test("[O2] result='correct'이면 라벨이 ', 정답'으로 끝나고 data-result='correct'다", () => {
  render(<CultureQuizOption index={1} text="세배" result="correct" onSelect={() => {}} />);

  const root = screen.getByTestId("culture-quiz-option-1");
  expect(root.getAttribute("accessibility-label")).toMatch(/, 정답$/);
  expect(root).toHaveAttribute("data-result", "correct");
});

test("result='incorrect'이면 라벨이 ', 오답'으로 끝나고 data-result='incorrect'다", () => {
  render(<CultureQuizOption index={2} text="성묘" result="incorrect" onSelect={() => {}} />);

  const root = screen.getByTestId("culture-quiz-option-2");
  expect(root.getAttribute("accessibility-label")).toMatch(/, 오답$/);
  expect(root).toHaveAttribute("data-result", "incorrect");
});

// ---------------------------------------------------------------- O3: traits가 여전히 button

for (const result of RESULTS) {
  test(`[O3] 판정이 있어도 accessibility-traits가 여전히 'button'이다 — result=${String(result)}`, () => {
    render(<CultureQuizOption index={0} text="세배" result={result} onSelect={() => {}} />);

    expect(screen.getByTestId("culture-quiz-option-0")).toHaveAttribute(
      "accessibility-traits",
      "button",
    );
  });
}

// ---------------------------------------------------------------- O4: 탭 → onSelect(index)

test("[O4] 탭하면 onSelect가 자기 index로 정확히 한 번 불린다", () => {
  const onSelect = vi.fn<(index: number) => void>();
  render(<CultureQuizOption index={2} text="차례" result={null} onSelect={onSelect} />);

  fireEvent.tap(screen.getByTestId("culture-quiz-option-2"), {});

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(2);
});

// 0은 falsy다 — index={0}으로도 짓는다(계약 §4.5 「truthy 분기를 만들지 않는다」).
test("[O4] index={0}으로도 onSelect가 0으로 불린다 — 0은 falsy다", () => {
  const onSelect = vi.fn<(index: number) => void>();
  render(<CultureQuizOption index={0} text="세배" result={null} onSelect={onSelect} />);

  fireEvent.tap(screen.getByTestId("culture-quiz-option-0"), {});

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(0);
});

// 게이트는 리듀서 하나다(계약 §3.3 ②) — 컴포넌트가 둘째 게이트를 두지 않는다.
test("[O4] 판정이 실린 뒤에도 탭하면 onSelect가 불린다 — 게이트는 리듀서다", () => {
  const onSelect = vi.fn<(index: number) => void>();
  render(<CultureQuizOption index={1} text="세배" result="correct" onSelect={onSelect} />);

  fireEvent.tap(screen.getByTestId("culture-quiz-option-1"), {});

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(1);
});

// ---------------------------------------------------------------- O5: 표식 래퍼 가림

for (const result of ["correct", "incorrect"] as const) {
  test(`[O5] 표식 래퍼에 accessibility-elements-hidden이 있고 잎 <svg>에는 없다 — ${result}`, () => {
    render(<CultureQuizOption index={3} text="세배" result={result} onSelect={() => {}} />);

    const icon = screen.getByTestId("culture-quiz-option-icon-3");
    const mark = icon.parentElement;

    expect(mark).not.toBeNull();
    expect(mark).toHaveAttribute("accessibility-elements-hidden", "true");
    expect(icon).not.toHaveAttribute("accessibility-elements-hidden");
  });
}

test("[O5] result=null이면 표식 래퍼 자체가 없다", () => {
  render(<CultureQuizOption index={0} text="세배" result={null} onSelect={() => {}} />);

  expect(screen.getByTestId("culture-quiz-option-0")).toHaveAttribute("data-result", "none");
  expect(screen.queryByTestId("culture-quiz-option-icon-0")).not.toBeInTheDocument();
});
