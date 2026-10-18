import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층: CSS 텍스트에 줄 · 셀의 선언이 있는지만 봅니다(선례: motion-css.unit.test.ts).

const dir = resolve(process.cwd(), "src/screens/journey-map");

/** 파일이 없거나 비어 있으면 빈 문자열이라 이어지는 단언이 값 불일치로 실패합니다. */
const readCss = (file: string): string => {
  const path = resolve(dir, file);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
};

type Rule = { readonly selector: string; readonly body: string };

const rulesOf = (css: string): readonly Rule[] =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? "").trim(),
    body: (match[2] ?? "").replace(/\s+/g, " "),
  }));

/** 선택자 목록에 `selectorPart`가 든 규칙들의 본문을 이어 붙입니다. */
const bodiesWhere = (css: string, predicate: (selector: string) => boolean): string =>
  rulesOf(css)
    .filter((rule) => predicate(rule.selector))
    .map((rule) => rule.body)
    .join(" ");

describe("journey-map-row.css", () => {
  const css = readCss("journey-map-row.css");

  test("CSS1-a. 짝 줄은 가로 flex이고 열 간격 spacing-16 · 위 맞춤이다", () => {
    const body = bodiesWhere(
      css,
      (selector) =>
        /\.journey-map-row-pair\b/.test(selector) && !/\.journey-map-cell/.test(selector),
    );
    expect(body).toMatch(/display:\s*flex/);
    expect(body).toMatch(/flex-direction:\s*row/);
    expect(body).toContain("gap: var(--libitum-spacing-16)");
    expect(body).toMatch(/align-items:\s*flex-start/);
  });

  test("CSS1-b. 짝 줄의 셀은 flex: 1 1 0 · min-width: 0이다", () => {
    const body = bodiesWhere(
      css,
      (selector) =>
        /\.journey-map-row-pair\b/.test(selector) && /\.journey-map-cell\b/.test(selector),
    );
    expect(body).toMatch(/flex:\s*1 1 0(px|%)?\s*;/);
    expect(body).toMatch(/min-width:\s*0(px)?\s*;/);
  });

  test("CSS1-c. 한 칸 줄(solo · orphan)은 세로이고 가운데다", () => {
    for (const kind of ["solo", "orphan"]) {
      const body = bodiesWhere(css, (selector) =>
        new RegExp(`\\.journey-map-row-${kind}\\b`).test(selector),
      );
      expect(body).toMatch(/display:\s*flex/);
      expect(body).toMatch(/flex-direction:\s*column/);
      expect(body).toMatch(/align-items:\s*center/);
    }
  });

  test("CSS1-d. 종류를 클래스로 가르고 속성 선택자를 쓰지 않는다", () => {
    expect(css).toMatch(/\.journey-map-row-pair\b/);
    expect(css).toMatch(/\.journey-map-row-solo\b/);
    expect(css).toMatch(/\.journey-map-row-orphan\b/);
    const selectors = rulesOf(css).map((rule) => rule.selector);
    expect(selectors.length).toBeGreaterThan(0);
    expect(selectors.filter((selector) => /\[[^\]]*\]/.test(selector))).toEqual([]);
  });
});

describe("journey-map-screen.css", () => {
  // ⟨2026-10-17⟩ 위 여백은 머리 띠 아래까지 내릴 수 있는 고정값(200)이 됐습니다 — 값의 출처는
  // `journey-map-insets.unit.test.ts`(IN1 · IN2)가 집니다. 여기서는 그 선언이 맵 상자에 하나 있다는 것만 봅니다.
  test("CSS2. 맵 상자의 padding-top이 고정 px 하나다", () => {
    const css = readCss("journey-map-screen.css");
    const body = bodiesWhere(css, (selector) => selector === ".journey-map-screen-map");
    const paddingTop = /padding-top:\s*([^;]+);/.exec(body)?.[1] ?? "";
    expect(paddingTop).toMatch(/^\d+px$/);
  });
});
