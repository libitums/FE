import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test, vi } from "vitest";

import { Dialog } from "./Dialog";

describe("Dialog", () => {
  test("Scrim, 제목, 설명과 두 action을 디자인 순서로 렌더한다", () => {
    render(
      <Dialog
        title="학습을 그만둘까요?"
        description="지금까지의 진행 내용이 사라져요"
        actions={[
          { id: "continue", label: "계속 학습하기" },
          { id: "quit", label: "그만두기" },
        ]}
        bindaction={() => undefined}
      />,
    );

    expect(screen.getByTestId("ui-lynx-dialog-scrim")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
    expect(screen.getByTestId("ui-lynx-dialog-scrim")).not.toHaveAttribute("bindtap");
    expect(screen.getByTestId("ui-lynx-dialog-container")).toHaveAttribute(
      "accessibility-role-description",
      "dialog",
    );
    expect(screen.getByTestId("ui-lynx-dialog-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
    expect(screen.getByTestId("ui-lynx-dialog-title")).toHaveTextContent("학습을 그만둘까요?");
    expect(screen.getByTestId("ui-lynx-dialog-description")).toHaveTextContent(
      "지금까지의 진행 내용이 사라져요",
    );
    const buttons = screen.getAllByTestId("ui-lynx-button");
    expect(buttons[0]).toHaveAttribute("data-variant", "neutral");
    expect(buttons[1]).toHaveAttribute("data-variant", "subtle");
    expect(buttons[0]).toHaveAttribute("data-size", "m");
    expect(buttons[1]).toHaveAttribute("data-width", "fill");
    expect(screen.getByTestId("ui-lynx-dialog")).toHaveAttribute("data-cancelactionid", "quit");
  });

  test("설명은 선택 사항이고 단일 action은 neutral이다", () => {
    render(
      <Dialog
        title="다시 시도할까요?"
        actions={[{ id: "retry", label: "다시 시도하기" }]}
        bindaction={() => undefined}
      />,
    );
    expect(screen.queryByTestId("ui-lynx-dialog-description")).not.toBeInTheDocument();
    expect(screen.getByTestId("ui-lynx-button")).toHaveAttribute("data-variant", "neutral");
  });

  test("활성 action은 id를 전달하고 disabled action은 전달하지 않는다", () => {
    const bindaction = vi.fn<(id: string) => void>();
    render(
      <Dialog
        title="학습을 그만둘까요?"
        actions={[
          { id: "continue", label: "계속 학습하기" },
          { id: "quit", label: "그만두기", disabled: true },
        ]}
        bindaction={bindaction}
      />,
    );

    const buttons = screen.getAllByTestId("ui-lynx-button");
    fireEvent.tap(buttons[0]!, {});
    fireEvent.tap(buttons[1]!, {});
    expect(bindaction).toHaveBeenCalledOnce();
    expect(bindaction).toHaveBeenCalledWith("continue");
    expect(buttons[1]).toHaveAttribute("accessibility-traits", "disabled");
  });

  test("reduced motion 상태를 노출한다", () => {
    render(
      <Dialog
        title="학습을 계속할까요?"
        actions={[{ id: "continue", label: "계속 학습하기" }]}
        motion="reduced"
        bindaction={() => undefined}
      />,
    );
    expect(screen.getByTestId("ui-lynx-dialog")).toHaveClass("ui-lynx-dialog-motion-reduced");
    expect(screen.getByTestId("ui-lynx-dialog")).toHaveAttribute("data-motion", "reduced");
  });
});
