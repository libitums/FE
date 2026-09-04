import { expect, test } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { AssessmentItem } from "./AssessmentItem";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태를 본다 (ADR-0006 D4). 계산된 스타일을 볼 수
// 없으므로 `toHaveClass` · `toHaveStyle`을 쓰지 않는다 (docs/conventions/code.md
// 「jest-dom 매처는 절반만 쓴다」). 이 컴포넌트는 상태를 갖지 않는다 — props에서만
// 파생한다(계약 §1.3).
//
// 계약: .agent-harness/work/lib-227/spec.md §1.7 「AssessmentItem의 요소와 속성」 표 ·
//       §4.2 표 첫째 행. 형태의 정본은 `ListeningChoice.ui.test.tsx`다 — `AssessmentItem`은
//       그 컴포넌트의 정오 표시 부분과 같은 형태이지만 조작 단위가 아니다(§1.7).
//
// 기대 문자열의 정본은 계약 §1.5 접미사 표다 — `assessmentItemAccessibilityLabel(0,
// "correct")` === `문항 1, 정답` · `(1, "incorrect")` === `문항 2, 오답`. 이 값은
// assessment.unit.test.ts가 함수 자체를 이미 본다 — 여기서는 컴포넌트가 그 값을
// 실제로 렌더하는지만 본다.

const RESULTS: readonly { index: number; result: AnswerResult; label: string }[] = [
  { index: 0, result: "correct", label: "문항 1, 정답" },
  { index: 1, result: "incorrect", label: "문항 2, 오답" },
];

// ---------------------------------------------------------------- 채널 1: 상태 `data-*`

// data-result가 언제나 붙고 값만 갈린다 — "none" 값이 없다(계약 §2.2, 평가 행은
// 판정을 반드시 진다).
for (const { index, result } of RESULTS) {
  test(`data-result가 ${result}다 — index=${index}`, () => {
    render(<AssessmentItem index={index} result={result} />);

    expect(screen.getByTestId(`assessment-item-${index}`)).toHaveAttribute("data-result", result);
  });
}

// ---------------------------------------------------------------- 채널 2: `accessibility-*`

// 행 래퍼의 accessibility-label이 assessmentItemAccessibilityLabel(index, result)의
// 합성 결과다 — "문항 N, 정답"/"문항 N, 오답" (계약 §1.7 · §2.3).
for (const { index, result, label } of RESULTS) {
  test(`accessibility-label이 '${label}'이다 — index=${index}, result=${result}`, () => {
    render(<AssessmentItem index={index} result={result} />);

    expect(screen.getByTestId(`assessment-item-${index}`)).toHaveAttribute(
      "accessibility-label",
      label,
    );
  });
}

for (const { index, result } of RESULTS) {
  test(`accessibility-element이 true다 — index=${index}, result=${result}`, () => {
    render(<AssessmentItem index={index} result={result} />);

    expect(screen.getByTestId(`assessment-item-${index}`)).toHaveAttribute(
      "accessibility-element",
      "true",
    );
  });
}

// ---------------------------------------------------------------- 채널 3: 보이는 표식

// assessmentItemTitle(index) 결과가 보이는 이름으로 렌더된다 (계약 §1.5 · §1.7).
test("이름 텍스트가 assessmentItemTitle(index)의 합성 결과다 — '문항 1'", () => {
  render(<AssessmentItem index={0} result="correct" />);

  expect(screen.getByTestId("assessment-item-0")).toHaveTextContent("문항 1");
});

test("이름 텍스트가 assessmentItemTitle(index)의 합성 결과다 — '문항 2'", () => {
  render(<AssessmentItem index={1} result="incorrect" />);

  expect(screen.getByTestId("assessment-item-1")).toHaveTextContent("문항 2");
});

// 표식 아이콘이 존재한다 — 수용 기준 5의 첫째 채널(모양)이 붙었는지 (계약 §2.1).
for (const { index, result } of RESULTS) {
  test(`표식 아이콘(assessment-item-icon-${index})이 렌더된다 — result=${result}`, () => {
    render(<AssessmentItem index={index} result={result} />);

    expect(screen.getByTestId(`assessment-item-icon-${index}`)).toBeInTheDocument();
  });
}

// 표식 낱말이 보인다 — 색과 독립인 셋째 채널이다 (WCAG 1.4.1 · 계약 §1.7).
test("표식 낱말 '정답'이 텍스트로 보인다", () => {
  render(<AssessmentItem index={0} result="correct" />);

  expect(screen.getByTestId("assessment-item-0")).toHaveTextContent("정답");
});

test("표식 낱말 '오답'이 텍스트로 보인다", () => {
  render(<AssessmentItem index={1} result="incorrect" />);

  expect(screen.getByTestId("assessment-item-1")).toHaveTextContent("오답");
});

// 표식 래퍼가 accessibility-elements-hidden="true"다 — 가림은 자손을 가진 래퍼가
// 진다(계약 §1.7 「가림은 자손을 가진 래퍼가 진다」). 계약 §2.1이 testid를 늘리지
// 않아 클래스 셀렉터로 찾는다 — 찾기는 관찰 채널이 아니라 탐색 축이다(code.md).
for (const { index, result } of RESULTS) {
  test(`표식 래퍼가 accessibility-elements-hidden='true'다 — result=${result}`, () => {
    render(<AssessmentItem index={index} result={result} />);

    const mark = screen
      .getByTestId(`assessment-item-${index}`)
      .querySelector<HTMLElement>(".assessment-item-mark");

    expect(mark).toContainElement(screen.getByTestId(`assessment-item-icon-${index}`));
    expect(mark).toHaveAttribute("accessibility-elements-hidden", "true");
  });
}

// ---------------------------------------------------------------- 부재 단언 (계약 §1.7 · §4.2)

// accessibility-traits가 없다 — 이 행은 누를 수 없다(D8 범위 밖). button 트레이트가
// 붙으면 없는 조작을 약속한다(계약 §1.7 「역할 없이 이름만 낸다」).
for (const { index, result } of RESULTS) {
  test(`accessibility-traits가 없다 — index=${index}, result=${result}`, () => {
    render(<AssessmentItem index={index} result={result} />);

    expect(screen.getByTestId(`assessment-item-${index}`)).not.toHaveAttribute(
      "accessibility-traits",
    );
  });
}

// bindtap이 없다 — 이 환경에서 `bind*` 이벤트는 `__SetAttribute`가 아니라 `__AddEvent`를
// 지나 DOM 속성으로 직렬화되지 않는다(@lynx-js/testing-environment의 ElementPAPI가
// `bind`로 시작하는 키를 attribute 경로에서 명시적으로 막는다) — 그래서 `bindtap` 자체를
// 속성으로 질의할 수 없다(ListeningScreen.ui.test.tsx 단언 15의 같은 관찰). 관찰 가능한
// 대리 채널은 위의 accessibility-traits 부재이고, 여기서는 탭이 아무 것도 하지 않고
// 조용히 지나간다는 것(=onSelect 같은 콜백이 아예 없어 부를 것이 없다)을 회귀로 남긴다.
for (const { index, result } of RESULTS) {
  test(`탭해도 던지지 않는다 — 조작 단위가 아니다 (index=${index}, result=${result})`, () => {
    render(<AssessmentItem index={index} result={result} />);

    expect(() => fireEvent.tap(screen.getByTestId(`assessment-item-${index}`), {})).not.toThrow();
  });
}

// 이 컴포넌트는 상태를 갖지 않는다 — 탭해도 렌더된 판정이 그대로다.
test("탭해도 렌더된 data-result는 그대로다 — 컴포넌트는 상태를 갖지 않는다", () => {
  render(<AssessmentItem index={0} result="correct" />);

  fireEvent.tap(screen.getByTestId("assessment-item-0"), {});

  expect(screen.getByTestId("assessment-item-0")).toHaveAttribute("data-result", "correct");
});
