import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { lightStatusBarIcons } from "../lib/status-bar-icons";
import { FirstUnitGuide } from "./FirstUnitGuide";

// `ui` 계층: 첫 단원 안내는 어느 바탕 위에서도 밝은 아이콘을 요구합니다 — 표지는 안내
// 루트에 하나이고 안의 `Overlay`에는 없습니다(계약 r02.2).

afterEach(cleanup);

const markers = () =>
  Array.from(document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`));

test.each(["story", "messenger", "call"] as const)(
  "UT9: %s 안내의 루트에 표지가 하나 선다",
  (step) => {
    render(<FirstUnitGuide step={step} onDismiss={vi.fn()} />);

    expect(markers()).toHaveLength(1);
    expect(markers()[0]).toBe(screen.getByTestId(`first-unit-guide-${step}`));
  },
);
