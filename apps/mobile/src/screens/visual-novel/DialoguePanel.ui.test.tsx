import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { DialoguePanel } from "./DialoguePanel";

describe("DialoguePanel UI", () => {
  it("renders one accessible speaker/dialogue unit and an explicit advance button", () => {
    const onSelect = vi.fn<() => void>();
    render(
      <DialoguePanel
        beatId="arrive"
        speakerName="지민"
        dialogue="여기가 우리가 만나기로 한 카페예요."
        action={{ kind: "advance", label: "다음", onSelect }}
      />,
    );
    const panel = screen.getByTestId("visual-novel-dialogue-arrive");
    const content = screen.getByTestId("visual-novel-dialogue-content-arrive");
    expect(content).toHaveAttribute("accessibility-element", "true");
    expect(content).toHaveAttribute(
      "accessibility-label",
      "지민, 여기가 우리가 만나기로 한 카페예요.",
    );
    expect(screen.getByText("지민")).toHaveAttribute("accessibility-element", "false");
    expect(screen.getByText("여기가 우리가 만나기로 한 카페예요.")).toHaveAttribute(
      "accessibility-element",
      "false",
    );
    expect(panel).not.toHaveAttribute("accessibility-element");
    expect(panel).toHaveTextContent("지민");
    expect(panel).toHaveTextContent("여기가 우리가 만나기로 한 카페예요.");
    const button = screen.getByTestId("visual-novel-advance-button");
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-traits", "button");
    expect(button).toHaveAttribute("accessibility-label", "다음");
    expect(panel).toHaveClass("visual-novel-dialogue");
    expect(content.tagName.toLowerCase()).toBe("scroll-view");
    expect(content).toHaveClass("visual-novel-dialogue-scroll");
    expect(content).toHaveAttribute("scroll-orientation", "vertical");
    expect(button.parentElement).toBe(panel);
    expect(button).toHaveClass("visual-novel-dialogue-action");
    expect(button.querySelector("text")).toHaveClass("visual-novel-dialogue-action-label");
    fireEvent.tap(button, {});
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("uses replay semantics for the completed beat and has no panel-wide advance target", () => {
    const onSelect = vi.fn<() => void>();
    render(
      <DialoguePanel
        beatId="enter"
        speakerName="지민"
        dialogue="그럼 들어가서 같이 주문해 봐요."
        action={{ kind: "replay", label: "처음부터 보기", onSelect }}
      />,
    );
    expect(screen.queryByTestId("visual-novel-advance-button")).not.toBeInTheDocument();
    const button = screen.getByTestId("visual-novel-replay-button");
    expect(button).toHaveAttribute("accessibility-label", "처음부터 보기");
    fireEvent.tap(button, {});
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
