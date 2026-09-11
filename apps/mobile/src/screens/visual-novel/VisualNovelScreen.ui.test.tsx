import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { VisualNovelScreen } from "./VisualNovelScreen";
import { visualNovelStoryFor } from "./visual-novel";
import type { VisualNovelProgress, VisualNovelScreenProps } from "./visual-novel.contract";

const story = visualNovelStoryFor("cafe-arrival-visual-novel");
const props = (progress: VisualNovelProgress) => ({
  story,
  progress,
  onAdvance: vi.fn<VisualNovelScreenProps["onAdvance"]>(),
  onExit: vi.fn<VisualNovelScreenProps["onExit"]>(),
  onReplay: vi.fn<VisualNovelScreenProps["onReplay"]>(),
});

describe("VisualNovelScreen UI", () => {
  it("renders title, progress, first scene/dialogue, and advances one beat per explicit button", () => {
    const p = props({ status: "active", beatIndex: 0 });
    render(<VisualNovelScreen {...p} />);
    expect(screen.getByTestId("visual-novel-title")).toHaveTextContent("카페에 도착한 지민");
    expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("장면 1 / 3");
    expect(screen.getByTestId("visual-novel-scene-arrive")).toBeInTheDocument();
    expect(screen.getByTestId("visual-novel-scene-arrive")).toHaveAttribute(
      "data-replaying",
      "false",
    );
    expect(screen.getByTestId("visual-novel-dialogue-arrive")).toHaveTextContent(
      "여기가 우리가 만나기로 한 카페예요.",
    );
    fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
    expect(p.onAdvance).toHaveBeenCalledWith(
      "cafe-arrival-visual-novel",
      expect.objectContaining({ progressChanged: true, completedNow: false }),
    );
    expect(screen.queryByTestId("visual-novel-scene-arrive")).not.toBeInTheDocument();
  });

  it("selects the exact second beat from active progress", () => {
    render(<VisualNovelScreen {...props({ status: "active", beatIndex: 1 })} />);
    expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("장면 2 / 3");
    expect(screen.getByTestId("visual-novel-scene-find")).toBeInTheDocument();
    expect(screen.getByTestId("visual-novel-character-jimin-smile")).toBeInTheDocument();
    expect(screen.getByTestId("visual-novel-dialogue-find")).toHaveTextContent(
      "2번 출구 오른쪽이라 금방 찾았죠?",
    );
  });

  it("renders completed final beat with replay and exit actions", () => {
    const p = props({ status: "completed", beatIndex: 2 });
    render(<VisualNovelScreen {...p} />);
    expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("이야기 완료");
    expect(screen.getByTestId("visual-novel-scene-enter")).toBeInTheDocument();
    expect(screen.getByTestId("visual-novel-dialogue-enter")).toHaveTextContent(
      "그럼 들어가서 같이 주문해 봐요.",
    );
    expect(screen.getByTestId("visual-novel-replay-button")).toHaveAttribute(
      "accessibility-label",
      "처음부터 보기",
    );
    expect(screen.getByTestId("visual-novel-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
    expect(screen.getByTestId("visual-novel-exit-button")).toHaveAttribute(
      "accessibility-traits",
      "button",
    );
    expect(screen.getByTestId("visual-novel-exit-button")).toHaveAttribute(
      "accessibility-label",
      "맵으로",
    );
    fireEvent.tap(screen.getByTestId("visual-novel-replay-button"), {});
    expect(p.onReplay).toHaveBeenCalledWith("cafe-arrival-visual-novel");
    expect(screen.getByTestId("visual-novel-scene-arrive")).toHaveAttribute(
      "data-replaying",
      "true",
    );
    fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});
    expect(p.onExit).toHaveBeenCalled();
  });

  it("keeps the logical accessibility order independent of decorative scene images", () => {
    render(<VisualNovelScreen {...props({ status: "active", beatIndex: 0 })} />);
    const root = screen.getByTestId("visual-novel-screen");
    expect(root).toHaveClass("visual-novel-large-text-reflow");
    expect(root.querySelector(".visual-novel-header")).toHaveClass(
      "visual-novel-large-text-reflow",
    );
    const scene = screen.getByTestId("visual-novel-scene-arrive");
    const dialogue = screen.getByTestId("visual-novel-dialogue-arrive");
    expect(scene.parentElement).toHaveClass("visual-novel-scene-shell");
    expect(dialogue.parentElement).toBe(scene.parentElement);
    const order = [
      screen.getByTestId("visual-novel-title"),
      screen.getByTestId("visual-novel-progress"),
      screen.getByTestId("visual-novel-dialogue-arrive"),
      screen.getByTestId("visual-novel-advance-button"),
      screen.getByTestId("visual-novel-exit-button"),
    ];
    expect(order.every((node) => root.contains(node))).toBe(true);
    for (let i = 1; i < order.length; i += 1) {
      expect(
        order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });
});
