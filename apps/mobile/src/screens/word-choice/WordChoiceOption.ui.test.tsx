import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { WordChoiceOption } from "./WordChoiceOption";

// `ui` 계층: 렌더 결과와 상호작용만 봅니다 (ADR-0006 D4). 계산된 스타일을 볼 수
// 없으므로 `toHaveClass`·`toHaveStyle`·`toBeVisible`을 쓰지 않습니다
// (docs/conventions/code.md 「jest-dom 매처는 절반만 쓴다」). 상태는 전부 속성으로
// 관찰합니다 (「관찰 채널 넷」).
//
// 이 컴포넌트는 상태를 갖지 않습니다 — props에서만 파생합니다(판정을 prop으로
// 내리지 않는다는 화면 쪽 규율의 짝입니다).
//
// ⟨2026-09-28, Figma 65-327⟩ **보기에서 표식(✓ · ✗)이 걷혔습니다.** 그래서 이 파일에서
// 아이콘 모양·아이콘 색·표식 래퍼의 가림을 보던 단언 아홉이 사라졌습니다 — 그 자리는
// 이제 무대 카드의 배지가 지고, 배지의 단언은 `AnswerVerdict.ui.test.tsx`에 있습니다.
//
// **판정이 관찰 불가가 된 것은 아닙니다.** 이 파일이 남기는 채널이 둘입니다:
// `data-result`(테스트가 보는 상태)와 `accessibility-label`의 접미사(보조기술이 듣는
// 것). 보이는 채널은 테두리와 글자 색인데 그 둘은 계산된 스타일이라 `ui`가 원리적으로
// 못 봅니다 — 그래서 이 파일은 클래스를 단언하지 않습니다(「toHaveClass를 쓰지 않는다」).
// 색이 유일한 채널이 되지 않게 지키는 것은 카드의 배지입니다(WCAG 1.4.1).

const RESULTS: readonly (AnswerResult | null)[] = [null, "correct", "incorrect"];

// ---------------------------------------------------------------- 채널 1: 상태 `data-*`

// data-result가 언제나 붙고 값만 갈립니다 — 조건부로 빼면 "속성을 잊었다"와 "판정이
// 없다"가 구별되지 않습니다.
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

// 응답 전 라벨은 텍스트와 정확히 같습니다 — 접미사가 없습니다(비선택은 이름만).
test("판정이 없으면 accessibility-label이 text와 정확히 같다 — 접미사 없음", () => {
  render(<WordChoiceOption index={0} text="학교" result={null} onSelect={() => {}} />);

  expect(screen.getByTestId("word-choice-option-0")).toHaveAttribute("accessibility-label", "학교");
});

// 구분자는 쉼표 + 공백입니다(ADR-0016 D3).
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

// 세 result 전부에서 조작 단위의 이름·역할이 붙습니다. 응답 뒤에도 "button"이고
// "disabled"로 바뀌지 않습니다(ADR-0016 D10 — 다음 문항에서 다시 눌립니다).
for (const result of RESULTS) {
  test(`조작 단위에 element·traits가 붙는다 — result=${String(result)}`, () => {
    render(<WordChoiceOption index={0} text="학교" result={result} onSelect={() => {}} />);

    const root = screen.getByTestId("word-choice-option-0");
    expect(root).toHaveAttribute("accessibility-element", "true");
    expect(root).toHaveAttribute("accessibility-traits", "button");
  });
}

// accessibility-value를 쓰지 않습니다(ADR-0016 D3 — 이 스택의 iOS에서 낭독되지
// 않습니다).
for (const result of RESULTS) {
  test(`accessibility-value를 쓰지 않는다 — result=${String(result)}`, () => {
    render(<WordChoiceOption index={0} text="학교" result={result} onSelect={() => {}} />);

    expect(screen.getByTestId("word-choice-option-0")).not.toHaveAttribute("accessibility-value");
  });
}

// -------------------------------------------------- 채널 3: 보이는 것 — 낱말 하나뿐

// 보기가 보여 주는 것은 낱말 하나입니다. 표식도 판정 낱말도 없습니다 — 판정은 무대
// 카드의 배지가 냅니다. **세 result 전부에서** 봅니다: 하나만 보면 「판정이 없을 때만
// 비어 있다」와 구별되지 않습니다.
for (const result of RESULTS) {
  test(`보이는 것이 낱말 하나다 — 표식 아이콘이 없다 · result=${String(result)}`, () => {
    render(<WordChoiceOption index={3} text="식당" result={result} onSelect={() => {}} />);

    const root = screen.getByTestId("word-choice-option-3");
    expect(root).toHaveTextContent("식당");
    expect(screen.queryByTestId("word-choice-option-icon-3")).not.toBeInTheDocument();
    expect(root.querySelectorAll("svg")).toHaveLength(0);
  });
}

// 판정 낱말이 보기 안에 없습니다. 있으면 같은 말을 카드의 배지와 보기가 두 번 합니다.
for (const result of RESULTS) {
  test(`'정답'·'오답' 낱말이 보기 안에 없다 — result=${String(result)}`, () => {
    render(<WordChoiceOption index={0} text="학교" result={result} onSelect={() => {}} />);

    const root = screen.getByTestId("word-choice-option-0");
    expect(root).not.toHaveTextContent("정답");
    expect(root).not.toHaveTextContent("오답");
  });
}

// 표식 래퍼가 통째로 없습니다 — 클래스가 남아 있으면 CSS도 함께 남아 죽은 규칙이
// 됩니다. 이 단언 하나가 「지웠다」를 지킵니다.
for (const result of RESULTS) {
  test(`표식 래퍼가 없다 — result=${String(result)}`, () => {
    render(<WordChoiceOption index={0} text="학교" result={result} onSelect={() => {}} />);

    const root = screen.getByTestId("word-choice-option-0");
    expect(root.querySelectorAll(".word-choice-option-mark")).toHaveLength(0);
  });
}

// 보기 하나당 정지 노드가 1개입니다(ADR-0016 D5). 라벨 <text>나 표식에
// accessibility-element·accessibility-label을 붙이면 정지 노드가 늘고 이름이 두 번
// 읽힙니다 — 루트의 자손에 그 속성이 하나도 없다는 것으로 봅니다.
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

// 0번 보기입니다 — 0은 falsy입니다. `index && …` 같은 truthy 분기가 들어오면 0번
// 보기만 조용히 죽습니다(word-choice.ts choiceResultAt 주석과 같은 함정입니다).
test("0번 보기를 tap해도 onSelect가 0으로 불린다 — 0은 falsy다", () => {
  const onSelect = vi.fn<(index: number) => void>();
  render(<WordChoiceOption index={0} text="학교" result={null} onSelect={onSelect} />);

  fireEvent.tap(screen.getByTestId("word-choice-option-0"), {});

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(0);
});

// 이미 판정이 실린 보기도 tap을 위로 올립니다 — 차단은 이 컴포넌트의 일이
// 아닙니다. 게이트는 리듀서 하나입니다 — 막는 자리가 하나입니다.
for (const result of ["correct", "incorrect"] as const) {
  test(`판정이 실린 뒤에도 tap하면 onSelect가 불린다 — ${result} (게이트는 리듀서다)`, () => {
    const onSelect = vi.fn<(index: number) => void>();
    render(<WordChoiceOption index={1} text="학교" result={result} onSelect={onSelect} />);

    fireEvent.tap(screen.getByTestId("word-choice-option-1"), {});

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(1);
  });
}

// 이 컴포넌트는 상태를 갖지 않습니다 — tap해도 렌더된 판정이 움직이지 않습니다.
test("tap해도 렌더된 data-result는 그대로다 — 컴포넌트는 상태를 갖지 않는다", () => {
  render(<WordChoiceOption index={0} text="학교" result={null} onSelect={() => {}} />);

  fireEvent.tap(screen.getByTestId("word-choice-option-0"), {});

  expect(screen.getByTestId("word-choice-option-0")).toHaveAttribute("data-result", "none");
});
