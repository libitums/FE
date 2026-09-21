import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { color } from "@libitums/design-tokens";
import info02 from "@libitums/icons/lynx/info-02";
import { describe, expect, test, vi } from "vitest";

import { RoundButton } from "./index";

describe("RoundButton", () => {
  test("접근성 이름·trait와 안정적인 data 속성을 노출한다", () => {
    render(<RoundButton accessibilityLabel="정보" icon={info02} variant="brand" size="l" />);

    const button = screen.getByTestId("ui-lynx-round-button");
    expect(button).toHaveClass(
      "ui-lynx-round-button",
      "ui-lynx-round-button-brand",
      "ui-lynx-round-button-l",
    );
    expect(screen.getByTestId("ui-lynx-round-button-surface")).toBeInTheDocument();
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-label", "정보");
    expect(button).toHaveAttribute("accessibility-traits", "button");
    expect(button).toHaveAttribute("data-variant", "brand");
    expect(button).toHaveAttribute("data-size", "l");
    expect(button).toHaveAttribute("data-disabled", "false");
    expect(button).toHaveAttribute("data-loading", "false");
  });

  test("icon content의 currentColor를 variant foreground로 해석해 Web에서도 색을 표시한다", () => {
    render(<RoundButton accessibilityLabel="정보" icon={info02} variant="brand" />);

    const icon = screen.getByTestId("ui-lynx-round-button-icon");
    expect(icon).toHaveAttribute("content", info02.replace(/currentColor/g, color.brand.primary));
    expect(icon.getAttribute("content")).not.toContain("currentColor");
    expect(icon).toHaveAttribute("current-color", color.brand.primary);
    expect(icon.parentElement).toHaveAttribute("accessibility-elements-hidden", "true");
  });

  test("loading은 icon을 spinner로 대체하고 spinner를 장식 자손으로 숨긴다", () => {
    render(<RoundButton accessibilityLabel="정보" icon={info02} loading={true} />);

    const button = screen.getByTestId("ui-lynx-round-button");
    expect(button).toHaveAttribute("accessibility-label", "정보, 로딩 중");
    expect(button).toHaveAttribute("data-loading", "true");
    expect(button).toHaveClass("ui-lynx-round-button-loading");
    expect(screen.queryByTestId("ui-lynx-round-button-icon")).not.toBeInTheDocument();
    const spinner = screen.getByTestId("ui-lynx-round-button-spinner");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("ui-lynx-round-button-spinner");
    expect(spinner.parentElement).toHaveAttribute("accessibility-elements-hidden", "true");
  });

  test("활성 tap은 정확히 한 번 전달하고 loading·disabled tap은 차단한다", () => {
    const activeTap = vi.fn<() => void>();
    const loadingTap = vi.fn<() => void>();
    const disabledTap = vi.fn<() => void>();

    const active = render(
      <RoundButton accessibilityLabel="활성" icon={info02} bindtap={activeTap} />,
    );
    fireEvent.tap(active.getByTestId("ui-lynx-round-button") as unknown as Element, {});
    active.unmount();

    const loading = render(
      <RoundButton accessibilityLabel="로딩" icon={info02} loading={true} bindtap={loadingTap} />,
    );
    fireEvent.tap(loading.getByTestId("ui-lynx-round-button") as unknown as Element, {});
    loading.unmount();

    const disabled = render(
      <RoundButton
        accessibilityLabel="비활성"
        icon={info02}
        disabled={true}
        bindtap={disabledTap}
      />,
    );
    fireEvent.tap(disabled.getByTestId("ui-lynx-round-button") as unknown as Element, {});
    expect(activeTap).toHaveBeenCalledTimes(1);
    expect(loadingTap).not.toHaveBeenCalled();
    expect(disabledTap).not.toHaveBeenCalled();
  });

  test("disabled+loading은 disabled semantics를 우선하고 spinner·결합 상태를 유지한다", () => {
    render(
      <RoundButton
        accessibilityLabel="업로드"
        icon={info02}
        variant="brand"
        disabled={true}
        loading={true}
      />,
    );

    const button = screen.getByTestId("ui-lynx-round-button");
    expect(button).toHaveAttribute("accessibility-traits", "disabled");
    expect(button).toHaveAttribute("accessibility-label", "업로드, 로딩 중");
    expect(button).toHaveAttribute("data-disabled", "true");
    expect(button).toHaveAttribute("data-loading", "true");
    expect(button).toHaveClass(
      "ui-lynx-round-button-brand",
      "ui-lynx-round-button-disabled",
      "ui-lynx-round-button-loading",
    );
    expect(screen.getByTestId("ui-lynx-round-button-spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("ui-lynx-round-button-icon")).not.toBeInTheDocument();
  });
});
