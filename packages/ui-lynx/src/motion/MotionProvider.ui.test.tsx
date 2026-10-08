import { render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test } from "vitest";

import { MotionProvider, useMotion } from "./index";

function Probe() {
  return <view data-testid="probe" data-motion={useMotion()} />;
}

describe("MotionProvider UI", () => {
  test("MP1: Provider 없이 렌더하면 standard이고 던지지 않는다", () => {
    expect(() => render(<Probe />)).not.toThrow();
    expect(screen.getByTestId("probe")).toHaveAttribute("data-motion", "standard");
  });

  test("MP2: reduced Provider 아래에서 reduced를 읽는다", () => {
    render(
      <MotionProvider motion="reduced">
        <Probe />
      </MotionProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("data-motion", "reduced");
  });

  test("MP3: 중첩에서는 가까운 Provider가 이긴다", () => {
    render(
      <MotionProvider motion="reduced">
        <MotionProvider motion="standard">
          <Probe />
        </MotionProvider>
      </MotionProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("data-motion", "standard");
  });

  test("MP4: Provider는 DOM 요소를 만들지 않는다", () => {
    const { container } = render(
      <MotionProvider motion="reduced">
        <Probe />
      </MotionProvider>,
    );
    expect(screen.getByTestId("probe").parentElement).toBe(container);
    expect(container.children).toHaveLength(1);
  });
});
