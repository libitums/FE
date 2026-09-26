import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { VisualNovelMapItem } from "./VisualNovelMapItem";

describe("VisualNovelMapItem UI", () => {
  it.each(["available", "completed"] as const)(
    "renders %s with stable status and button semantics",
    (status) => {
      render(
        <VisualNovelMapItem
          id="cafe-arrival-visual-novel"
          title="카페에 도착한 지민"
          status={status}
          onSelect={vi.fn<(id: "cafe-arrival-visual-novel") => void>()}
        />,
      );
      const item = screen.getByTestId("ui-lynx-learning-unit-cafe-arrival-visual-novel");
      expect(item).toHaveAttribute("data-status", status === "completed" ? "clear" : "available");
      expect(item).toHaveAttribute("accessibility-element", "true");
      expect(item).toHaveAttribute("accessibility-traits", "button");
      // 상태 접미사와 「이야기 연결」은 `LearningUnit`이 붙입니다(ADR-0016 D3).
      expect(item).toHaveAttribute(
        "accessibility-label",
        status === "completed"
          ? "카페에 도착한 지민, 완료됨, 이야기 연결"
          : "카페에 도착한 지민, 이야기 연결",
      );
      expect(screen.getByText("카페에 도착한 지민")).toBeInTheDocument();
    },
  );

  it("selects only this unit when tapped", () => {
    const onSelect = vi.fn<(id: "cafe-arrival-visual-novel") => void>();
    render(
      <VisualNovelMapItem
        id="cafe-arrival-visual-novel"
        title="카페에 도착한 지민"
        status="available"
        onSelect={onSelect}
      />,
    );
    fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-cafe-arrival-visual-novel"), {});
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("cafe-arrival-visual-novel");
  });
});
