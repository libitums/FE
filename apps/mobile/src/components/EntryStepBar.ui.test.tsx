import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { EntryStepBar } from "./EntryStepBar";

// `ui` 계층: 가입 직후 세 화면의 진행 막대 — 칸 수 · 채운 칸 · 하나로 읽히는 이름만 봅니다.

afterEach(() => cleanup());

const segments = () =>
  Array.from(
    screen.getByTestId("entry-step-bar").querySelectorAll('[class*="entry-step-bar-segment"]'),
  );

describe("EntryStepBar", () => {
  it.each([1, 2, 3])("SB1. %i/3 — 칸 셋 가운데 앞에서부터 그만큼 채운다", (current) => {
    render(<EntryStepBar current={current} total={3} />);

    const done = segments().map((segment) =>
      segment.getAttribute("class")?.includes("entry-step-bar-segment-done"),
    );
    expect(done).toEqual([0, 1, 2].map((index) => index < current));
  });

  it("SB2. 막대 전체가 「Step n of total」 하나로 읽힌다", () => {
    render(<EntryStepBar current={2} total={3} />);

    const bar = screen.getByTestId("entry-step-bar");
    expect(bar).toHaveAttribute("accessibility-element", "true");
    expect(bar).toHaveAttribute("accessibility-label", "Step 2 of 3");
  });
});
