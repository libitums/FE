import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test, vi } from "vitest";
import headset from "@libitums/icons/lynx/headset";

import { LearningUnit } from "./LearningUnit";

describe("LearningUnit", () => {
  test("Default는 하나의 비활성 접근성 node이며 탭을 전달하지 않는다", () => {
    const onTap = vi.fn<() => void>();
    render(<LearningUnit accessibilityLabel="쇼핑 표현 듣기" icon={headset} bindtap={onTap} />);
    const unit = screen.getByTestId("ui-lynx-learning-unit");
    expect(unit).toHaveAttribute("accessibility-label", "쇼핑 표현 듣기");
    expect(unit).toHaveAttribute("accessibility-traits", "disabled");
    expect(unit).toHaveAttribute("focusable", "false");
    expect(unit).not.toHaveAttribute("accessibility-value");
    fireEvent.tap(unit as unknown as Element, {});
    expect(onTap).not.toHaveBeenCalled();
  });

  test("Active는 학습 아이콘을 표시하고 현재 항목 상태와 탭을 전달한다", () => {
    const onTap = vi.fn<() => void>();
    render(
      <LearningUnit
        accessibilityLabel="발음 연습"
        icon={headset}
        status="active"
        focused
        bindtap={onTap}
      />,
    );
    const unit = screen.getByTestId("ui-lynx-learning-unit");
    expect(unit).toHaveAttribute("accessibility-traits", "button");
    expect(unit).toHaveAttribute("accessibility-value", "현재 항목");
    expect(unit).toHaveAttribute("focusable", "true");
    expect(unit).toHaveAttribute("data-focused", "true");
    expect(unit.className).toContain("ui-lynx-learning-unit-focused");
    fireEvent.tap(unit as unknown as Element, {});
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  test("Narrative 배지는 별도 control 없이 이름에만 이야기 연결을 추가한다", () => {
    render(
      <LearningUnit
        accessibilityLabel="문화 이야기"
        icon={headset}
        status="clear"
        narrative="narrative"
      />,
    );
    expect(screen.getByTestId("ui-lynx-learning-unit")).toHaveAttribute(
      "accessibility-label",
      "문화 이야기, 이야기 연결",
    );
    expect(screen.getByTestId("ui-lynx-learning-unit-badge")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
  });
});
