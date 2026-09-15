import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test, vi } from "vitest";

import { BottomSheet } from "./BottomSheet";

describe("BottomSheet", () => {
  test("scrim, handle, header, description과 action을 렌더한다", () => {
    render(
      <BottomSheet
        overline="학습 도구"
        title="잠깐 쉬어 갈까요?"
        description="오디오를 다시 듣고 이어서 학습할 수 있어요"
        closeAccessibilityLabel="복습 시트 닫기"
        actions={[{ id: "replay", label: "오디오 다시 듣기" }]}
        ondismiss={() => undefined}
      />,
    );

    expect(screen.getByTestId("ui-lynx-bottom-sheet-scrim")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
    expect(screen.getByTestId("ui-lynx-bottom-sheet-handle")).toBeInTheDocument();
    expect(screen.getByTestId("ui-lynx-bottom-sheet-overline")).toHaveTextContent("학습 도구");
    expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent("잠깐 쉬어 갈까요?");
    expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
    expect(screen.getByTestId("ui-lynx-bottom-sheet-description")).toHaveTextContent(
      "오디오를 다시 듣고 이어서 학습할 수 있어요",
    );
    expect(screen.getByTestId("ui-lynx-bottom-sheet-action-replay")).toHaveTextContent(
      "오디오 다시 듣기",
    );
    expect(screen.getByTestId("ui-lynx-bottom-sheet-body")).not.toContainElement(
      screen.getByTestId("ui-lynx-bottom-sheet-actions"),
    );
  });

  test("scrim과 닫기 버튼이 dismiss reason을 전달한다", () => {
    const ondismiss = vi.fn<(reason: "scrim" | "close-button" | "drag") => void>();
    render(
      <BottomSheet title="복습" closeAccessibilityLabel="복습 시트 닫기" ondismiss={ondismiss} />,
    );

    fireEvent.tap(screen.getByTestId("ui-lynx-bottom-sheet-scrim"), {});
    fireEvent.tap(screen.getByTestId("ui-lynx-bottom-sheet-close"), {});

    expect(ondismiss).toHaveBeenNthCalledWith(1, "scrim");
    expect(ondismiss).toHaveBeenNthCalledWith(2, "close-button");
    expect(screen.getByTestId("ui-lynx-bottom-sheet-close")).toHaveAttribute(
      "accessibility-label",
      "복습 시트 닫기",
    );
    expect(screen.getByTestId("ui-lynx-bottom-sheet-close")).toHaveAttribute(
      "accessibility-traits",
      "button",
    );
  });

  test("sheet 내부 tap은 scrim dismiss로 전파되지 않는다", () => {
    const ondismiss = vi.fn<(reason: "scrim" | "close-button" | "drag") => void>();
    render(
      <BottomSheet title="복습" closeAccessibilityLabel="복습 시트 닫기" ondismiss={ondismiss} />,
    );

    fireEvent.tap(screen.getByTestId("ui-lynx-bottom-sheet-panel"), {});
    expect(ondismiss).not.toHaveBeenCalled();
  });

  test("action은 Button M/Fill로 렌더되고 자체 callback만 호출한다", () => {
    const bindtap = vi.fn<() => void>();
    const ondismiss = vi.fn<(reason: "scrim" | "close-button" | "drag") => void>();
    render(
      <BottomSheet
        title="복습"
        closeAccessibilityLabel="복습 시트 닫기"
        actions={[{ id: "start", label: "복습 시작하기", bindtap }]}
        ondismiss={ondismiss}
      />,
    );

    const action = screen.getByTestId("ui-lynx-button");
    expect(screen.getByTestId("ui-lynx-bottom-sheet-actions")).toContainElement(action);
    expect(action).toHaveAttribute("data-variant", "brand");
    expect(action).toHaveAttribute("data-size", "m");
    expect(action).toHaveAttribute("data-width", "fill");
    fireEvent.tap(action, {});
    expect(bindtap).toHaveBeenCalledTimes(1);
    expect(ondismiss).not.toHaveBeenCalled();
  });

  test("multiple action은 첫 번째를 brand, 두 번째부터 subtle로 렌더한다", () => {
    render(
      <BottomSheet
        title="복습"
        closeAccessibilityLabel="복습 시트 닫기"
        actions={[
          { id: "primary", label: "오디오 다시 듣기" },
          { id: "secondary", label: "문장 다시 보기" },
        ]}
        ondismiss={() => undefined}
      />,
    );

    const actions = screen.getAllByTestId("ui-lynx-button");
    expect(actions[0]).toHaveAttribute("data-variant", "brand");
    expect(actions[1]).toHaveAttribute("data-variant", "subtle");
  });

  test("draggable=false면 handle과 drag handler를 노출하지 않는다", () => {
    render(
      <BottomSheet
        title="복습"
        closeAccessibilityLabel="복습 시트 닫기"
        draggable={false}
        ondismiss={() => undefined}
      />,
    );
    expect(screen.queryByTestId("ui-lynx-bottom-sheet-handle")).not.toBeInTheDocument();
    expect(screen.getByTestId("ui-lynx-bottom-sheet-drag-area")).not.toHaveAttribute(
      "bindtouchstart",
    );
  });
});
