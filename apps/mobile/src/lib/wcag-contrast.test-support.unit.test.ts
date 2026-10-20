import { describe, expect, it } from "vitest";

import {
  compositeOver,
  contrastRatio,
  DARK_SURFACE_WORST,
  parseCssColor,
  tokenColorValue,
} from "./wcag-contrast.test-support";

describe("wcag-contrast.test-support", () => {
  it("[FDK0] 대비 도구가 알려진 값을 낸다", () => {
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5);
    expect(contrastRatio([0x76, 0x76, 0x76], [255, 255, 255])).toBeCloseTo(4.54, 2);
    const worst = DARK_SURFACE_WORST.map((channel) => Math.round(channel * 10) / 10);
    expect(worst).toEqual([48.9, 50.7, 54.3]);
    expect(parseCssColor("#35A66F")).toEqual({ rgb: [53, 166, 111], alpha: 1 });
    expect(parseCssColor("rgba(255, 255, 255, 0.16)")).toEqual({
      rgb: [255, 255, 255],
      alpha: 0.16,
    });
    expect(() => parseCssColor("red")).toThrow();
    expect(compositeOver({ rgb: [0, 0, 0], alpha: 0.5 }, [255, 255, 255])).toEqual([
      127.5, 127.5, 127.5,
    ]);
    expect(tokenColorValue("var(--libitum-color-gray-950)")).toBe("#1A1C20");
    expect(tokenColorValue("transparent")).toBe("transparent");
    expect(() => tokenColorValue("var(--libitum-color-nope-1)")).toThrow();
  });
});
