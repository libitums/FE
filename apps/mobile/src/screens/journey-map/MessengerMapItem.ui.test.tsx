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
      const item = screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation");
      // 표식은 `LearningUnit`이 그리므로 유닛 어휘입니다 — `completed`가 `clear`,
      // 아직 하지 않은 것이 `available`입니다. 잠김(`default`)은 쓰지 않습니다.
      expect(item).toHaveAttribute("data-status", status === "completed" ? "clear" : "available");
      expect(item).toHaveAttribute("accessibility-traits", "button");
      // 상태 접미사도 `LearningUnit`이 붙입니다(ADR-0016 D3). 이 유닛은 이야기에 걸린
      // 갈래라 「이야기 연결」이 뒤따릅니다.
      expect(item).toHaveAttribute(
        "accessibility-label",
        status === "completed"
          ? "약속 확인 메시지, 완료됨, 이야기 연결"
          : "약속 확인 메시지, 이야기 연결",
      );
      expect(screen.getByText("약속 확인 메시지")).toBeInTheDocument();
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
    fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
    expect(onSelect).toHaveBeenCalledWith("appointment-confirmation");
  });
});
