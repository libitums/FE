import { describe, expect, it } from "vitest";

import {
  cssDeclaration,
  cssRuleBody,
  cssRuleIndex,
  readCssWithoutComments,
} from "../lib/wcag-contrast.test-support";

// `unit` 계층: CSS 텍스트는 파일을 읽어 정규식으로 봅니다. unit 명령(`*.unit.test.ts`)으로 돌 뿐입니다.

const css = readCssWithoutComments("src/components/answer-reveal.css");

describe("answer-reveal.css", () => {
  it("[ARC1] 어두운 면 변형이 없다", () => {
    expect(css).not.toMatch(/answer-reveal-surface-dark/);
    expect(cssRuleIndex(css, /\.answer-reveal-surface-dark/)).toBe(-1);
  });

  it("[ARC3] 상자는 불투명 정답 면, 글자는 정답 글자색이다", () => {
    expect(cssDeclaration(cssRuleBody(css, /\.answer-reveal/), "background")).toBe(
      "var(--libitum-color-feedback-correct-surface)",
    );
    expect(cssDeclaration(cssRuleBody(css, /\.answer-reveal-text/), "color")).toBe(
      "var(--libitum-color-feedback-correct-text)",
    );
  });

  it("[ARC4] 머리 줄은 정답 글자색 label-m이다", () => {
    const body = cssRuleBody(css, /\.answer-reveal-label/);

    expect(cssDeclaration(body, "color")).toBe("var(--libitum-color-feedback-correct-text)");
    expect(cssDeclaration(body, "font-size")).toBe("var(--libitum-typography-label-m-font-size)");
  });
});
