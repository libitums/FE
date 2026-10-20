import { color, opacity } from "@libitums/design-tokens";
import { describe, expect, it } from "vitest";

import {
  compositeOver,
  contrastRatio,
  cssDeclaration,
  cssRuleBody,
  DARK_SURFACE_WORST,
  parseCssColor,
  readCssWithoutComments,
  rgbaInValue,
  tokenColorAt,
  tokenColorValue,
} from "../../lib/wcag-contrast.test-support";

// `unit` 계층: CSS 텍스트는 파일을 읽어 정규식으로 봅니다. unit 명령(`*.unit.test.ts`)으로 돌 뿐입니다.

const css = readCssWithoutComments("src/screens/catalog-final/catalog-final-screen.css");
const body = (selector: RegExp): string => cssRuleBody(css, selector);
const declaration = (selector: RegExp, property: string): string | undefined =>
  cssDeclaration(body(selector), property);

const panel = /\.catalog-final-screen-panel/;
const instruction = /\.catalog-final-screen-instruction/;
const hint = /\.catalog-final-screen-hint/;
const reply = /\.catalog-final-screen-reply/;
const translation = /\.catalog-final-screen-line \.ui-lynx-visual-novel-dialog-translation/;

describe("catalog-final-screen.css", () => {
  it("[CFC1] 판 면은 gray-950 x opacity.surface의 rgba이고 그림자 · 단축 background가 없다", () => {
    expect(rgbaInValue(declaration(panel, "background-color"))).toEqual(
      tokenColorAt(color.gray["950"], opacity.surface),
    );
    expect(body(panel)).not.toMatch(/box-shadow/);
    expect(body(panel)).not.toMatch(/(?:^|[\s;])background\s*:/);
  });

  it("[CFC2] 판의 모서리 · 여백 · 간격은 그대로다", () => {
    expect(declaration(panel, "border-top-left-radius")).toBe("var(--libitum-radius-xl)");
    expect(declaration(panel, "border-top-right-radius")).toBe("var(--libitum-radius-xl)");
    expect(declaration(panel, "padding-top")).toBe("var(--libitum-spacing-16)");
    expect(declaration(panel, "padding-left")).toBe("var(--libitum-spacing-16)");
    expect(declaration(panel, "padding-right")).toBe("var(--libitum-spacing-16)");
    expect(declaration(panel, "padding-bottom")).toBe(
      "var(--libitum-layout-screen-padding-bottom)",
    );
    expect(declaration(panel, "gap")).toBe("var(--libitum-spacing-12)");
  });

  it("[CFC3] 지시문은 gray-400 · 힌트는 gray-600이다", () => {
    expect(declaration(instruction, "color")).toBe("var(--libitum-color-gray-400)");
    expect(declaration(hint, "color")).toBe("var(--libitum-color-gray-600)");
  });

  it("[CFC4] 대답 줄 위아래 선은 흰 x opacity 16의 rgba다", () => {
    const expected = tokenColorAt(color.white, opacity["16"]);
    for (const side of ["top", "bottom"]) {
      const shorthand = rgbaInValue(declaration(reply, `border-${side}`));
      const split = rgbaInValue(declaration(reply, `border-${side}-color`));
      expect(shorthand ?? split).toEqual(expected);
    }
  });

  it("[CFC5] 상대 대사 번역 줄은 gray-600으로 덮어쓴다", () => {
    expect(declaration(translation, "color")).toBe("var(--libitum-color-gray-600)");
  });

  it("[CFC6] 머리 · 명암 · 바탕 · 판 스크롤 · 버튼 자리는 그대로다", () => {
    expect(
      declaration(/\.catalog-final-screen-backdrop,\s*\.catalog-final-screen-scene/, "top"),
    ).toBe("0");
    expect(declaration(/\.catalog-final-screen-backdrop/, "background-color")).toBe(
      "var(--libitum-color-gray-950)",
    );
    expect(declaration(/\.catalog-final-screen-shade/, "background-image")).toBe(
      "linear-gradient(to bottom, var(--libitum-color-gray-950), transparent)",
    );
    expect(declaration(/\.catalog-final-screen-panel-scroll/, "max-height")).toBe("50vh");
    expect(declaration(/\.catalog-final-screen-action/, "min-height")).toBe(
      "calc(var(--libitum-spacing-48) + var(--libitum-spacing-8))",
    );
  });

  it("[FDK4] 판 면은 흰 위에서 W와 같고, 지시문 · 힌트 · 번역 줄은 W에서 4.5:1 이상이다", () => {
    const face = rgbaInValue(declaration(panel, "background-color")) ?? {
      rgb: [255, 255, 255],
      alpha: 1,
    };
    const composed = compositeOver(face, [255, 255, 255]);
    DARK_SURFACE_WORST.forEach((channel, index) => {
      expect(composed[index]).toBeCloseTo(channel, 5);
    });

    for (const selector of [instruction, hint, translation]) {
      const value = declaration(selector, "color");
      expect(value).toBeDefined();
      const ink = parseCssColor(tokenColorValue(value ?? "#313336")).rgb;
      expect(contrastRatio(ink, DARK_SURFACE_WORST)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
