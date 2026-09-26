import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { MessengerMapItem } from "./MessengerMapItem";

describe("MessengerMapItem 접근성 회귀", () => {
  it("available 항목은 접근성 요소·정확한 label·button trait를 낸다", () => {
    render(
      <MessengerMapItem
        id="appointment-confirmation"
        title="약속 확인 메시지"
        status="available"
        onSelect={vi.fn()}
      />,
    );
    const item = screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation");
    expect(item).toHaveAttribute("accessibility-element", "true");
    expect(item).toHaveAttribute("accessibility-label", "약속 확인 메시지, 이야기 연결");
    expect(item).toHaveAttribute("accessibility-traits", "button");
  });

  it("completed 항목은 완료 접미사를 포함한 접근성 이름과 button trait를 낸다", () => {
    render(
      <MessengerMapItem
        id="appointment-confirmation"
        title="약속 확인 메시지"
        status="completed"
        onSelect={vi.fn()}
      />,
    );
    const item = screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation");
    expect(item).toHaveAttribute("accessibility-element", "true");
    expect(item).toHaveAttribute("accessibility-label", "약속 확인 메시지, 완료됨, 이야기 연결");
    expect(item).toHaveAttribute("accessibility-traits", "button");
  });
});
