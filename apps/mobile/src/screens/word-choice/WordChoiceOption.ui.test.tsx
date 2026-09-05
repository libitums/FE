import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import tick from "@libitums/icons/lynx/tick";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import type { AnswerResult } from "../../lib/answer-result";
import { WordChoiceOption } from "./WordChoiceOption";

// `ui` 계층: 렌더 결과와 상호작용만 본다 (ADR-0006 D4). 계산된 스타일을 볼 수 없으므로
// `toHaveClass` · `toHaveStyle` · `toBeVisible`을 쓰지 않는다 (docs/conventions/code.md
// 「jest-dom 매처는 절반만 쓴다」). 상태는 전부 속성으로 관찰한다 (「관찰 채널 넷」).
//
// 계약: .agent-harness/work/lib-229/spec.md §1.8(e) 표(`WordChoiceOption`의 요소와
// 속성) · §3.2 `ui` 테스트 계획. 이 컴포넌트는 상태를 갖지 않는다 — props에서만
// 파생한다(§1.6(a) — 판정을 prop으로 내리지 않는다는 화면 쪽 규율의 짝).
//
// 형태는 `ListeningChoice`를 잇지만(§1.8(e)) 그대로 복사하지 않는 자리 둘:
//   1) 표식 `<svg>`에는 `accessibility-elements-hidden`을 붙이지 않는다 — 자손이
//      없는 잎에 붙이면 무동작이다. 가림은 래퍼(`<view className="word-choice-
//      option-mark">`)에만 붙는다(`AssessmentItem`이 정본).
//   2) `-selected` 상태 클래스는 예약 목록에 이미 있는 낱말이라 다섯째가 아니지만,
//      계산된 스타일이라 `ui`가 원리적으로 못 본다 — 이 파일이 클래스를 단언하지
//      않는다(§3.2 「toHaveClass를 쓰지 않는다」).

const RESULTS: readonly (AnswerResult | null)[] = [null, "correct", "incorrect"];

// 아이콘 모양의 정본은 패키지 모듈이다 — 리터럴을 적지 않는다.
const ICON_BY_RESULT: Record<AnswerResult, string> = {
  correct: tick,
  incorrect: cross,
};

// 아이콘 색의 정본은 design이 고정한 토큰 상수다 — design.md §3.3의 `-text` 변형.
const ICON_COLOR_BY_RESULT: Record<AnswerResult, string> = {
  correct: color.feedback["correct-text"],
  incorrect: color.feedback["incorrect-text"],
};

// ---------------------------------------------------------------- 채널 1: 상태 `data-*`

// data-result가 언제나 붙고 값만 갈린다 — 조건부로 빼면 "속성을 잊었다"와 "판정이
// 없다"가 구별되지 않는다(계약 §2.2).
test("판정이 없으면 data-result가 none이다 · 이름이 텍스트에 보인다", () => {
  render(<WordChoiceOption index={0} text="학교" result={null} onSelect={() => {}} />);

  const root = screen.getByTestId("word-choice-option-0");
  expect(root).toHaveAttribute("data-result", "none");
  expect(root).toHaveTextContent("학교");
});

test("정답이면 data-result가 correct다", () => {
  render(<WordChoiceOption index={1} text="학교" result="correct" onSelect={() => {}} />);

  expect(screen.getByTestId("word-choice-option-1")).toHaveAttribute("data-result", "correct");
});

test("오답이면 data-result가 incorrect다", () => {
  render(<WordChoiceOption index={2} text="공원" result="incorrect" onSelect={() => {}} />);

  expect(screen.getByTestId("word-choice-option-2")).toHaveAttribute("data-result", "incorrect");
});

// ---------------------------------------------------------------- 채널 2: `accessibility-*`

// 응답 전 라벨은 텍스트와 정확히 같다 — 접미사가 없다(계약 §2.3 「비선택은 이름만」).
test("판정이 없으면 accessibility-label이 text와 정확히 같다 — 접미사 없음", () => {
  render(<WordChoiceOption index={0} text="학교" result={null} onSelect={() => {}} />);

  expect(screen.getByTestId("word-choice-option-0")).toHaveAttribute("accessibility-label", "학교");
});

// 구분자는 쉼표 + 공백이다(ADR-0016 D3 · 계약 §2.3 「학교, 정답」).
test("정답이면 accessibility-label에 ', 정답' 접미사가 붙는다", () => {
  render(<WordChoiceOption index={1} text="학교" result="correct" onSelect={() => {}} />);

  expect(screen.getByTestId("word-choice-option-1")).toHaveAttribute(
    "accessibility-label",
    "학교, 정답",
  );
});

test("오답이면 accessibility-label에 ', 오답' 접미사가 붙는다", () => {
  render(<WordChoiceOption index={2} text="공원" result="incorrect" onSelect={() => {}} />);

  expect(screen.getByTestId("word-choice-option-2")).toHaveAttribute(
    "accessibility-label",
    "공원, 오답",
  );
});

// 세 result 전부에서 조작 단위의 이름·역할이 붙는다. 응답 뒤에도 "button"이고
// "disabled"로 바뀌지 않는다(ADR-0016 D10 — 다음 문항에서 다시 눌린다).
for (const result of RESULTS) {
  test(`조작 단위에 element·traits가 붙는다 — result=${String(result)}`, () => {
    render(<WordChoiceOption index={0} text="학교" result={result} onSelect={() => {}} />);

    const root = screen.getByTestId("word-choice-option-0");
    expect(root).toHaveAttribute("accessibility-element", "true");
    expect(root).toHaveAttribute("accessibility-traits", "button");
  });
}

// accessibility-value를 쓰지 않는다(ADR-0016 D3 — 이 스택의 iOS에서 낭독되지 않는다).
for (const result of RESULTS) {
  test(`accessibility-value를 쓰지 않는다 — result=${String(result)}`, () => {
    render(<WordChoiceOption index={0} text="학교" result={result} onSelect={() => {}} />);

    expect(screen.getByTestId("word-choice-option-0")).not.toHaveAttribute("accessibility-value");
  });
}

// ---------------------------------------------------------------- 채널 3: 보이는 표식

// 판정이 없으면 표식 묶음이 통째로 없다(계약 §1.8(e) 「판정은 조건부 렌더다」).
test("판정이 없으면 표식 아이콘이 렌더되지 않는다", () => {
  render(<WordChoiceOption index={0} text="학교" result={null} onSelect={() => {}} />);

  expect(screen.getByTestId("word-choice-option-0")).toHaveAttribute("data-result", "none");
  expect(screen.queryByTestId("word-choice-option-icon-0")).not.toBeInTheDocument();
});

test("판정이 없으면 정답·오답 낱말이 텍스트에 없다", () => {
  render(<WordChoiceOption index={0} text="학교" result={null} onSelect={() => {}} />);

  const root = screen.getByTestId("word-choice-option-0");
  expect(root).not.toHaveTextContent("정답");
  expect(root).not.toHaveTextContent("오답");
});

// 낱말이 보인다 — 색과 독립인 채널이다(WCAG 1.4.1).
test("정답이면 '정답' 낱말이 보기 안에 텍스트로 보인다", () => {
  render(<WordChoiceOption index={1} text="학교" result="correct" onSelect={() => {}} />);

  expect(screen.getByTestId("word-choice-option-1")).toHaveTextContent("정답");
});

test("오답이면 '오답' 낱말이 보기 안에 텍스트로 보인다", () => {
  render(<WordChoiceOption index={2} text="공원" result="incorrect" onSelect={() => {}} />);

  expect(screen.getByTestId("word-choice-option-2")).toHaveTextContent("오답");
});

// 아이콘 모양이 판정별 패키지 모듈 문자열과 같다 — 뒤바뀐 결선을 여기서 잡는다.
for (const result of ["correct", "incorrect"] as const) {
  test(`표식 아이콘 content가 판정(${result})의 패키지 모듈 문자열과 같다`, () => {
    render(<WordChoiceOption index={3} text="식당" result={result} onSelect={() => {}} />);

    expect(screen.getByTestId("word-choice-option-icon-3")).toHaveAttribute(
      "content",
      ICON_BY_RESULT[result],
    );
  });
}

for (const result of ["correct", "incorrect"] as const) {
  test(`표식 아이콘 current-color가 판정(${result})의 토큰 상수와 같다`, () => {
    render(<WordChoiceOption index={3} text="식당" result={result} onSelect={() => {}} />);

    expect(screen.getByTestId("word-choice-option-icon-3")).toHaveAttribute(
      "current-color",
      ICON_COLOR_BY_RESULT[result],
    );
  });
}

test("정답과 오답의 표식이 모양·색 둘 다에서 갈린다", () => {
  expect(ICON_BY_RESULT.correct).not.toBe(ICON_BY_RESULT.incorrect);
  expect(ICON_COLOR_BY_RESULT.correct).not.toBe(ICON_COLOR_BY_RESULT.incorrect);
});

// 표식 래퍼가 가림을 진다(계약 §1.8(e) 「표식 래퍼에 가림이 붙는 것이 여기서는
// 맞다」) — 잎 `<svg>`가 아니라 자손(아이콘 + 낱말)을 가진 래퍼가 진다.
for (const result of ["correct", "incorrect"] as const) {
  test(`표식 래퍼가 accessibility-elements-hidden="true"다 — ${result}`, () => {
    render(<WordChoiceOption index={3} text="식당" result={result} onSelect={() => {}} />);

    const mark = screen
      .getByTestId("word-choice-option-3")
      .querySelector<HTMLElement>(".word-choice-option-mark");

    expect(mark).toContainElement(screen.getByTestId("word-choice-option-icon-3"));
    expect(mark).toHaveAttribute("accessibility-elements-hidden", "true");
  });
}

test("표식 래퍼가 아이콘과 낱말을 자손으로 갖는다 — 가려야 할 자손이 실제로 있다", () => {
  render(<WordChoiceOption index={3} text="식당" result="correct" onSelect={() => {}} />);

  const mark = screen
    .getByTestId("word-choice-option-3")
    .querySelector<HTMLElement>(".word-choice-option-mark");

  expect(mark).toContainElement(screen.getByTestId("word-choice-option-icon-3"));
  expect(mark).toHaveTextContent("정답");
});

// 보기 하나당 정지 노드가 1개다(ADR-0016 D5). 라벨 <text>나 표식에
// accessibility-element·accessibility-label을 붙이면 정지 노드가 늘고 이름이 두 번
// 읽힌다 — 루트의 자손에 그 속성이 하나도 없다는 것으로 본다.
for (const result of RESULTS) {
  test(`보기 안의 자식이 조작 단위가 되지 않는다 — result=${String(result)}`, () => {
    render(<WordChoiceOption index={0} text="학교" result={result} onSelect={() => {}} />);

    const root = screen.getByTestId("word-choice-option-0");
    expect(root.querySelectorAll("[accessibility-element]")).toHaveLength(0);
    expect(root.querySelectorAll("[accessibility-label]")).toHaveLength(0);
  });
}

// ---------------------------------------------------------------- 상호작용

test("tap하면 onSelect가 index로 정확히 한 번 불린다", () => {
  const onSelect = vi.fn<(index: number) => void>();
  render(<WordChoiceOption index={2} text="공원" result={null} onSelect={onSelect} />);

  fireEvent.tap(screen.getByTestId("word-choice-option-2"), {});

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(2);
});

// 0번 보기 — 0은 falsy다. `index && …` 같은 truthy 분기가 들어오면 0번 보기만 조용히
// 죽는다(계약 §1.8(e) · word-choice.ts choiceResultAt 주석과 같은 함정).
test("0번 보기를 tap해도 onSelect가 0으로 불린다 — 0은 falsy다", () => {
  const onSelect = vi.fn<(index: number) => void>();
  render(<WordChoiceOption index={0} text="학교" result={null} onSelect={onSelect} />);

  fireEvent.tap(screen.getByTestId("word-choice-option-0"), {});

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(0);
});

// 이미 판정이 실린 보기도 tap을 위로 올린다 — 차단은 이 컴포넌트의 일이 아니다.
// 게이트는 리듀서 하나다(계약 §1.6(a) 「막는 자리가 하나다」).
for (const result of ["correct", "incorrect"] as const) {
  test(`판정이 실린 뒤에도 tap하면 onSelect가 불린다 — ${result} (게이트는 리듀서다)`, () => {
    const onSelect = vi.fn<(index: number) => void>();
    render(<WordChoiceOption index={1} text="학교" result={result} onSelect={onSelect} />);

    fireEvent.tap(screen.getByTestId("word-choice-option-1"), {});

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(1);
  });
}

// 이 컴포넌트는 상태를 갖지 않는다 — tap해도 렌더된 판정이 움직이지 않는다.
test("tap해도 렌더된 data-result는 그대로다 — 컴포넌트는 상태를 갖지 않는다", () => {
  render(<WordChoiceOption index={0} text="학교" result={null} onSelect={() => {}} />);

  fireEvent.tap(screen.getByTestId("word-choice-option-0"), {});

  expect(screen.getByTestId("word-choice-option-0")).toHaveAttribute("data-result", "none");
});
