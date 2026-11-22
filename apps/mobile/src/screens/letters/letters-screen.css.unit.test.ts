import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "vitest";

// `unit` 계층: Letters 자모표 칸의 눌림(ADR-0169 D2 · D7 ⟨2026-11-21 개정⟩) — CSS 선언만 봅니다
// (선례: journey-map-sheet-motion.css.unit.test.ts). 칸은 누르는 동안만 눌림 면(gray-100)이고, 움직이지 않으며,
// 누른 뒤 켜진 채 남는 모양이 없습니다.

const file = resolve(process.cwd(), "src/screens/letters/letters-screen.css");

/** 파일이 없으면 빈 문자열이라 이어지는 단언이 값 불일치로 실패합니다. */
const css = existsSync(file) ? readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "") : "";

type Rule = { readonly selector: string; readonly body: string };

const rules: readonly Rule[] = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
  selector: (match[1] ?? "").trim(),
  body: (match[2] ?? "").replace(/\s+/g, " "),
}));

/** 선택자 목록 중 하나가 `name` 그대로인 규칙들의 본문 */
const bodyOf = (name: string): string =>
  rules
    .filter((rule) => rule.selector.split(",").some((part) => part.trim() === name))
    .map((rule) => rule.body)
    .join(" ");

test("LC-U1. 누르는 동안만 눌림 면 — `.letters-cell:active`는 gray-100 바탕이고 크기를 바꾸지 않는다", () => {
  const active = bodyOf(".letters-cell:active");
  expect(active).toContain("background-color: var(--libitum-color-gray-100)");
  expect(active).not.toContain("transform");
});

test("LC-U2. 칸은 움직이지 않는다 — 칸 규칙 어디에도 transform · transition이 없다", () => {
  const cellRules = rules.filter((rule) => /\.letters-cell(?![\w-])/.test(rule.selector));
  expect(cellRules.length).toBeGreaterThan(0);
  for (const rule of cellRules) {
    expect(rule.body).not.toContain("transform");
    expect(rule.body).not.toContain("transition");
  }
});

test("LC-U3. 누른 뒤 켜진 채 남는 모양이 없다 — 선택 · 움직임 줄이기 갈래 규칙이 없다", () => {
  expect(css).not.toContain("letters-cell-selected");
  expect(css).not.toContain("letters-cell-motion-reduced");
});
