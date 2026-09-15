import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test, vi } from "vitest";

import { CompactNumericInput } from "./index";

function dispatchInputEvent(element: HTMLElement, detail: object) {
  const EventConstructor = element.ownerDocument.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-compact-numeric-input"]');
  fireEvent(ref as unknown as Element, new EventConstructor("bindEvent:input", { detail }));
}

describe("CompactNumericInput", () => {
  test("native 한 자리 숫자 input과 접근성 이름을 노출한다", () => {
    render(
      <CompactNumericInput
        accessibilityLabel="반복 횟수"
        defaultValue="8"
        placeholder="0"
        size="s"
      />,
    );

    const input = screen.getByTestId("ui-lynx-compact-numeric-input");
    expect(input.tagName.toLowerCase()).toBe("input");
    expect(input).toHaveClass("ui-lynx-compact-numeric-input", "ui-lynx-compact-numeric-input-s");
    expect(input).toHaveAttribute("type", "digit");
    expect(input).toHaveAttribute("maxlength", "1");
    expect(input).toHaveAttribute("input-filter", "[^0-9]");
    expect(input).toHaveAttribute("confirm-type", "done");
    expect(input).toHaveAttribute("default-value", "8");
    expect(input).toHaveAttribute("placeholder", "0");
    expect(input).toHaveAttribute("accessibility-element", "true");
    expect(input).toHaveAttribute("accessibility-label", "반복 횟수");
    expect(input).toHaveAttribute("data-size", "s");
    expect(input).toHaveAttribute("data-error", "false");
    expect(input).toHaveAttribute("data-disabled", "false");
  });

  test("입력 경로와 관계없이 마지막 숫자 한 자리만 bindinput으로 전달한다", () => {
    const onInput = vi.fn<(value: string) => void>();
    render(<CompactNumericInput accessibilityLabel="수량" bindinput={onInput} />);

    dispatchInputEvent(screen.getByTestId("ui-lynx-compact-numeric-input"), {
      value: "ab57",
    });

    expect(onInput).toHaveBeenCalledOnce();
    expect(onInput).toHaveBeenCalledWith("7");
  });

  test("focus와 blur를 각각 한 번 전달한다", () => {
    const onFocus = vi.fn<() => void>();
    const onBlur = vi.fn<() => void>();
    render(<CompactNumericInput accessibilityLabel="수량" bindfocus={onFocus} bindblur={onBlur} />);
    const inputRef = lynx
      .createSelectorQuery()
      .select('[data-testid="ui-lynx-compact-numeric-input"]');

    fireEvent.focus(inputRef as unknown as Element, { detail: { value: "" } });
    fireEvent.blur(inputRef as unknown as Element, { detail: { value: "" } });

    expect(onFocus).toHaveBeenCalledOnce();
    expect(onBlur).toHaveBeenCalledOnce();
  });

  test("Error와 Disabled 상태를 노출하고 Disabled callback을 연결하지 않는다", () => {
    const onInput = vi.fn<(value: string) => void>();
    render(
      <CompactNumericInput
        accessibilityLabel="수량"
        error={true}
        disabled={true}
        bindinput={onInput}
      />,
    );

    const input = screen.getByTestId("ui-lynx-compact-numeric-input");
    expect(input).toHaveClass(
      "ui-lynx-compact-numeric-input-error",
      "ui-lynx-compact-numeric-input-disabled",
    );
    expect(input).toHaveAttribute("disabled", "true");
    expect(input).toHaveAttribute("data-error", "true");
    expect(input).toHaveAttribute("data-disabled", "true");

    dispatchInputEvent(input, { value: "4" });
    expect(onInput).not.toHaveBeenCalled();
  });
});
