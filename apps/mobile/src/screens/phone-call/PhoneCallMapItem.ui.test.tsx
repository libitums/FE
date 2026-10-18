import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { PhoneCallMapItem } from "../journey-map/PhoneCallMapItem";

describe("PhoneCallMapItem UI", () => {
  it.each(["available", "completed"] as const)(
    "%s 상태의 이름·상태·button trait를 낸다",
    (status) => {
      render(
        <PhoneCallMapItem
          id="appointment-confirmation-phone-call"
          title="A Call from Minseo"
          status={status}
          onSelect={vi.fn()}
        />,
      );
      const item = screen.getByTestId("ui-lynx-special-unit-appointment-confirmation-phone-call");
      expect(item).toHaveAttribute("accessibility-element", "true");
      expect(item).toHaveAttribute("data-status", status === "completed" ? "clear" : "available");
      expect(item).toHaveAttribute("accessibility-traits", "button");
      // `special, ` 접두는 맵 문구표가, 상태 접미사는 `SpecialUnit`이 붙입니다(ADR-0016 D3).
      expect(item).toHaveAttribute(
        "accessibility-label",
        status === "completed"
          ? "special, A Call from Minseo, completed"
          : "special, A Call from Minseo",
      );
      expect(screen.getByText("A Call from Minseo")).toBeInTheDocument();
    },
  );

  it("탭할 때 전화 유닛 ID를 한 번 전달한다", () => {
    const onSelect = vi.fn();
    render(
      <PhoneCallMapItem
        id="appointment-confirmation-phone-call"
        title="A Call from Minseo"
        status="available"
        onSelect={onSelect}
      />,
    );
    fireEvent.tap(
      screen.getByTestId("ui-lynx-special-unit-appointment-confirmation-phone-call"),
      {},
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("appointment-confirmation-phone-call");
  });
});
