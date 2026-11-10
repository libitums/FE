import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층(접근성 M1 · M8): T3 판 · 보내기 알약 CSS — 큰 글자 줄바꿈 · 퍼센트 최대 높이 없음.

const css = ((): string => {
  const path = resolve(process.cwd(), "src/screens/messenger-chat/chat-turns.css");
  return existsSync(path) ? readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "") : "";
})();
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
  selector: (match[1] ?? "").replace(/\s+/g, " ").trim(),
  body: (match[2] ?? "").replace(/\s+/g, " ").trim(),
}));

describe("chat-turns.css T3 판 (접근성 M1)", () => {
  test("M1. Keep chatting 줄은 큰 글자에서 줄바꿈된다(flex-wrap: wrap) — 고정 높이가 아니라 min-height뿐이다", () => {
    const keep = rules.find((rule) => rule.selector === ".chat-out-keep");
    expect(keep?.body).toContain("flex-wrap: wrap");
    expect(keep?.body).toContain("justify-content: center");
    expect(keep?.body).not.toMatch(/(^|[;\s])height:/);
  });

  test("F3. 가장 큰 접근성 글자에서는 Keep chatting이 세로로 쌓이고 높이를 고정하지 않는다(가격 줄 잘림 · 잔액 줄 밀림)", () => {
    const stacked = rules.find((rule) => rule.selector === ".chat-out-keep-stacked");
    expect(stacked?.body).toContain("flex-direction: column");
    expect(stacked?.body).toContain("flex-wrap: nowrap");
    expect(stacked?.body).not.toMatch(/(^|[;\s])height:/);
    expect(stacked?.body).not.toContain("overflow");
    const keep = rules.find((rule) => rule.selector === ".chat-out-keep");
    expect(keep?.body).toContain("min-height: 56px");
  });

  test("F3. Keep chatting 상자와 그 안 글 · 판 단추 · 잔액 줄은 줄지 않는다(flex-shrink: 0) — 판 maxHeight 아래서 글 상자만 줄어 겹침 · 잘림이 났다", () => {
    for (const selector of [
      ".chat-out-keep",
      ".chat-out-keep-label",
      ".chat-out-keep-price",
      ".chat-out-action",
      ".chat-out-balance",
    ]) {
      expect(rules.find((rule) => rule.selector === selector)?.body, selector).toContain(
        "flex-shrink: 0",
      );
    }
  });

  test("M1. 판에 퍼센트 최대 높이가 없다(상한은 컴포넌트가 px로 준다)", () => {
    expect(css).not.toMatch(/max-height:\s*[\d.]+%/);
  });
});
