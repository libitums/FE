import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층: compact 밀도에서만 보기 로마자 줄을 줄이는 CSS 선언이 빠지거나 번지지 않는지 붙잡아 둡니다 —
// 값 자체는 기기에서만 확인되므로 여기서는 선택자 범위 · 토큰 사용 · 색 선언 없음만 봅니다.

const srcDir = resolve(process.cwd(), "src");

const readCss = (file: string): string => {
  const path = resolve(srcDir, file);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
};

const rulesOf = (css: string): readonly { selector: string; body: string }[] =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? "").trim().replace(/\s+/g, " "),
    body: (match[2] ?? "").replace(/\s+/g, " "),
  }));

const bodyOf = (css: string, selector: string): string =>
  rulesOf(css)
    .filter((rule) => rule.selector === selector)
    .map((rule) => rule.body)
    .join(" ");

const css = readCss("components/question-options.css");
const romanSelector = ".question-options-compact .ui-lynx-option-selector-romanization";
const textSelector = ".question-options-compact .ui-lynx-option-selector-text";

describe("보기 로마자 compact 축소 (CSS)", () => {
  test("CSS-CR1. compact 로마자 줄은 caption 크기 토큰 셋을 쓰고 글꼴은 바꾸지 않는다", () => {
    const body = bodyOf(css, romanSelector);

    for (const property of ["font-size", "line-height", "letter-spacing"]) {
      expect(body).toContain(`${property}: var(--libitum-typography-caption-${property});`);
    }
    // 글꼴은 앱의 로마자 기울임 글꼴 한 곳(app.css)이 정한다 — caption 글꼴(Duru Sans)로 덮으면 합성 기울임이 된다.
    expect(body).not.toContain("font-family");
    // 굵기는 ui-lynx 규칙(medium)을 그대로 두므로 이 규칙은 굵기를 생값으로 바꾸지 않는다.
    expect(body).not.toMatch(/font-weight:\s*(\d|bold|normal)/);
  });

  test("CSS-CR1. compact 로마자 줄 규칙은 색 · 기울임을 선언하지 않는다 — 상태 색 우선순위 불변", () => {
    const body = bodyOf(css, romanSelector);

    expect(body).not.toMatch(/(^|[\s;])color:/);
    expect(body).not.toContain("font-style");
  });

  test("CSS-CR1. compact 글 묶음은 row-gap 0이다", () => {
    expect(bodyOf(css, textSelector)).toContain("row-gap: 0;");
  });

  test("CSS-CR1. regular 규칙이 없고 compact 밖으로 번지는 로마자 · 글 묶음 규칙도 없다", () => {
    const selectors = rulesOf(css).map((rule) => rule.selector);

    expect(selectors.some((selector) => selector.includes("question-options-regular"))).toBe(false);
    for (const selector of selectors) {
      if (!selector.includes("ui-lynx-option-selector")) continue;
      expect(selector.startsWith(".question-options-compact ")).toBe(true);
    }
  });

  test("CSS-CR1. 색 · 길이 생값이 없고 토큰 변수만 쓴다", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\d+(\.\d+)?(px|rem|em|pt)\b/);
    for (const match of css.matchAll(/var\((--[A-Za-z0-9_-]+)/g)) {
      expect(match[1]).toMatch(/^--libitum-/);
    }
  });
});

// ADR-0107 · ADR-0108 D8: 로마자는 어느 자리든 같은 기울임 글꼴 목록 하나로 그린다.
describe("보기 로마자 글꼴 (CSS)", () => {
  const appCss = readCss("app/app.css");

  test("CSS-CR2. 앱의 로마자 글꼴 규칙이 보기 로마자 줄까지 덮고 Duru Roman이 맨 앞이다", () => {
    const rule = rulesOf(appCss).find((candidate) =>
      candidate.selector.includes(".app .ui-lynx-option-selector-romanization"),
    );

    expect(rule?.body).toMatch(/font-family: "Duru Roman", "DuruRoman",/);
    expect(rule?.selector).toContain(".app .ui-lynx-chat-bubble-annotation-romanization");
  });
});
