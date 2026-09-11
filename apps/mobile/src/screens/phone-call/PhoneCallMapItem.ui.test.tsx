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
          title="약속 확인 전화"
          status={status}
          onSelect={vi.fn()}
        />,
      );
      const item = screen.getByTestId("journey-map-phone-call-appointment-confirmation-phone-call");
      expect(item).toHaveAttribute("accessibility-element", "true");
      expect(item).toHaveAttribute("data-status", status);
      expect(item).toHaveAttribute("accessibility-traits", "button");
      expect(item).toHaveAttribute(
        "accessibility-label",
        status === "completed" ? "약속 확인 전화, 완료됨" : "약속 확인 전화",
      );
      expect(item).toHaveTextContent(
        status === "completed" ? "약속 확인 전화, 완료됨" : "약속 확인 전화",
      );
    },
  );

  it("탭할 때 전화 유닛 ID를 한 번 전달한다", () => {
    const onSelect = vi.fn();
    render(
      <PhoneCallMapItem
        id="appointment-confirmation-phone-call"
        title="약속 확인 전화"
        status="available"
        onSelect={onSelect}
      />,
    );
    fireEvent.tap(
      screen.getByTestId("journey-map-phone-call-appointment-confirmation-phone-call"),
      {},
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("appointment-confirmation-phone-call");
  });
});
