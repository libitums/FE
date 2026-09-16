import { describe, expect, test } from "vitest";

import { getFogContract } from "./fog.contract";

describe("Fog contract", () => {
  test("기본값은 M, 기본 표면, visible, LTR이다", () => {
    expect(getFogContract({ direction: "bottom" })).toEqual({
      className:
        "ui-lynx-fog ui-lynx-fog-bottom ui-lynx-fog-size-m ui-lynx-fog-color-surface-default ui-lynx-fog-visible ui-lynx-fog-ltr",
      color: "surface-default",
      direction: "bottom",
      layoutDirection: "ltr",
      size: "m",
      visibility: "visible",
    });
  });

  test("방향, 크기, 표면색, hidden 상태와 RTL을 독립적으로 조합한다", () => {
    expect(
      getFogContract({
        direction: "start",
        size: "full",
        color: "surface-floating",
        visibility: "hidden",
        layoutDirection: "rtl",
      }),
    ).toEqual({
      className:
        "ui-lynx-fog ui-lynx-fog-start ui-lynx-fog-size-full ui-lynx-fog-color-surface-floating ui-lynx-fog-hidden ui-lynx-fog-rtl",
      color: "surface-floating",
      direction: "start",
      layoutDirection: "rtl",
      size: "full",
      visibility: "hidden",
    });
  });

  test.each([
    [undefined, "Fog props must be an object"],
    [{}, "Fog direction must be top, bottom, start, or end"],
    [{ direction: "left" }, "Fog direction must be top, bottom, start, or end"],
  ] as const)("JS 소비자의 잘못된 필수 입력을 계약 오류로 거부한다: %j", (props, message) => {
    expect(() => getFogContract(props as never)).toThrow(message);
  });

  test.each([
    [{ direction: "bottom", size: "l" }, "Fog size must be s, m, or full"],
    [{ direction: "bottom", color: "transparent" }, "Fog color must match a supported surface"],
    [{ direction: "bottom", visibility: "collapsed" }, "Fog visibility must be hidden or visible"],
    [{ direction: "bottom", layoutDirection: "auto" }, "Fog layoutDirection must be ltr or rtl"],
  ] as const)("JS 소비자의 잘못된 옵션을 계약 오류로 거부한다: %j", (props, message) => {
    expect(() => getFogContract(props as never)).toThrow(message);
  });
});
