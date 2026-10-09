import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import info02 from "@libitums/icons/lynx/info-02";
import { describe, expect, test, vi } from "vitest";

import { Button } from "./index";

/** 테스트 렌더러가 조건부 자식에 두르는 <wrapper>를 풀어 논리적 자식 목록을 돌려줍니다. */
const logicalChildren = (element: Element): Element[] =>
  Array.from(element.children).flatMap((child) =>
    child.tagName.toLowerCase() === "wrapper" ? logicalChildren(child) : [child],
  );

describe("Button UI", () => {
  test("variant, size, width와 접근성 계약을 속성으로 노출한다", () => {
    render(<Button label="계속" size="xl" variant="brand" width="fill" />);

    const button = screen.getByTestId("ui-lynx-button");
    expect(button).toHaveAttribute("data-variant", "brand");
    expect(button).toHaveAttribute("data-size", "xl");
    expect(button).toHaveAttribute("data-width", "fill");
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-label", "계속");
    expect(button).toHaveAttribute("accessibility-traits", "button");
    expect(button).toHaveAttribute("accessibility-enable-tap", "true");
    expect(button).toHaveAttribute("flatten", "false");
  });

  test("tap을 소비자 callback으로 전달한다", () => {
    const onTap = vi.fn<() => void>();
    render(<Button bindtap={onTap} label="계속" />);

    fireEvent.tap(screen.getByTestId("ui-lynx-button"), {});
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  test("disabled는 callback을 막고 disabled trait을 노출한다", () => {
    const onTap = vi.fn<() => void>();
    render(<Button bindtap={onTap} disabled={true} label="계속" />);

    const button = screen.getByTestId("ui-lynx-button");
    fireEvent.tap(button, {});
    expect(onTap).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("data-disabled", "true");
    expect(button).toHaveAttribute("accessibility-traits", "disabled");
    expect(button).toHaveAttribute("accessibility-enable-tap", "false");
  });

  test("BU1. loading은 라벨을 숨긴 채 DOM에 두고 spinner만 보인다(폭 유지)", () => {
    render(<Button label="저장" loading={true} />);

    const button = screen.getByTestId("ui-lynx-button");
    expect(button).toHaveAttribute("data-loading", "true");
    expect(button).toHaveAttribute("accessibility-label", "저장, loading");
    const label = screen.getByTestId("ui-lynx-button-label");
    expect(label).toHaveTextContent("저장");
    expect(label).toHaveStyle({ visibility: "hidden" });
    const spinner = screen.getByTestId("ui-lynx-button-spinner");
    expect(spinner).toBeInTheDocument();
    const wrap = spinner.parentElement as Element;
    expect(wrap).toHaveClass("ui-lynx-button-spinner-wrap");
    expect(wrap).toHaveAttribute("accessibility-elements-hidden", "true");
    const surface = wrap.closest(".ui-lynx-button-surface") as Element;
    expect(logicalChildren(surface)[0]).toBe(wrap);
  });

  test.each([
    ["leading", ["spinner-wrap", "icon", "label"]],
    ["trailing", ["spinner-wrap", "label", "icon"]],
  ] as const)(
    "BU2. loading + %s 아이콘은 아이콘도 숨긴 채 렌더하고 자식 순서를 지킨다",
    (position, order) => {
      render(<Button label="저장" loading={true} icon={info02} iconPosition={position} />);

      const icon = screen.getByTestId("ui-lynx-button-icon");
      expect(icon).toHaveStyle({ visibility: "hidden" });
      expect(screen.getByTestId("ui-lynx-button-label")).toHaveStyle({ visibility: "hidden" });
      const surface = screen
        .getByTestId("ui-lynx-button-spinner")
        .closest(".ui-lynx-button-surface") as Element;
      const names = logicalChildren(surface).map((child) =>
        child.classList.contains("ui-lynx-button-spinner-wrap")
          ? "spinner-wrap"
          : child.classList.contains("ui-lynx-button-icon")
            ? "icon"
            : "label",
      );
      expect(names).toEqual([...order]);
    },
  );

  test.each([
    ["leading", ["icon", "label"]],
    ["trailing", ["label", "icon"]],
  ] as const)(
    "BU3. loading이 아니면 label · icon에 style 속성이 없고 spinner가 없다(%s)",
    (position, order) => {
      render(<Button label="저장" icon={info02} iconPosition={position} />);

      const label = screen.getByTestId("ui-lynx-button-label");
      const icon = screen.getByTestId("ui-lynx-button-icon");
      expect(label).not.toHaveAttribute("style");
      expect(icon).not.toHaveAttribute("style");
      expect(screen.queryByTestId("ui-lynx-button-spinner")).not.toBeInTheDocument();
      const surface = label.parentElement as Element;
      const names = logicalChildren(surface).map((child) =>
        child.classList.contains("ui-lynx-button-icon") ? "icon" : "label",
      );
      expect(names).toEqual([...order]);
    },
  );

  test("BU4. disabled + loading도 라벨을 숨기고 disabled trait과 loading 이름을 함께 낸다", () => {
    render(<Button label="저장" disabled={true} loading={true} />);

    const button = screen.getByTestId("ui-lynx-button");
    expect(button).toHaveAttribute("accessibility-traits", "disabled");
    expect(button).toHaveAttribute("accessibility-label", "저장, loading");
    expect(button).toHaveAttribute("accessibility-enable-tap", "false");
    expect(screen.getByTestId("ui-lynx-button-label")).toHaveStyle({ visibility: "hidden" });
    expect(screen.getByTestId("ui-lynx-button-spinner")).toBeInTheDocument();
  });
});
