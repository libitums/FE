import { render, screen } from "@lynx-js/react/testing-library";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { Fog } from "./index";

describe("Fog UI", () => {
  test("장식 요소로 숨고 focus와 pointer 입력을 받지 않는다", () => {
    render(<Fog direction="bottom" />);
    const fog = screen.getByTestId("ui-lynx-fog");

    expect(fog.tagName.toLowerCase()).toBe("view");
    expect(fog).toHaveAttribute("data-direction", "bottom");
    expect(fog).toHaveAttribute("data-visibility", "visible");
    expect(fog).toHaveAttribute("accessibility-element", "false");
    expect(fog).toHaveAttribute("accessibility-elements-hidden", "true");
    expect(fog).toHaveAttribute("focusable", "false");
    expect(fog).toHaveAttribute("event-through", "true");
  });

  test("요청한 옵션을 class와 데이터 속성으로 노출한다", () => {
    render(
      <Fog
        direction="start"
        size="full"
        color="surface-floating"
        visibility="hidden"
        layoutDirection="rtl"
      />,
    );
    const fog = screen.getByTestId("ui-lynx-fog");

    expect(fog).toHaveClass("ui-lynx-fog-start");
    expect(fog).toHaveClass("ui-lynx-fog-size-full");
    expect(fog).toHaveClass("ui-lynx-fog-color-surface-floating");
    expect(fog).toHaveClass("ui-lynx-fog-hidden");
    expect(fog).toHaveClass("ui-lynx-fog-rtl");
    expect(fog).toHaveAttribute("data-layoutdirection", "rtl");
  });

  test("방향, 크기, 표면색, motion token 계약을 고정한다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/fog/fog.css"), "utf8");

    expect(styles).toMatch(
      /\.ui-lynx-fog\s*\{[^}]*position:\s*absolute[^}]*z-index:\s*var\(--libitum-elevation-z-default\)[^}]*transition:\s*opacity var\(--libitum-motion-duration-color\) var\(--libitum-motion-easing-easing\)/s,
    );
    expect(styles).toMatch(
      /\.ui-lynx-fog-top\s*\{[^}]*top:\s*0[^}]*background-image:\s*linear-gradient\(\s*to top,/s,
    );
    expect(styles).toMatch(
      /\.ui-lynx-fog-bottom\s*\{[^}]*bottom:\s*0[^}]*background-image:\s*linear-gradient\(\s*to bottom,/s,
    );
    expect(styles).toMatch(
      /\.ui-lynx-fog-start\.ui-lynx-fog-ltr[\s\S]*?\{[^}]*left:\s*0[^}]*background-image:\s*linear-gradient\(\s*to left,/s,
    );
    expect(styles).toMatch(
      /\.ui-lynx-fog-start\.ui-lynx-fog-rtl[\s\S]*?\{[^}]*right:\s*0[^}]*background-image:\s*linear-gradient\(\s*to right,/s,
    );
    expect(styles).not.toContain("inset-inline");
    expect(styles).toMatch(
      /\.ui-lynx-fog-(?:top|bottom)\.ui-lynx-fog-size-s\s*\{[^}]*height:\s*var\(--libitum-spacing-40\)/s,
    );
    expect(styles).toMatch(
      /\.ui-lynx-fog-(?:top|bottom)\.ui-lynx-fog-size-m\s*\{[^}]*height:\s*var\(--libitum-spacing-80\)/s,
    );
    expect(styles).toMatch(
      /\.ui-lynx-fog-(?:start|end)\.ui-lynx-fog-size-full\s*\{[^}]*width:\s*100%/s,
    );
    expect(styles).toMatch(
      /\.ui-lynx-fog-color-white\s*\{[^}]*--libitum-ui-lynx-fog-transparent:\s*rgba\(255, 255, 255, 0\)[^}]*--libitum-ui-lynx-fog-opaque:\s*rgba\(255, 255, 255, 1\)/s,
    );
    expect(styles).toMatch(
      /\.ui-lynx-fog-color-surface-default\s*\{[^}]*--libitum-ui-lynx-fog-transparent:\s*rgba\(255, 253, 252, 0\)[^}]*--libitum-ui-lynx-fog-opaque:\s*rgba\(255, 253, 252, 1\)/s,
    );
    // 값이 또 `var()`인 커스텀 프로퍼티는 ReactLynx 번들에서 선언째 버려집니다. 이 단언이
    // 빨개지면 Fog가 앱에서 안 보이던 그 상태로 되돌아간 것입니다.
    expect(styles).not.toMatch(/--libitum-ui-lynx-fog-[a-z-]+:\s*var\(/);
    expect(styles).toMatch(/\.ui-lynx-fog-hidden\s*\{[^}]*opacity:\s*0/s);
    expect(styles).toMatch(/\.ui-lynx-fog-visible\s*\{[^}]*opacity:\s*1/s);
  });
});
