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
      const item = screen.getByTestId("journey-map-visual-novel-cafe-arrival-visual-novel");
      expect(item).toHaveAttribute("data-status", status);
      expect(item).toHaveAttribute("accessibility-element", "true");
      expect(item).toHaveAttribute("accessibility-traits", "button");
      expect(item).toHaveAttribute(
        "accessibility-label",
        status === "completed" ? "카페에 도착한 지민, 완료됨" : "카페에 도착한 지민",
      );
      expect(item).toHaveClass("visual-novel-map-item");
      const title = item.querySelector(".visual-novel-map-item-title");
      expect(title).toHaveClass("visual-novel-map-item-title");
      expect(title).toHaveClass("visual-novel-map-item-action-label");
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
    fireEvent.tap(screen.getByTestId("journey-map-visual-novel-cafe-arrival-visual-novel"), {});
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("cafe-arrival-visual-novel");
  });
});
