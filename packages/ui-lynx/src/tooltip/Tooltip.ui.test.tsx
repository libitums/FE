import { render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test } from "vitest";

import { Tooltip } from "./index";

describe("Tooltip UI", () => {
  test("Visible Bubble은 Message만 노출하고 focus나 pointer를 가로채지 않는다", () => {
    render(<Tooltip message="힌트 보기" />);

    const tooltip = screen.getByTestId("ui-lynx-tooltip");
    expect(tooltip).toHaveTextContent("힌트 보기");
    expect(tooltip).toHaveAttribute("accessibility-element", "true");
    expect(tooltip).toHaveAttribute("accessibility-label", "힌트 보기");
    expect(tooltip).toHaveAttribute("accessibility-traits", "text");
    expect(tooltip).toHaveAttribute("focusable", "false");
    expect(tooltip).toHaveAttribute("event-through", "true");
    expect(tooltip).not.toHaveAttribute("bindtap");
  });

  test("Hidden은 시각·접근성 상태를 함께 숨긴다", () => {
    render(<Tooltip message="숨은 설명" visibility="hidden" />);

    const tooltip = screen.getByTestId("ui-lynx-tooltip");
    expect(tooltip).toHaveAttribute("data-visibility", "hidden");
    expect(tooltip).toHaveAttribute("accessibility-element", "false");
    expect(tooltip).toHaveAttribute("accessibility-elements-hidden", "true");
    expect(tooltip).not.toHaveAttribute("accessibility-label");
  });

  test("Arrow Off이면 장식 node를 렌더하지 않는다", () => {
    render(<Tooltip message="대상이 분명한 설명" arrow="off" />);

    expect(screen.getByTestId("ui-lynx-tooltip")).toHaveAttribute("data-arrow", "off");
    expect(screen.queryByTestId("ui-lynx-tooltip-arrow")).not.toBeInTheDocument();
  });

  test("placement·alignment·tone·direction을 data와 class에 반영한다", () => {
    render(
      <Tooltip
        message="다음 단계"
        placement="start"
        alignment="end"
        tone="brand"
        direction="rtl"
      />,
    );

    const tooltip = screen.getByTestId("ui-lynx-tooltip");
    expect(tooltip).toHaveAttribute("data-placement", "start");
    expect(tooltip).toHaveAttribute("data-alignment", "end");
    expect(tooltip).toHaveAttribute("data-tone", "brand");
    expect(tooltip).toHaveAttribute("data-direction", "rtl");
    expect(tooltip).toHaveClass("ui-lynx-tooltip-start", "ui-lynx-tooltip-rtl");
  });

  test("학습 콘텐츠의 언어 tag를 host 연결용 metadata로 보존한다", () => {
    render(<Tooltip message="Try again" contentLanguage="learning" languageTag="en-US" />);

    const tooltip = screen.getByTestId("ui-lynx-tooltip");
    expect(tooltip).toHaveAttribute("data-language", "learning");
    expect(tooltip).toHaveAttribute("data-lang", "en-US");
  });

  test("측정된 layout은 Flip·Shift 좌표와 Arrow offset을 렌더링한다", () => {
    render(
      <Tooltip
        message="경계 안의 설명"
        placement="top"
        layout={{ left: 16, top: 58, placement: "bottom", arrow: "on", arrowOffset: 44 }}
      />,
    );

    const tooltip = screen.getByTestId("ui-lynx-tooltip");
    expect(tooltip).toHaveAttribute("data-placement", "top");
    expect(tooltip).toHaveAttribute("data-resolvedplacement", "bottom");
    expect(tooltip).toHaveClass("ui-lynx-tooltip-positioned", "ui-lynx-tooltip-bottom");
    expect(tooltip).toHaveStyle({ left: "16px", top: "58px" });
    expect(screen.getByTestId("ui-lynx-tooltip-arrow")).toHaveStyle({ left: "44px" });
  });
});
