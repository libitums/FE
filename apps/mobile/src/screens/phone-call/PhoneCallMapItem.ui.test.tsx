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
      const item = screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation-phone-call");
      expect(item).toHaveAttribute("accessibility-element", "true");
      expect(item).toHaveAttribute("data-status", status === "completed" ? "clear" : "available");
      expect(item).toHaveAttribute("accessibility-traits", "button");
      // 상태 접미사와 「이야기 연결」은 `LearningUnit`이 붙입니다(ADR-0016 D3).
      expect(item).toHaveAttribute(
        "accessibility-label",
        status === "completed"
          ? "약속 확인 전화, 완료됨, 이야기 연결"
          : "약속 확인 전화, 이야기 연결",
      );
      expect(screen.getByText("약속 확인 전화")).toBeInTheDocument();
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
      screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation-phone-call"),
      {},
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("appointment-confirmation-phone-call");
  });
});
