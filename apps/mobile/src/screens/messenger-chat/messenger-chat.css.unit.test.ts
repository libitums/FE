import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층(MC-U29): 자유 대화 CSS(spec §6.5 · §6.8) — 사진 스켈레톤이 도착한 3:4 사진과 같은 크기이고,
// 움직임 줄이기에서 반짝임이 멈추며, 목록이 튀지 않게 pending 상자가 같은 면을 갖는지 CSS 텍스트로 봅니다.

const read = (relative: string): string => {
  const path = resolve(process.cwd(), relative);
  return existsSync(path) ? readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "") : "";
};

const chatCss = read("src/components/chat/chat.css");
const css = read("src/screens/messenger-chat/messenger-chat.css");

const rules = (source: string): readonly { selector: string; body: string }[] =>
  [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? "").replace(/\s+/g, " ").trim(),
    body: (match[2] ?? "").replace(/\s+/g, " ").trim(),
  }));

describe("messenger-chat.css (MC-U29)", () => {
  test("MC-U29. messenger-chat.css 가 있다", () => {
    expect(css).not.toBe("");
  });

  test("MC-U29. 사진 스켈레톤 상자는 chat-photo-3x4 와 같은 폭 · 높이(180 × 240)다", () => {
    const photo = rules(chatCss).find((rule) => rule.selector === ".chat-photo-3x4");
    expect(photo?.body).toContain("width: 180px");
    expect(photo?.body).toContain("height: 240px");
    const skeleton = rules(css).filter(
      (rule) => rule.body.includes("width: 180px") && rule.body.includes("height: 240px"),
    );
    expect(skeleton.length).toBeGreaterThan(0);
  });

  test("MC-U29. 움직임 줄이기 — messenger-chat-skeleton-still 은 animation: none 이다", () => {
    const still = rules(css).filter((rule) =>
      rule.selector.includes("messenger-chat-skeleton-still"),
    );
    expect(still.length).toBeGreaterThan(0);
    expect(still.some((rule) => rule.body.includes("animation: none"))).toBe(true);
  });

  test("MC-U29. 반짝임 애니메이션이 있다 — 줄이기 전 기본 상태", () => {
    expect(css).toMatch(/@keyframes\s+messenger-chat-[a-z-]+\s*\{/);
  });
});
