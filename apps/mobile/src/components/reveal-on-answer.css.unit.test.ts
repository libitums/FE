import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

// `unit` 계층: 펼침 상자의 CSS가 기기에서 서는 꼴인지(ADR-0212 D2). Lynx는 전환 시간의 `calc()`를 0으로 읽어
// 높이가 한 번에 섰습니다(iOS 시뮬레이터) — 시간 · 지연은 토큰 하나만 씁니다.

const css = readFileSync(
  resolve(process.cwd(), "src/components/reveal-on-answer.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

describe("reveal-on-answer.css", () => {
  test("RS1. 전환 선언에 calc()가 없다", () => {
    const transitions = css.match(/transition(?:-[a-z]+)?:[^;]+;/g) ?? [];
    expect(transitions.length).toBeGreaterThan(0);
    for (const declaration of transitions) {
      expect(declaration).not.toContain("calc(");
    }
  });

  test("RS2. 높이는 d6, 글은 d4 동안 d2 · d3 · d4 · d5 지연으로 나타난다", () => {
    expect(css).toMatch(
      /transition:\s*height var\(--libitum-motion-duration-d6\) var\(--libitum-motion-easing-enter\)/,
    );
    for (const [order, token] of [
      [0, "d2"],
      [1, "d3"],
      [2, "d4"],
      [3, "d5"],
    ] as const) {
      expect(css).toMatch(
        new RegExp(
          `\\.reveal-on-answer-item-${order} \\{\\s*transition-delay: var\\(--libitum-motion-duration-${token}\\);`,
        ),
      );
    }
  });
});
