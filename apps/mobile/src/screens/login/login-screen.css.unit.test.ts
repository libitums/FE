import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층: CSS 텍스트의 규칙만 봅니다(선례: journey-map-row.css.unit.test.ts).

/** 파일이 없으면 빈 문자열이라 이어지는 단언이 값 불일치로 실패합니다. */
const readCss = (path: string): string => {
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
};

type Rule = { readonly selector: string; readonly body: string };

const rulesOf = (css: string): readonly Rule[] =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? "").trim(),
    body: (match[2] ?? "").replace(/\s+/g, " "),
  }));

const bodyOf = (css: string, selector: string): string =>
  rulesOf(css)
    .filter((rule) => rule.selector === selector)
    .map((rule) => rule.body)
    .join(" ");

describe("login-screen.css", () => {
  const raw = existsSync(resolve(process.cwd(), "src/screens/login/login-screen.css"))
    ? readFileSync(resolve(process.cwd(), "src/screens/login/login-screen.css"), "utf8")
    : "";
  const css = readCss(resolve(process.cwd(), "src/screens/login/login-screen.css"));

  test("LC1. 스피너 래퍼를 덮어쓰는 규칙이 없고 파일에 spinner가 없다", () => {
    expect(css).not.toBe("");
    const overriding = rulesOf(css).filter((rule) =>
      rule.selector.includes("ui-lynx-button-spinner-wrap"),
    );
    expect(overriding).toHaveLength(0);
    expect(raw.toLowerCase()).not.toContain("spinner");
  });

  test("LC2. 로고는 absolute · left spacing-24, 면은 relative로 남는다", () => {
    const icon = bodyOf(css, ".login-screen-social .ui-lynx-button-icon");
    const surface = bodyOf(css, ".login-screen-social .ui-lynx-button-surface");
    expect(icon).toMatch(/position:\s*absolute/);
    expect(icon).toContain("left: var(--libitum-spacing-24)");
    expect(surface).toMatch(/position:\s*relative/);
  });
});

describe("ui-lynx button.css", () => {
  const css = readCss(resolve(process.cwd(), "../../packages/ui-lynx/src/button/button.css"));

  test("LC3. 스피너 래퍼는 면 전체를 덮고 가운데 정렬한다", () => {
    const body = bodyOf(css, ".ui-lynx-button-spinner-wrap");
    expect(body).toMatch(/position:\s*absolute/);
    expect(body).toMatch(/top:\s*0/);
    expect(body).toMatch(/left:\s*0/);
    expect(body).toMatch(/width:\s*100%/);
    expect(body).toMatch(/height:\s*100%/);
    expect(body).toMatch(/align-items:\s*center/);
    expect(body).toMatch(/justify-content:\s*center/);
  });
});
