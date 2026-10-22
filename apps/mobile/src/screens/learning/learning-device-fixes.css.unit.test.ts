import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층: iPhone 13 mini 시뮬레이터 확인에서 나온 iOS Lynx 결함 세 가지를 CSS 선언으로 붙잡아 둡니다 —
// 값 자체는 기기에서만 확인되므로 여기서는 선언이 빠지거나 되돌려지지 않는지만 봅니다.

const srcDir = resolve(process.cwd(), "src");

const readCss = (file: string): string => {
  const path = resolve(srcDir, file);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
};

const bodyOf = (css: string, selector: string): string =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => (match[1] ?? "").trim() === selector)
    .map((match) => (match[2] ?? "").replace(/\s+/g, " "))
    .join(" ");

describe("iOS Lynx 기기 확인 결함 (LDF)", () => {
  test("LDF1. 아래 버튼 행은 하한 높이 56을 가져 떠 있을 때도 흐름 안에서도 아래 여백을 지킨다", () => {
    const body = bodyOf(readCss("screens/learning/learning-shell.css"), ".learning-shell-actions");
    const min = /min-height:\s*calc\((.*?)\);/.exec(body)?.[1] ?? "";
    expect(min.replace(/\s+/g, "")).toBe("var(--libitum-spacing-48)+var(--libitum-spacing-8)");
  });

  test("LDF2. 빈칸 정답 조각은 text-decoration-color 없이 fg-brand 글자색 + 기본 밑줄이다", () => {
    const body = bodyOf(readCss("components/text-roles.css"), ".text-role-romanization-answer");
    expect(body).toContain("color: var(--libitum-color-fg-brand);");
    expect(body).toContain("text-decoration: underline;");
    expect(body).not.toContain("text-decoration-color");
    expect(body).not.toContain("brand-primary");
  });

  test.each([
    ["screens/word-choice/word-choice-picture.css", ".word-choice-picture-frame"],
    ["screens/word-choice/word-choice-picture.css", ".word-choice-picture-image"],
    ["screens/word-choice/culture-check-scene.css", ".culture-check-scene-image"],
  ])("LDF3. %s의 %s는 위 모서리 반지름을 직접 가진다", (file, selector) => {
    const body = bodyOf(readCss(file), selector);
    const rounded =
      body.includes("border-radius: var(--libitum-radius-xl);") ||
      (body.includes("border-top-left-radius: var(--libitum-radius-xl);") &&
        body.includes("border-top-right-radius: var(--libitum-radius-xl);"));
    expect(rounded).toBe(true);
  });
});
