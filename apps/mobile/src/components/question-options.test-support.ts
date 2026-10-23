// 테스트 지원 — 문항 보기(OptionSelector outlined-subtle) 항목의 판정과 낭독 상태를 같은 말로 단언합니다.
// 제품 코드는 값 import하지 않습니다.
import { expect } from "vitest";

export type ChoiceResult = "none" | "correct" | "incorrect";

const correctClass = "ui-lynx-option-selector-item-correct";
const incorrectClass = "ui-lynx-option-selector-item-incorrect";

/** 항목이 판정 색(클래스)을 지는지 봅니다. `none`은 두 판정 클래스가 모두 없다는 뜻입니다. */
export function expectChoiceResult(element: HTMLElement, result: ChoiceResult): void {
  if (result === "correct") {
    expect(element).toHaveClass(correctClass);
    expect(element).not.toHaveClass(incorrectClass);
  } else if (result === "incorrect") {
    expect(element).toHaveClass(incorrectClass);
    expect(element).not.toHaveClass(correctClass);
  } else {
    expect(element).not.toHaveClass(correctClass);
    expect(element).not.toHaveClass(incorrectClass);
  }
}

/** 낭독 상태입니다 — 판정 뒤 보기는 모두 `disabled`, 판정 전에는 `button`입니다. */
export function expectChoiceTraits(element: HTMLElement, traits: "button" | "disabled"): void {
  expect(element).toHaveAttribute("accessibility-traits", traits);
}

/** 보기 항목의 testid입니다. */
export function choiceItemId(index: number): string {
  return `ui-lynx-option-selector-item-choice-${index}`;
}

/** 보기 뜻 줄의 testid입니다. */
export function choiceMeaningId(index: number): string {
  return `ui-lynx-option-selector-meaning-choice-${index}`;
}
