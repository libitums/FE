import { describe, expect, test } from "vitest";

import { getOverlayContract } from "./index";

describe("Overlay contract", () => {
  test("Area 기본값은 blur off, dismiss none, 150ms용 standard visible 상태다", () => {
    expect(getOverlayContract({ scope: "area" })).toEqual({
      blur: "off",
      className:
        "ui-lynx-overlay ui-lynx-overlay-area ui-lynx-overlay-blur-off ui-lynx-overlay-motion-standard ui-lynx-overlay-phase-visible",
      dismiss: "none",
      interactive: false,
      motion: "standard",
      phase: "visible",
      scope: "area",
    });
  });

  test("Sheet tap dismiss와 blur/motion/phase를 명시적으로 파생한다", () => {
    const binddismiss = () => undefined;
    expect(
      getOverlayContract({
        scope: "screen",
        surface: "sheet",
        blur: "on",
        dismiss: "tap",
        binddismiss,
        motion: "reduced",
        phase: "exiting",
      }),
    ).toEqual({
      blur: "on",
      className:
        "ui-lynx-overlay ui-lynx-overlay-screen ui-lynx-overlay-sheet ui-lynx-overlay-blur-on ui-lynx-overlay-motion-reduced ui-lynx-overlay-phase-exiting",
      dismiss: "tap",
      interactive: true,
      motion: "reduced",
      phase: "exiting",
      scope: "screen",
      surface: "sheet",
    });
  });

  test("런타임 경계에서도 잘못된 dismiss 조합을 거부한다", () => {
    expect(() => getOverlayContract({ scope: "area", dismiss: "tap" } as never)).toThrow(
      "only available for screen scope",
    );
    expect(() =>
      getOverlayContract({ scope: "screen", surface: "dialog", dismiss: "tap" } as never),
    ).toThrow("only available for sheet surfaces");
    expect(() =>
      getOverlayContract({ scope: "screen", surface: "sheet", dismiss: "tap" } as never),
    ).toThrow("requires binddismiss");
  });
});
