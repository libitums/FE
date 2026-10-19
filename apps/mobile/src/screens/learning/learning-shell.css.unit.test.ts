import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층: 학습 껍데기 CSS 텍스트에 지시문 글자 크기 · 카드 진행 막대 칸 색의 선언이 있는지만
// 봅니다(선례: journey-map-row.css.unit.test.ts).

const dir = resolve(process.cwd(), "src/screens/learning");

/** 파일이 없거나 비어 있으면 빈 문자열이라 이어지는 단언이 값 불일치로 실패합니다. */
const readCss = (file: string): string => {
  const path = resolve(dir, file);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
};

const bodyOf = (css: string, selector: string): string =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => (match[1] ?? "").trim() === selector)
    .map((match) => (match[2] ?? "").replace(/\s+/g, " "))
    .join(" ");

describe("지시문 글자 크기 — heading-m(22/28)", () => {
  const body = bodyOf(readCss("learning-shell.css"), ".learning-shell-instruction");

  test.each(["font-family", "font-weight", "font-size", "line-height", "letter-spacing"])(
    "LS-CSS1. %s가 heading-m 토큰이다",
    (property) => {
      expect(body).toContain(`${property}: var(--libitum-typography-heading-m-${property});`);
      expect(body).not.toContain("--libitum-typography-label-l-");
    },
  );
});

describe("카드 진행 막대 칸 색", () => {
  const css = readCss("learning-run-header.css");

  test.each([
    ["done", "--libitum-color-brand-primary"],
    ["current", "--libitum-color-brand-secondary"],
    ["upcoming", "--libitum-color-gray-300"],
  ])("LS-CSS2. %s 칸은 %s다", (state, token) => {
    expect(bodyOf(css, `.learning-run-header-segment-${state}`)).toContain(
      `background-color: var(${token});`,
    );
  });

  test("LS-CSS2. 캡션은 label-s · muted다", () => {
    const body = bodyOf(css, ".learning-run-header-caption");
    expect(body).toContain("font-size: var(--libitum-typography-label-s-font-size);");
    expect(body).toContain("color: var(--libitum-color-fg-neutral-muted);");
  });
});
