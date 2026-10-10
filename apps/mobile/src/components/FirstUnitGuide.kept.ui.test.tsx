import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { FirstUnitGuide } from "./FirstUnitGuide";

// `ui` 계층: 기존 첫 단원 안내가 새 안내(learning-item-guides)와 합쳐지지 않고 그대로인가.
// 기존 안내는 배타 포커스를 쓰고, 클래스 · testid가 갈린다.

afterEach(cleanup);

test.each(["story", "messenger", "call"] as const)(
  "[FG1] %s: 내용 상자에 exclusive-focus가 있고, testid는 first-unit-guide-<step>이며, learning-item-guide 클래스가 없다",
  (step) => {
    render(<FirstUnitGuide step={step} onDismiss={vi.fn()} />);

    const root = screen.getByTestId(`first-unit-guide-${step}`);
    expect(root.getAttribute("class")?.split(/\s+/)).not.toContain("learning-item-guide");
    expect(root.querySelector('[accessibility-exclusive-focus="true"]')).not.toBeNull();
  },
);
