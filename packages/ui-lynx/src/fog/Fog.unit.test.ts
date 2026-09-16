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
});
