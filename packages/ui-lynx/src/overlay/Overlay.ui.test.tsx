import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test, vi } from "vitest";

import { Overlay } from "./index";

describe("Overlay UI", () => {
  test("Area는 부모 영역을 채우며 장식 요소로 숨고 target event를 관통하지 않는다", () => {
    render(<Overlay scope="area" />);
    const overlay = screen.getByTestId("ui-lynx-overlay");

    expect(overlay.tagName.toLowerCase()).toBe("view");
    expect(overlay).toHaveAttribute("data-scope", "area");
    expect(overlay).toHaveAttribute("accessibility-element", "false");
    expect(overlay).toHaveAttribute("accessibility-elements-hidden", "true");
    expect(overlay).toHaveAttribute("focusable", "false");
    expect(overlay).toHaveAttribute("event-through", "false");
    expect(overlay).not.toHaveAttribute("bindtap");
  });

  test("Blur On은 4px blur-view를 사용한다", () => {
    render(<Overlay scope="area" blur="on" />);
    const overlay = screen.getByTestId("ui-lynx-overlay");

    expect(overlay.tagName.toLowerCase()).toBe("blur-view");
    expect(overlay).toHaveAttribute("blur-radius", "4px");
  });

  test("Screen Sheet Tap은 dim tap마다 dismiss를 한 번 전달한다", () => {
    const binddismiss = vi.fn<() => void>();
    render(<Overlay scope="screen" surface="sheet" dismiss="tap" binddismiss={binddismiss} />);

    fireEvent.tap(screen.getByTestId("ui-lynx-overlay"));
    fireEvent.tap(screen.getByTestId("ui-lynx-overlay"));
    expect(binddismiss).toHaveBeenCalledTimes(2);
  });

  test("Dialog None은 tap handler를 연결하지 않는다", () => {
    render(<Overlay scope="screen" surface="dialog" dismiss="none" />);
    expect(screen.getByTestId("ui-lynx-overlay")).not.toHaveAttribute("bindtap");
  });

  test("진입과 퇴장 phase에서만 motion 종료를 전달한다", () => {
    const bindmotionend = vi.fn<() => void>();
    const { rerender } = render(
      <Overlay scope="area" phase="entering" bindmotionend={bindmotionend} />,
    );
    fireEvent.animationend(screen.getByTestId("ui-lynx-overlay"));
    expect(bindmotionend).toHaveBeenCalledTimes(1);

    rerender(<Overlay scope="area" phase="visible" bindmotionend={bindmotionend} />);
    expect(screen.getByTestId("ui-lynx-overlay")).not.toHaveAttribute("bindanimationend");
  });

  test("원본 dim, scope z-index와 motion token 계약을 고정한다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/overlay/overlay.css"), "utf8");
    expect(styles).toMatch(/background-color:\s*rgba\(26, 28, 32, 0\.45\)/);
    expect(styles).toMatch(/\.ui-lynx-overlay-screen\s*\{[^}]*position:\s*fixed/s);
    expect(styles).toMatch(/\.ui-lynx-overlay-area\s*\{[^}]*position:\s*absolute/s);
    expect(styles).toMatch(
      /\.ui-lynx-overlay-sheet\s*\{[^}]*z-index:\s*var\(--libitum-elevation-z-sheet\)/s,
    );
    expect(styles).toMatch(
      /\.ui-lynx-overlay-dialog\s*\{[^}]*z-index:\s*var\(--libitum-elevation-z-dialog\)/s,
    );
    expect(styles).toMatch(
      /\.ui-lynx-overlay-area\.ui-lynx-overlay-motion-standard\s*\{[^}]*animation-duration:\s*var\(--libitum-motion-duration-color\)/s,
    );
    expect(styles).toMatch(
      /\.ui-lynx-overlay-sheet\.ui-lynx-overlay-motion-standard\s*\{[^}]*animation-duration:\s*var\(--libitum-motion-duration-sheet\)/s,
    );
    expect(styles).toMatch(
      /\.ui-lynx-overlay-dialog\.ui-lynx-overlay-motion-standard\s*\{[^}]*animation-duration:\s*var\(--libitum-motion-duration-dialog\)/s,
    );
    expect(styles).toMatch(
      /\.ui-lynx-overlay-motion-reduced\s*\{[^}]*animation-duration:\s*var\(--libitum-motion-duration-d2\)[^}]*animation-timing-function:\s*var\(--libitum-motion-easing-linear\)/s,
    );
  });
});
