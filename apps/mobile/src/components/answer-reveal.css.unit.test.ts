import { color, opacity } from "@libitums/design-tokens";
import { describe, expect, it } from "vitest";

import {
  compositeOver,
  contrastRatio,
  cssDeclaration,
  cssRuleBody,
  cssRuleIndex,
  DARK_SURFACE_WORST,
  parseCssColor,
  readCssWithoutComments,
  rgbaInValue,
  tokenColorAt,
  tokenColorValue,
} from "../lib/wcag-contrast.test-support";

// `unit` 계층: CSS 텍스트는 파일을 읽어 정규식으로 봅니다. unit 명령(`*.unit.test.ts`)으로 돌 뿐입니다.

const css = readCssWithoutComments("src/components/answer-reveal.css");
const darkFace = /\.answer-reveal-surface-dark/;
const darkText = /\.answer-reveal-surface-dark \.answer-reveal-text/;

describe("answer-reveal.css", () => {
  it("[ARC1] 어두운 면은 feedback-correct x opacity 16의 rgba이고 base 규칙 뒤에 선다", () => {
    const body = cssRuleBody(css, darkFace);
    expect(rgbaInValue(cssDeclaration(body, "background"))).toEqual(
      tokenColorAt(color.feedback.correct, opacity["16"]),
    );
    const baseIndex = cssRuleIndex(css, /\.answer-reveal/);
    expect(baseIndex).toBeGreaterThanOrEqual(0);
    expect(cssRuleIndex(css, darkFace)).toBeGreaterThan(baseIndex);
  });

  it("[ARC2] 어두운 면의 글자는 gray-50이다", () => {
    expect(cssDeclaration(cssRuleBody(css, darkText), "color")).toBe(
      "var(--libitum-color-gray-50)",
    );
  });

  it("[ARC3] light는 지금 값 그대로다", () => {
    expect(cssDeclaration(cssRuleBody(css, /\.answer-reveal/), "background")).toBe(
      "var(--libitum-color-feedback-correct-surface)",
    );
    expect(cssDeclaration(cssRuleBody(css, /\.answer-reveal-text/), "color")).toBe(
      "var(--libitum-color-feedback-correct-text)",
    );
  });

  it("[FDK2] 어두운 면 위 정답 표시 글자는 최악의 배경에서 4.5:1 이상이다", () => {
    const face = rgbaInValue(cssDeclaration(cssRuleBody(css, darkFace), "background")) ?? {
      rgb: [0, 0, 0],
      alpha: 0,
    };
    const inkValue = cssDeclaration(cssRuleBody(css, darkText), "color");
    expect(inkValue).toBeDefined();
    const ink = parseCssColor(tokenColorValue(inkValue ?? "#313336")).rgb;
    const under = compositeOver(face, DARK_SURFACE_WORST);
    expect(contrastRatio(ink, under)).toBeGreaterThanOrEqual(4.5);
  });
});
