import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { icon, opacity, spacing, stroke } from "@libitums/design-tokens";
import { describe, expect, it } from "vitest";

// `unit` 계층: CSS 텍스트는 파일을 읽어 정규식으로 봅니다. unit 명령(`*.unit.test.ts`)으로 돌 뿐입니다.
// jsdom은 레이아웃을 계산하지 않으므로 「44가 되는 식」은 토큰 값의 합으로 확인합니다.

function readCss(name: string): string {
  return readFileSync(resolve(process.cwd(), "src/components", name), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
}

/** 선택자 정규식에 맞는 첫 규칙의 본문. 규칙이 없으면 빈 문자열이라 이어지는 단언이 값 불일치로 실패합니다. */
function ruleBodyOf(css: string, selector: RegExp): string {
  return new RegExp(`(?:^|\\})\\s*${selector.source}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
}

/** 선택자 정규식에 맞는 첫 규칙의 파일 내 위치. 없으면 -1. */
function ruleIndexOf(css: string, selector: RegExp): number {
  const matched = new RegExp(`(?:^|\\})\\s*${selector.source}\\s*\\{`).exec(css);
  return matched === null ? -1 : matched.index;
}

const touchTarget =
  parseFloat(icon.size.md) + 2 * parseFloat(spacing["8"]) + 2 * parseFloat(stroke.width.strong);

describe("top-bar.css", () => {
  const css = readCss("top-bar.css");
  const ruleBody = (selector: RegExp): string => ruleBodyOf(css, selector);

  it("[TBC1] 버튼은 내용으로 44 원형이 된다 — 폭 · 높이를 적지 않는다", () => {
    const body = ruleBody(/\.top-bar-notifications/);

    expect(body).toMatch(/padding:\s*var\(--libitum-spacing-8\)\s*;/);
    expect(body).toMatch(
      /border:\s*var\(--libitum-stroke-width-strong\) solid var\(--libitum-color-gray-50\)/,
    );
    expect(body).toMatch(/border-radius:\s*var\(--libitum-radius-full\)/);
    expect(body).toMatch(/background-color:\s*var\(--libitum-color-white\)/);
    expect(body).not.toMatch(/(?:^|[\s;])(?:width|height|min-width|min-height)\s*:/);

    const iconBody = ruleBody(/\.top-bar-notifications-icon/);
    expect(iconBody).toMatch(/(?:^|[\s;])width:\s*var\(--libitum-icon-size-md\)/);
    expect(iconBody).toMatch(/(?:^|[\s;])height:\s*var\(--libitum-icon-size-md\)/);

    expect(touchTarget).toBe(44);
  });

  it("[TBC2] 옛 아이콘 크기와 옛 여백이 남아 있지 않다", () => {
    expect(css).not.toMatch(/icon-size-lg/);
    expect(css).not.toMatch(/spacing-2\)/);
  });

  it("[TBC3] 눌림 — standard는 pressed scale, reduced는 축소 없이 black 막", () => {
    expect(ruleBody(/\.top-bar-notifications/)).toMatch(
      /transition:\s*transform var\(--libitum-motion-duration-pressed\) var\(--libitum-motion-easing-easing\)/,
    );
    expect(ruleBody(/\.top-bar-notifications:active/)).toMatch(
      /transform:\s*scale\(var\(--libitum-motion-scale-pressed\)\)/,
    );

    const reduced = ruleBody(/\.top-bar-notifications-motion-reduced/);
    expect(reduced).toMatch(/transition:\s*none/);
    expect(reduced).toMatch(/position:\s*relative/);
    expect(ruleBody(/\.top-bar-notifications-motion-reduced:active/)).toMatch(/transform:\s*none/);

    const shade = ruleBody(/\.top-bar-notifications-shade/);
    expect(shade).toMatch(/position:\s*absolute/);
    expect(shade).toMatch(/top:\s*0\b/);
    expect(shade).toMatch(/left:\s*0\b/);
    expect(shade).toMatch(/width:\s*100%/);
    expect(shade).toMatch(/height:\s*100%/);
    expect(shade).toMatch(/border-radius:\s*var\(--libitum-radius-full\)/);
    expect(shade).toMatch(/background-color:\s*var\(--libitum-color-black\)/);
    expect(shade).toMatch(/opacity:\s*0\s*;/);
    expect(shade).toMatch(
      /transition:\s*opacity var\(--libitum-motion-duration-pressed\) var\(--libitum-motion-easing-easing\)/,
    );

    const pressed = ruleBody(
      /\.top-bar-notifications-motion-reduced:active\s+\.top-bar-notifications-shade/,
    );
    expect(pressed).toMatch(/opacity:\s*var\(--libitum-opacity-pressed-shade,\s*0\.08\)/);
    const fallback = Number(
      /opacity:\s*var\(--libitum-opacity-pressed-shade,\s*([\d.]+)\)/.exec(pressed)?.[1] ??
        Number.NaN,
    );
    expect(fallback).toBe(opacity["pressed-shade"]);

    const nonIdentity = (css.match(/scale\(\s*[\d.]+\s*\)/g) ?? []).filter(
      (literal) => Number(/([\d.]+)/.exec(literal)?.[1] ?? Number.NaN) !== 1,
    );
    expect(nonIdentity).toEqual([]);
  });

  it("[TBC5] 같은 특이도의 규칙이 눌림 순서대로 놓인다", () => {
    const order = [
      /\.top-bar-notifications/,
      /\.top-bar-notifications:active/,
      /\.top-bar-notifications-motion-reduced/,
      /\.top-bar-notifications-motion-reduced:active/,
      /\.top-bar-notifications-shade/,
      /\.top-bar-notifications-motion-reduced:active\s+\.top-bar-notifications-shade/,
    ].map((selector) => ruleIndexOf(css, selector));

    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe("stat-chip.css", () => {
  const css = readCss("stat-chip.css");
  const ruleBody = (selector: RegExp): string => ruleBodyOf(css, selector);

  it("[TBC4] 상단 줄 높이는 세로 여백만 8로 키워 44가 되고, 흰 면 규칙 뒤에 온다", () => {
    const body = ruleBody(/\.stat-chip-height-touch-target/);

    expect(body).toMatch(/padding-top:\s*var\(--libitum-spacing-8\)/);
    expect(body).toMatch(/padding-bottom:\s*var\(--libitum-spacing-8\)/);
    expect(body).not.toMatch(/padding-left|padding-right|(?:^|[\s;])(?:min-)?height\s*:/);

    expect(ruleIndexOf(css, /\.stat-chip-height-touch-target/)).toBeGreaterThan(
      ruleIndexOf(css, /\.stat-chip-surface-white/),
    );
    expect(ruleBody(/\.stat-chip/)).toMatch(
      /padding:\s*var\(--libitum-spacing-6\) var\(--libitum-spacing-12\)/,
    );
    expect(touchTarget).toBe(44);
  });
});
