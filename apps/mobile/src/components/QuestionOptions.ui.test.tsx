import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { QuestionOptions } from "./QuestionOptions";
import type { QuestionOptionsProps } from "./QuestionOptions";

// `ui` 계층: 문항 보기 부품이 OptionSelector(outlined-subtle)를 실제로 그리고 상태 갈래대로 서는지 봅니다.
// 입력 → props 변환은 `question-options.unit.test.ts`가 지고, 여기서는 그려진 결과만 봅니다.

const itemId = (index: number): string => `ui-lynx-option-selector-item-choice-${index}`;

const texts = ["안녕하세요", "감사합니다", "미안합니다", "괜찮아요"] as const;

function props(overrides: Partial<QuestionOptionsProps> = {}): QuestionOptionsProps {
  return {
    testId: "question-options",
    groupLabel: "알맞은 응답을 고르세요",
    options: texts.map((text) => ({ text })),
    accessibilityLabels: [...texts],
    layout: "stack",
    density: "regular",
    state: { kind: "open" },
    onSelect: () => {},
    ...overrides,
  };
}

test("QOU1. 보기 넷이 choice-0..3 항목으로 서고 컨테이너 testid와 크기가 밀도를 따른다", () => {
  const regular = render(<QuestionOptions {...props()} />);

  expect(screen.getByTestId("question-options")).toBeInTheDocument();
  for (const index of [0, 1, 2, 3]) {
    expect(screen.getByTestId(itemId(index))).toBeInTheDocument();
  }
  const root = screen.getByTestId("ui-lynx-option-selector");
  expect(root).toHaveAttribute("data-variant", "outlined-subtle");
  expect(root).toHaveClass("ui-lynx-option-selector-m");
  regular.unmount();

  render(<QuestionOptions {...props({ density: "compact" })} />);

  expect(screen.getByTestId("ui-lynx-option-selector")).toHaveClass("ui-lynx-option-selector-s");
});

test("QOU1. 보기 글자와 이름은 accessibilityLabels를 따르고 뜻 줄은 meaning이 있는 보기에만 선다", () => {
  render(
    <QuestionOptions
      {...props({
        options: [{ text: "안녕하세요", meaning: "Hello" }, { text: "감사합니다" }],
        accessibilityLabels: ["안녕하세요, Hello", "감사합니다"],
      })}
    />,
  );

  expect(screen.getByTestId("ui-lynx-option-selector-label-choice-0")).toHaveTextContent(
    "안녕하세요",
  );
  expect(screen.getByTestId("ui-lynx-option-selector-meaning-choice-0")).toHaveTextContent("Hello");
  expect(screen.queryByTestId("ui-lynx-option-selector-meaning-choice-1")).not.toBeInTheDocument();
  expect(screen.getByTestId(itemId(0))).toHaveAttribute("accessibility-label", "안녕하세요, Hello");
  expect(screen.getByTestId(itemId(1))).toHaveAttribute("accessibility-label", "감사합니다");
});

test("QOU2. waiting은 흐린 래퍼 안에서 탭을 흡수하고 항목 traits는 button이다", () => {
  const onSelect = vi.fn<(index: number) => void>();
  render(<QuestionOptions {...props({ state: { kind: "waiting" }, onSelect })} />);

  expect(screen.getByTestId("question-options-waiting")).toContainElement(
    screen.getByTestId(itemId(0)),
  );
  expect(screen.getByTestId(itemId(0))).toHaveAttribute("accessibility-traits", "button");

  fireEvent.tap(screen.getByTestId(itemId(0)), {});
  fireEvent.tap(screen.getByTestId(itemId(2)), {});

  expect(onSelect).not.toHaveBeenCalled();
});

test("QOU2. open에는 waiting 래퍼가 없다", () => {
  render(<QuestionOptions {...props()} />);

  expect(screen.queryByTestId("question-options-waiting")).not.toBeInTheDocument();
});

test("QOU3. open에서 choice-2를 탭하면 onSelect(2)가 한 번 불리고 판정 뒤에는 불리지 않는다", () => {
  const onSelect = vi.fn<(index: number) => void>();
  const view = render(<QuestionOptions {...props({ onSelect })} />);

  fireEvent.tap(screen.getByTestId(itemId(2)), {});

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(2);

  view.rerender(
    <QuestionOptions
      {...props({
        onSelect,
        state: { kind: "judged", index: 2, result: "correct", rest: "disabled" },
      })}
    />,
  );
  fireEvent.tap(screen.getByTestId(itemId(0)), {});
  fireEvent.tap(screen.getByTestId(itemId(2)), {});

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId(itemId(0))).toHaveAttribute("accessibility-traits", "disabled");
  expect(screen.getByTestId(itemId(2))).toHaveClass("ui-lynx-option-selector-item-correct");
});

test("QOU3. 오답 판정은 고른 보기만 incorrect이고 나머지는 disabled다", () => {
  render(
    <QuestionOptions
      {...props({ state: { kind: "judged", index: 1, result: "incorrect", rest: "disabled" } })}
    />,
  );

  expect(screen.getByTestId(itemId(1))).toHaveClass("ui-lynx-option-selector-item-incorrect");
  expect(screen.getByTestId(itemId(0))).not.toHaveClass("ui-lynx-option-selector-item-incorrect");
  for (const index of [0, 2, 3]) {
    expect(screen.getByTestId(itemId(index))).toHaveAttribute("accessibility-traits", "disabled");
  }
});

test("QOU4. judged collapsed는 고른 보기 하나만 남긴다", () => {
  render(
    <QuestionOptions
      {...props({ state: { kind: "judged", index: 2, result: "correct", rest: "collapsed" } })}
    />,
  );

  expect(screen.getByTestId(itemId(2))).toBeInTheDocument();
  expect(screen.queryByTestId(itemId(0))).not.toBeInTheDocument();
  expect(screen.queryByTestId(itemId(1))).not.toBeInTheDocument();
  expect(screen.queryByTestId(itemId(3))).not.toBeInTheDocument();
});
