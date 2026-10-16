import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test, vi } from "vitest";
import headset from "@libitums/icons/lynx/headset";
import lock from "@libitums/icons/lynx/lock";
import tick from "@libitums/icons/lynx/tick";

import { MotionProvider } from "../motion";
import { LearningUnit } from "./LearningUnit";

// `ui` 계층: 「확인 중」(checking) 유닛의 렌더와 상호작용. 색 픽셀은 단언하지 않습니다.

// 아이콘 content의 `currentColor`는 색으로 치환되므로, 원본을 그 자리에서 나눠 조각이 순서대로
// 들어 있는지로 같은 아이콘인지 봅니다.
function isIconContent(content: string, source: string): boolean {
  let from = 0;
  for (const piece of source.split("currentColor")) {
    const at = content.indexOf(piece, from);
    if (at < 0) return false;
    from = at + piece.length;
  }
  return true;
}

describe("LearningUnit checking", () => {
  test("LU-U1. disabled로 서고 이름이 loading으로 끝나며 탭을 전달하지 않는다", () => {
    const onTap = vi.fn<() => void>();
    render(
      <LearningUnit
        id="x"
        accessibilityLabel="Lesson 1"
        icon={headset}
        status="checking"
        bindtap={onTap}
      />,
    );

    const unit = screen.getByTestId("ui-lynx-learning-unit-x");
    expect(unit).toHaveAttribute("data-status", "checking");
    expect(unit).toHaveAttribute("accessibility-traits", "disabled");
    expect(unit.getAttribute("accessibility-label")?.endsWith(", loading")).toBe(true);
    fireEvent.tap(unit as unknown as Element, {});
    expect(onTap).not.toHaveBeenCalled();
  });

  test("LU-U2. reduced에서도 눌림 막이 없고 data-motion만 reduced다", () => {
    render(
      <MotionProvider motion="reduced">
        <LearningUnit id="x" accessibilityLabel="Lesson 1" icon={headset} status="checking" />
      </MotionProvider>,
    );

    expect(screen.queryByTestId("ui-lynx-learning-unit-x-shade")).not.toBeInTheDocument();
    expect(screen.getByTestId("ui-lynx-learning-unit-x")).toHaveAttribute("data-motion", "reduced");
  });

  test("LU-U3. 아이콘은 넘긴 유닛 아이콘이고 자물쇠도 체크도 아니다", () => {
    render(<LearningUnit id="x" accessibilityLabel="Lesson 1" icon={headset} status="checking" />);

    const content =
      screen.getByTestId("ui-lynx-learning-unit-x-icon").getAttribute("content") ?? "";
    expect(isIconContent(content, headset)).toBe(true);
    expect(isIconContent(content, lock)).toBe(false);
    expect(isIconContent(content, tick)).toBe(false);
  });

  test("LU-U4. checking에서 available로 바뀌어도 같은 노드이고 탭이 전달된다", () => {
    const onTap = vi.fn<() => void>();
    const element = (status: "checking" | "available") => (
      <LearningUnit
        id="x"
        accessibilityLabel="Lesson 1"
        icon={headset}
        status={status}
        bindtap={onTap}
      />
    );
    const { rerender } = render(element("checking"));
    const before = screen.getByTestId("ui-lynx-learning-unit-x");

    rerender(element("available"));

    const after = screen.getByTestId("ui-lynx-learning-unit-x");
    expect(after).toBe(before);
    expect(after).toHaveAttribute("data-status", "available");
    fireEvent.tap(after as unknown as Element, {});
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
