import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층(MC2-U26): 새 친구 시트 CSS(messenger-chat-1-5 spec §6.4 · §6.7) — 속성 선택자 없음 · 띠 · 판 높이 px ·
// 움직임 줄이기에서 얼굴 · 점이 멈춤.

const read = (relative: string): string => {
  const path = resolve(process.cwd(), relative);
  return existsSync(path) ? readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "") : "";
};
const rules = (source: string): readonly { selector: string; body: string }[] =>
  [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? "").replace(/\s+/g, " ").trim(),
    body: (match[2] ?? "").replace(/\s+/g, " ").trim(),
  }));

const css = read("src/screens/messenger-chat/new-friend.css");

describe("new-friend.css (MC2-U26)", () => {
  test("MC2-U26. 파일이 있고 비어 있지 않다", () => {
    expect(css.trim()).not.toBe("");
  });

  test("MC2-U26. 속성 선택자(`[`)가 없다", () => {
    expect(css).not.toMatch(/\[/);
  });

  test("MC2-U26. 띠 · 판 높이는 px 로 고정이고 퍼센트 높이가 없다", () => {
    const pxHeights = rules(css).filter((rule) => /(^|[;\s])height:\s*[\d.]+px/.test(rule.body));
    expect(pxHeights.length).toBeGreaterThanOrEqual(1);
    expect(css).not.toMatch(/(^|[;{\s])height:\s*[\d.]+%/);
  });

  test("C1. 최대 높이에 퍼센트가 없다(판 상한은 컴포넌트가 px로 준다) · 판 아래 여백은 단추 줄이 진다", () => {
    expect(css).not.toMatch(/max-height:\s*[\d.]+%/);
    const panel = rules(css).find((rule) => rule.selector === ".new-friend-panel");
    expect(panel?.body).not.toContain("padding-bottom");
    const actions = rules(css).find((rule) => rule.selector === ".new-friend-actions");
    expect(actions?.body).toContain("env(safe-area-inset-bottom)");
  });

  test("MC2-U26. still 클래스(얼굴 · 점)는 animation: none 이다", () => {
    const still = rules(css).filter((rule) => rule.selector.includes("still"));
    expect(still.length).toBeGreaterThan(0);
    expect(still.some((rule) => rule.body.includes("animation: none"))).toBe(true);
  });

  test("MC2-U26. 얼굴 튐 · 점 깜빡임 키프레임이 있다 — 줄이기 전 기본 상태", () => {
    expect(css).toMatch(/@keyframes\s+[a-z-]+\s*\{/);
  });
});
