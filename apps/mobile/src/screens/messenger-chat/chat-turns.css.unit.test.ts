import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층(MC2-U26): 턴 CSS(messenger-chat-1-5 spec §6.2) — 속성 선택자 없음 · 공용 chat.css 에는 `.chat-title-stack` 한 규칙만 더해진다.

const read = (relative: string): string => {
  const path = resolve(process.cwd(), relative);
  return existsSync(path) ? readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "") : "";
};
const rules = (source: string): readonly { selector: string; body: string }[] =>
  [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? "").replace(/\s+/g, " ").trim(),
    body: (match[2] ?? "").replace(/\s+/g, " ").trim(),
  }));

const css = read("src/screens/messenger-chat/chat-turns.css");
const chatCss = read("src/components/chat/chat.css");

describe("chat-turns.css (MC2-U26)", () => {
  test("MC2-U26. 파일이 있고 비어 있지 않다", () => {
    expect(css.trim()).not.toBe("");
  });

  test("MC2-U26. 속성 선택자(`[`)가 없다", () => {
    expect(css.trim()).not.toBe("");
    expect(css).not.toMatch(/\[/);
  });

  test("MC2-U26. 판 · 띠에 퍼센트 높이가 없다(Lynx 퍼센트 높이 함정)", () => {
    expect(css.trim()).not.toBe("");
    expect(css).not.toMatch(/(^|[;{\s])height:\s*[\d.]+%/);
  });
});

describe("chat.css `.chat-title-stack` (MC2-U26)", () => {
  const stack = rules(chatCss).filter((rule) => rule.selector === ".chat-title-stack");

  test("MC2-U26. 공용 chat.css 에 `.chat-title-stack` 규칙이 정확히 하나 있다", () => {
    expect(stack).toHaveLength(1);
  });

  test("MC2-U26. 세로로 쌓고(flex-direction: column) 남는 폭을 차지한다(flex: 1)", () => {
    const body = stack[0]?.body ?? "";
    expect(body).toContain("flex-direction: column");
    expect(body).toMatch(/flex(-grow)?:\s*1/);
  });

  // 기기 F1: 세로 묶음 안 제목이 `.chat-title { flex: 1 }`(= basis 0)을 그대로 물려받아 높이 0으로 접히고 부제와 겹쳤다.
  test("F1. 묶음 안 제목(`.chat-title-stacked`)은 늘지 않고 내용 높이를 쓴다(flex-grow 0 · basis auto)", () => {
    const stacked = rules(chatCss).filter((rule) => rule.selector === ".chat-title-stacked");
    expect(stacked).toHaveLength(1);
    const body = stacked[0]?.body ?? "";
    expect(body).toMatch(/flex:\s*0\s+1\s+auto/);
    expect(body).not.toMatch(/flex:\s*1/);
  });

  test("MC2-U26. chat.css 에 속성 선택자가 없다", () => {
    expect(chatCss).not.toMatch(/\[/);
  });
});
