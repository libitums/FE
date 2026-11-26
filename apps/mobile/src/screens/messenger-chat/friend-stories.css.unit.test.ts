import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층(FS-CSS1): 스토리 줄 고리의 선언(ADR-0178 D3 개정 ⟨점선⟩). CSS 텍스트만 봅니다(선례: journey-map-row.css.unit.test.ts).

const readCss = (file: string): string => {
  const path = resolve(process.cwd(), "src/screens/messenger-chat", file);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
};

/** 선택자가 정확히 `selector`인 규칙들의 본문(공백 하나로 접음). */
const bodyOf = (css: string, selector: string): string =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => (match[1] ?? "").trim() === selector)
    .map((match) => (match[2] ?? "").replace(/\s+/g, " "))
    .join(" ");

describe("FS-CSS1 friend-stories.css 고리", () => {
  const css = readCss("friend-stories.css");

  test("기본 고리는 brand 실선", () => {
    const body = bodyOf(css, ".story-ring");
    expect(body).toContain("border-style: solid");
    expect(body).toContain("border-color: var(--libitum-color-brand-primary)");
  });

  test("본 것(친구 · 안 만난 친구)은 회색 점선", () => {
    const body = bodyOf(css, ".story-ring-seen");
    expect(body).toContain("border-color: var(--libitum-color-gray-500)");
    expect(body).toContain("border-style: dashed");
  });

  test("안 본 안 만난 친구는 점선(색은 기본 brand)", () => {
    const body = bodyOf(css, ".story-ring-unmet");
    expect(body).toContain("border-style: dashed");
    expect(body).not.toContain("border-color");
  });

  test("내 스토리의 본 고리는 회색 실선 그대로", () => {
    expect(bodyOf(css, ".my-story-faces .story-ring-seen")).toContain("border-style: solid");
  });
});
