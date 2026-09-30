import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { VisualNovelScreen } from "./VisualNovelScreen";
import { visualNovelStoryFor } from "./visual-novel";
import type { VisualNovelProgress, VisualNovelScreenProps } from "./visual-novel.contract";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

const story = visualNovelStoryFor("cafe-arrival-visual-novel");
const props = (progress: VisualNovelProgress) => ({
  story,
  progress,
  onAdvance: vi.fn<VisualNovelScreenProps["onAdvance"]>(),
  onExit: vi.fn<VisualNovelScreenProps["onExit"]>(),
  onFinish: vi.fn<VisualNovelScreenProps["onFinish"]>(),
});

describe("VisualNovelScreen UI", () => {
  it("renders title, progress, first scene/dialogue, and advances one beat per explicit button", () => {
    const p = props({ status: "active", beatIndex: 0 });
    render(<VisualNovelScreen {...p} />);
    expect(screen.getByTestId("visual-novel-title")).toHaveTextContent("Our Imagined Café");
    expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("Scene 1 / 3");
    expect(screen.getByTestId("visual-novel-scene-arrive")).toBeInTheDocument();
    expect(screen.getByTestId("visual-novel-scene-arrive")).toHaveAttribute(
      "data-replaying",
      "false",
    );
    expect(screen.getByTestId("visual-novel-dialogue-arrive")).toHaveTextContent("안녕하세요");
    fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-speaker")).toHaveTextContent("Me");
    expect(p.onAdvance).not.toHaveBeenCalled();
    fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
    expect(p.onAdvance).toHaveBeenCalledWith(
      "cafe-arrival-visual-novel",
      expect.objectContaining({ progressChanged: true, completedNow: false }),
    );
    expect(screen.queryByTestId("visual-novel-scene-arrive")).not.toBeInTheDocument();
  });

  it("selects the exact second beat from active progress", () => {
    render(<VisualNovelScreen {...props({ status: "active", beatIndex: 1 })} />);
    expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent("Scene 2 / 3");
    expect(screen.getByTestId("visual-novel-scene-find")).toBeInTheDocument();
    expect(screen.getByTestId("visual-novel-character-jimin-smile")).toBeInTheDocument();
    expect(screen.getByTestId("visual-novel-dialogue-find")).toHaveTextContent("뭐 마실래요?");
  });

  it("completed reentry starts the first scene and finishes only after the learner's final response", () => {
    const p = props({ status: "completed", beatIndex: 2 });
    render(<VisualNovelScreen {...p} />);
    expect(screen.getByTestId("visual-novel-scene-arrive")).toBeInTheDocument();
    expect(screen.queryByText("Start over")).toBeNull();
    for (let i = 0; i < 5; i++)
      fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
    expect(screen.getByTestId("visual-novel-dialogue-enter")).toHaveTextContent("고마워요!");
    expect(p.onFinish).not.toHaveBeenCalled();
    expect(screen.getByTestId("visual-novel-finish-button")).toHaveAttribute(
      "accessibility-label",
      "Continue",
    );
    fireEvent.tap(screen.getByTestId("visual-novel-finish-button"), {});
    expect(p.onFinish).toHaveBeenCalledWith("cafe-arrival-visual-novel");
    expect(p.onAdvance).toHaveBeenLastCalledWith(
      "cafe-arrival-visual-novel",
      expect.objectContaining({ completedNow: false }),
    );
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
    expect(root.contains(scene)).toBe(true);
    expect(dialogue.parentElement).toHaveClass("visual-novel-scene-shell");
    const order = [
      screen.getByTestId("visual-novel-exit-button"),
      screen.getByTestId("visual-novel-title"),
      screen.getByTestId("visual-novel-progress"),
      screen.getByTestId("visual-novel-dialogue-arrive"),
      screen.getByTestId("visual-novel-advance-button"),
    ];
    expect(order.every((node) => root.contains(node))).toBe(true);
    for (let i = 1; i < order.length; i += 1) {
      expect(
        order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });
});

describe("[ST8-M] 비주얼 노벨 문구는 표에서 읽는다", () => {
  it("진행 · 다음 · 나가기", () => {
    render(
      <UiCopyContext.Provider value={markedUiCopy}>
        <VisualNovelScreen {...props({ status: "active", beatIndex: 0 })} />
      </UiCopyContext.Provider>,
    );

    expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent(
      "⟦visualNovel.sceneProgress⟧(1, 3)",
    );
    expect(screen.getByTestId("visual-novel-advance-button")).toHaveAttribute(
      "accessibility-label",
      "⟦common.next⟧",
    );
    expect(screen.getByTestId("visual-novel-exit-button")).toHaveAttribute(
      "accessibility-label",
      "⟦common.exitTo.journey⟧",
    );
  });

  it("마지막 내 대사 뒤 Continue 문구를 표에서 읽는다", () => {
    render(
      <UiCopyContext.Provider value={markedUiCopy}>
        <VisualNovelScreen {...props({ status: "active", beatIndex: 0 })} />
      </UiCopyContext.Provider>,
    );
    for (let i = 0; i < 5; i++)
      fireEvent.tap(screen.getByTestId("visual-novel-advance-button"), {});
    expect(screen.getByTestId("visual-novel-progress")).toHaveTextContent(
      "⟦visualNovel.sceneProgress⟧(3, 3)",
    );
    expect(screen.getByTestId("visual-novel-finish-button")).toHaveAttribute(
      "accessibility-label",
      "⟦common.continue⟧",
    );
  });
});
