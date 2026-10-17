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
          title="A Message from Minseo"
          status={status}
          onSelect={vi.fn()}
        />,
      );
      const item = screen.getByTestId("ui-lynx-special-unit-appointment-confirmation");
      // 표식은 `SpecialUnit`이 그리므로 유닛 어휘입니다 — `completed`가 `clear`,
      // 아직 하지 않은 것이 `available`입니다. 잠김(`default`)은 쓰지 않습니다.
      expect(item).toHaveAttribute("data-status", status === "completed" ? "clear" : "available");
      expect(item).toHaveAttribute("accessibility-traits", "button");
      // `special, ` 접두는 맵 문구표가, 상태 접미사는 `SpecialUnit`이 붙입니다(ADR-0016 D3).
      expect(item).toHaveAttribute(
        "accessibility-label",
        status === "completed"
          ? "special, A Message from Minseo, completed"
          : "special, A Message from Minseo",
      );
      expect(screen.getByText("A Message from Minseo")).toBeInTheDocument();
    },
  );

  it("선택 시 특별 유닛 ID를 올린다", () => {
    const onSelect = vi.fn();
    render(
      <MessengerMapItem
        id="appointment-confirmation"
        title="A Message from Minseo"
        status="available"
        onSelect={onSelect}
      />,
    );
    fireEvent.tap(screen.getByTestId("ui-lynx-special-unit-appointment-confirmation"), {});
    expect(onSelect).toHaveBeenCalledWith("appointment-confirmation");
  });
});
