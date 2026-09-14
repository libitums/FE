import { render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test } from "vitest";

import { StepIndicator } from "./index";

describe("StepIndicator UI", () => {
  test("전체 줄 하나만 현재 진행 상태로 노출하고 시각 자손을 숨긴다", () => {
    render(<StepIndicator currentStep={2} totalSteps={4} />);

    const indicator = screen.getByTestId("ui-lynx-step-indicator");
    expect(indicator).toHaveAttribute("accessibility-element", "true");
    expect(indicator).toHaveAttribute("accessibility-label", "4단계 중 2단계");
    expect(indicator).toHaveAttribute("data-current", "2");
    expect(indicator).toHaveAttribute("data-total", "4");
    expect(screen.getByTestId("ui-lynx-step-indicator-visual")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
  });

  test("각 숫자 원과 사이 연결선을 순서대로 렌더하고 연결선은 왼쪽 상태를 따른다", () => {
    render(<StepIndicator currentStep={2} totalSteps={4} />);

    expect(screen.getAllByTestId("ui-lynx-step-indicator-circle")).toHaveLength(4);
    expect(screen.getAllByTestId("ui-lynx-step-indicator-connector")).toHaveLength(3);
    expect(screen.getByTestId("ui-lynx-step-indicator-visual")).toHaveTextContent("1234");

    const circles = screen.getAllByTestId("ui-lynx-step-indicator-circle");
    expect(circles.map((circle) => circle.getAttribute("data-status"))).toEqual([
      "completed",
      "current",
      "upcoming",
      "upcoming",
    ]);

    const connectors = screen.getAllByTestId("ui-lynx-step-indicator-connector");
    expect(connectors.map((connector) => connector.getAttribute("data-status"))).toEqual([
      "completed",
      "current",
      "upcoming",
    ]);
  });

  test("tap handler와 button trait를 만들지 않는 비상호작용 상태 표시다", () => {
    render(<StepIndicator currentStep={1} totalSteps={2} />);
    const indicator = screen.getByTestId("ui-lynx-step-indicator");
    expect(indicator).not.toHaveAttribute("bindtap");
    expect(indicator).not.toHaveAttribute("accessibility-traits", "button");
  });
});
