import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층: 자판 키 폭이 화면 폭을 따르는지 CSS 텍스트로 봅니다. 키 줄은 디자인 폭 366을 넘지
// 않되 그보다 좁은 화면(375pt · 360dp)에서는 면 여백 안으로 줄어야 합니다 — 고정 px 폭이면 좌우
// 16 여백을 침범하거나 화면 밖으로 잘립니다(iPhone 13 mini 실기 확인 2026-10-19).

const css = readFileSync(
  resolve(process.cwd(), "src/screens/messenger/messenger-keyboard.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

const bodyOf = (selector: string): string =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => (match[1] ?? "").replace(/\s+/g, " ").trim() === selector)
    .map((match) => (match[2] ?? "").replace(/\s+/g, " ").trim())
    .join(" ");

const widthOf = (selector: string): string | undefined =>
  /(?:^|[ ;])width:\s*([^;]+);/.exec(bodyOf(selector))?.[1];

// 디자인 폭(px)을 키 줄 366 · 자모 묶음 234에 대한 비율(%)로 옮긴 값입니다. 포매터가 끝자리 0을 지우므로
// 숫자로 비교합니다.
const percentOf = (designPx: number, basePx: number): number => (designPx / basePx) * 100;
const percentValue = (width: string | undefined): number =>
  width?.endsWith("%") === true ? Number.parseFloat(width) : Number.NaN;

describe("messenger-keyboard.css 키 폭", () => {
  test("KW1. 키 줄 묶음은 폭을 채우되 최대 366px이다", () => {
    expect(widthOf(".messenger-keyboard-rows")).toBe("100%");
    expect(bodyOf(".messenger-keyboard-rows")).toContain("max-width: 366px");
  });

  test("KW2. 키 줄은 묶음 폭을 따르고 고정 px 폭이 없다", () => {
    expect(widthOf(".messenger-keyboard-row")).toBe("100%");
  });

  test.each([
    [".messenger-keyboard-key", 30, 366],
    [".messenger-keyboard-key-wide", 49, 366],
    [".messenger-keyboard-key-space", 206, 366],
    [".messenger-keyboard-key-trailing", 80, 366],
    [".messenger-keyboard-cluster", 234, 366],
    [".messenger-keyboard-cluster .messenger-keyboard-key", 30, 234],
  ] as const)("KW3. %s 폭은 디자인 %ipx의 비율이다", (selector, designPx, basePx) => {
    expect(percentValue(widthOf(selector))).toBeCloseTo(percentOf(designPx, basePx), 3);
  });

  // 좌우 여백 16은 375pt 화면에서 키를 디자인 폭(30)보다 줄였습니다 — 4로 두면 키 줄이 366을 다 써서
  // 작은 기기에서도 디자인 크기를 지킵니다(사용자 결정 2026-10-19). 위 · 아래 여백은 그대로입니다.
  test("KW5. 자판 면의 좌우 여백은 spacing-4이고 위 · 아래는 spacing-24다", () => {
    const body = bodyOf(".messenger-keyboard");
    expect(body).toContain("padding-left: var(--libitum-spacing-4)");
    expect(body).toContain("padding-right: var(--libitum-spacing-4)");
    expect(body).toContain("padding-top: var(--libitum-spacing-24)");
    expect(body).toContain("padding-bottom: var(--libitum-spacing-24)");
  });

  test("KW4. 키 높이 · 간격은 그대로다", () => {
    expect(bodyOf(".messenger-keyboard-key")).toContain("height: var(--libitum-spacing-40)");
    expect(bodyOf(".messenger-keyboard-row")).toContain("gap: var(--libitum-spacing-4)");
  });
});
