import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { MessengerMapItem } from "./MessengerMapItem";

describe("MessengerMapItem UI", () => {
  it.each(["available", "completed"] as const)(
    "%s 상태의 라벨·상태·button trait를 낸다",
    (status) => {
      render(
        <MessengerMapItem
          id="appointment-confirmation"
          title="약속 확인 메시지"
          status={status}
          onSelect={vi.fn()}
        />,
      );
      const item = screen.getByTestId("journey-messenger-item-appointment-confirmation");
      expect(item).toHaveAttribute("data-status", status);
      expect(item).toHaveAttribute("accessibility-traits", "button");
      expect(item).toHaveTextContent(
        status === "completed" ? "약속 확인 메시지, 완료됨" : "약속 확인 메시지",
      );
    },
  );

  it("선택 시 특별 유닛 ID를 올린다", () => {
    const onSelect = vi.fn();
    render(
      <MessengerMapItem
        id="appointment-confirmation"
        title="약속 확인 메시지"
        status="available"
        onSelect={onSelect}
      />,
    );
    fireEvent.tap(screen.getByTestId("journey-messenger-item-appointment-confirmation"), {});
    expect(onSelect).toHaveBeenCalledWith("appointment-confirmation");
  });
});
