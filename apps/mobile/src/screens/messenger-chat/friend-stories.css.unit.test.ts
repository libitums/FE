import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층(FS-CSS1): 스토리 줄 고리의 선언(ADR-0178 D3 개정 ⟨점선⟩ · 사용자 정정 2026-11-26 — 점선은 만났는가, 색은 봤는가). CSS 텍스트만 봅니다(선례: journey-map-row.css.unit.test.ts).

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

  test("본 것은 색만 회색 — 선 모양은 건드리지 않음(점선은 만났는가로)", () => {
    const body = bodyOf(css, ".story-ring-seen");
    expect(body).toContain("border-color: var(--libitum-color-gray-500)");
    expect(body).not.toContain("border-style");
  });

  test("점선은 안 만난 친구만(색은 기본 brand, 본 것과 겹치면 회색)", () => {
    const body = bodyOf(css, ".story-ring-unmet");
    expect(body).toContain("border-style: dashed");
    expect(body).not.toContain("border-color");
  });

  test("점선을 다른 선택자가 더하거나 되돌리지 않음(내 스토리 예외 규칙 불필요)", () => {
    const dashed = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((match) => (match[1] ?? "").includes("story-ring"))
      .filter((match) => /border-style:\s*dashed/.test(match[2] ?? ""))
      .map((match) => (match[1] ?? "").trim());
    expect(dashed).toEqual([".story-ring-unmet"]);
    expect(bodyOf(css, ".my-story-faces .story-ring-seen")).toBe("");
  });
});
