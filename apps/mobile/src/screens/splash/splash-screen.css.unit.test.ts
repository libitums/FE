import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { color, opacity, typography } from "@libitums/design-tokens";
import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  cssDeclaration,
  cssRuleBody,
  cssRuleIndex,
  parseCssColor,
  readCssWithoutComments,
  rgbaInValue,
  tokenColorAt,
} from "../../lib/wcag-contrast.test-support";

// `unit` 계층: CSS 텍스트는 파일을 읽어 정규식으로 봅니다. unit 명령(`*.unit.test.ts`)으로 돌 뿐입니다.
// 규칙이 없으면 본문이 비어 값 불일치로 실패합니다.

const css = readCssWithoutComments("src/screens/splash/splash-screen.css");
const body = (selector: RegExp): string => cssRuleBody(css, selector);
const declaration = (selector: RegExp, property: string): string | undefined =>
  cssDeclaration(body(selector), property);

const screen = /\.splash-screen/;
const mark = /\.splash-screen-mark/;
const logo = /\.splash-screen-logo/;
const update = /\.splash-update/;
const content = /\.splash-update-content/;
const track = /\.splash-update-track/;
const fill = /\.splash-update-fill/;
const label = /\.splash-update-label/;
const reducedFill = /\.splash-update-motion-reduced \.splash-update-fill/;

describe("splash-screen.css", () => {
  it("[SCSS1] 로고 상자는 상대 위치에 폭 70 %이고 로고는 상자 폭 가득 · 원본 비율이다", () => {
    expect(declaration(mark, "position")).toBe("relative");
    expect(declaration(mark, "width")).toBe("70%");
    expect(declaration(logo, "width")).toBe("100%");
    expect(declaration(logo, "aspect-ratio")).toBe("1142 / 523");
  });

  it("[SCSS2] 게이지는 로고 상자 아래 겹침 자리라 흐름 밖이고 위 여백이 spacing-24다", () => {
    expect(declaration(update, "position")).toBe("absolute");
    expect(declaration(update, "top")).toBe("100%");
    expect(declaration(update, "left")).toBe("0");
    expect(declaration(update, "right")).toBe("0");
    expect(declaration(update, "margin-top")).toBe("var(--libitum-spacing-24)");
    expect(body(update)).not.toMatch(/(?:^|[\s;])margin\s*:/);
  });

  it("[SCSS3] 트랙은 폭 160px · 높이 spacing-4 · 완전 둥근 모서리이고 배경은 흰색 x opacity-35 rgba다", () => {
    expect(declaration(track, "width")).toBe("160px");
    expect(declaration(track, "height")).toBe("var(--libitum-spacing-4)");
    expect(declaration(track, "border-radius")).toBe("var(--libitum-radius-full)");
    expect(rgbaInValue(declaration(track, "background-color"))).toEqual(
      tokenColorAt(color.white, opacity["35"]),
    );
  });

  it("[SCSS4] 채움은 흰색이고 폭 전환이 진행 막대 토큰이며 동작 줄이기에서는 전환이 없다", () => {
    expect(declaration(fill, "background-color")).toBe("var(--libitum-color-white)");
    expect(declaration(fill, "transition")).toBe(
      "width var(--libitum-motion-duration-progress) var(--libitum-motion-easing-enter)",
    );
    expect(declaration(reducedFill, "transition")).toBe("none");
  });

  it("[SCSS5] 글은 15px 굵은 흰색이고 글꼴 · 굵기 · 자간 · 줄 높이는 label-l이며, 대비 3.0:1 하한과 예외 근거 주석이 있다", () => {
    expect(declaration(label, "font-size")).toBe("15px");
    expect(declaration(label, "font-family")).toBe("var(--libitum-typography-label-l-font-family)");
    expect(declaration(label, "font-weight")).toBe("var(--libitum-typography-label-l-font-weight)");
    expect(declaration(label, "letter-spacing")).toBe(
      "var(--libitum-typography-label-l-letter-spacing)",
    );
    expect(declaration(label, "line-height")).toBe("var(--libitum-typography-label-l-line-height)");
    expect(declaration(label, "color")).toBe("var(--libitum-color-white)");
    expect(declaration(label, "margin-top")).toBe("var(--libitum-spacing-12)");

    expect(typography.label.l.fontWeight).toBeGreaterThanOrEqual(700);
    expect(
      contrastRatio(parseCssColor(color.white).rgb, parseCssColor(color.brand.primary).rgb),
    ).toBeGreaterThanOrEqual(3.0);

    const rawCss = readFileSync(
      resolve(process.cwd(), "src/screens/splash/splash-screen.css"),
      "utf8",
    );
    expect(rawCss).toMatch(
      /\/\*(?:(?!\*\/)[\s\S])*ADR-0078(?:(?!\*\/)[\s\S])*\*\/\s*\.splash-update-label\s*\{/,
    );
  });

  it("[SCSS6] 규칙 순서가 base 뒤 변형이고 새 규칙의 리터럴 px은 160px · 15px 둘뿐이다", () => {
    const order = [screen, mark, logo, update, content, track, fill, label, reducedFill].map(
      (selector) => cssRuleIndex(css, selector),
    );

    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    const fromUpdate = css.slice(Math.max(0, cssRuleIndex(css, update)));
    const literalPx = fromUpdate.match(/(?<![\w-])\d+(?:\.\d+)?px/g) ?? [];
    expect([...new Set(literalPx)].sort()).toEqual(["15px", "160px"]);
  });

  it("[SCSS7] 스플래시 화면 규칙은 지금 그대로다", () => {
    expect(declaration(screen, "display")).toBe("flex");
    expect(declaration(screen, "flex-direction")).toBe("column");
    expect(declaration(screen, "flex")).toBe("1");
    expect(declaration(screen, "align-items")).toBe("center");
    expect(declaration(screen, "justify-content")).toBe("center");
    expect(declaration(screen, "padding")).toBe("0 var(--libitum-layout-screen-padding-x)");
    expect(declaration(screen, "background")).toBe("var(--libitum-color-brand-primary)");
  });
});
