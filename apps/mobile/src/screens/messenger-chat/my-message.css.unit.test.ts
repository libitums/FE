import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층(MC2-U26): 내 말풍선 CSS(messenger-chat-1-5 spec §6.1) — 속성 선택자 없음 · 상자 선언이 ui-lynx 내 말풍선(outgoing · m)과
// 같음 · 움직임 줄이기 스켈레톤이 멈춤. CSS 텍스트로 본다.

const read = (relative: string): string => {
  const path = resolve(process.cwd(), relative);
  return existsSync(path) ? readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "") : "";
};
const rules = (source: string): readonly { selector: string; body: string }[] =>
  [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? "").replace(/\s+/g, " ").trim(),
    body: (match[2] ?? "").replace(/\s+/g, " ").trim(),
  }));
const declarations = (body: string): readonly string[] =>
  body
    .split(";")
    .map((declaration) => declaration.replace(/\s+/g, " ").trim())
    .filter((declaration) => declaration !== "");

const css = read("src/screens/messenger-chat/my-message.css");
const bubbleCss = read("../../packages/ui-lynx/src/chat-bubble/chat-bubble.css");
const bubbleBody = (selector: string): readonly string[] =>
  declarations(rules(bubbleCss).find((rule) => rule.selector === selector)?.body ?? "");
const pick = (list: readonly string[], property: string): string[] =>
  list.filter((declaration) => declaration.startsWith(`${property}:`));

describe("my-message.css (MC2-U26)", () => {
  test("MC2-U26. 파일이 있고 비어 있지 않다", () => {
    expect(css.trim()).not.toBe("");
  });

  test("MC2-U26. 속성 선택자(`[`)가 없다 — 상태는 클래스로 나타낸다", () => {
    expect(css).not.toMatch(/\[/);
  });

  test("MC2-U26. 기준이 되는 ui-lynx 내 말풍선 선언이 읽힌다(테스트 전제)", () => {
    expect(pick(bubbleBody(".ui-lynx-chat-bubble-outgoing"), "background-color")).toHaveLength(1);
    expect(pick(bubbleBody(".ui-lynx-chat-bubble-m"), "padding")).toHaveLength(1);
    expect(pick(bubbleBody(".ui-lynx-chat-bubble"), "border-radius")).toHaveLength(1);
  });

  test("MC2-U26. 내 말풍선 상자 한 규칙이 배경 · 모서리 · 안 여백을 outgoing · m 과 같은 값으로 선언한다", () => {
    const expected = [
      ...pick(bubbleBody(".ui-lynx-chat-bubble-outgoing"), "background-color"),
      ...pick(bubbleBody(".ui-lynx-chat-bubble"), "border-radius"),
      ...pick(bubbleBody(".ui-lynx-chat-bubble-m"), "padding"),
    ];
    expect(expected).toHaveLength(3);
    const box = rules(css).filter((rule) => {
      const own = declarations(rule.body);
      return expected.every((declaration) => own.includes(declaration));
    });
    expect(box.length).toBeGreaterThan(0);
  });

  test("MC2-U26. 글꼴(body-m 의 family · size · weight · line-height · letter-spacing)이 같은 값이다", () => {
    const fonts = bubbleBody(".ui-lynx-chat-bubble-m .ui-lynx-chat-bubble-message").filter(
      (declaration) =>
        declaration.startsWith("font-") ||
        declaration.startsWith("line-height") ||
        declaration.startsWith("letter-spacing"),
    );
    expect(fonts.length).toBeGreaterThanOrEqual(5);
    const all = new Set(rules(css).flatMap((rule) => declarations(rule.body)));
    for (const declaration of fonts) expect(all.has(declaration), declaration).toBe(true);
  });

  test("MC2-U26. still 클래스 규칙은 animation: none 이다(움직임 줄이기 스켈레톤)", () => {
    const still = rules(css).filter((rule) => rule.selector.includes("still"));
    expect(still.length).toBeGreaterThan(0);
    expect(still.some((rule) => rule.body.includes("animation: none"))).toBe(true);
  });

  test("MC2-U26. 반짝임 키프레임이 있다 — 줄이기 전 기본 상태", () => {
    expect(css).toMatch(/@keyframes\s+[a-z-]+\s*\{/);
  });
});
