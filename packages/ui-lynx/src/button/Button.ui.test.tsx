import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test, vi } from "vitest";

import { Button } from "./index";

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
  });

  test("loading은 라벨을 유지하고 상태 이름과 spinner를 제공한다", () => {
    render(<Button label="저장" loading={true} />);

    const button = screen.getByTestId("ui-lynx-button");
    expect(button).toHaveAttribute("data-loading", "true");
    expect(button).toHaveAttribute("accessibility-label", "저장, 로딩 중");
    expect(screen.getByTestId("ui-lynx-button-label")).toHaveTextContent("저장");
    expect(screen.getByTestId("ui-lynx-button-spinner")).toBeInTheDocument();
  });
});
