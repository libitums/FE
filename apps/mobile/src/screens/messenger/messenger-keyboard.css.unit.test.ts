import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층: 자판 CSS 규칙(ADR-0112) — 키 줄이 화면 폭을 채우되 넓은 화면에서 상한에 멈추고, 칸 사이
// 틈이 없으며(칸 전체가 터치 대상), 판 높이가 예전과 같고(8 + 54 × 4 + 8 = 232), 첫 줄 말풍선이
// 잘리지 않게 overflow가 visible이며 z-index · transition이 없는지 CSS 텍스트로 봅니다.

const css = readFileSync(
  resolve(process.cwd(), "src/screens/messenger/messenger-keyboard.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

const bodyOf = (selector: string): string =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => (match[1] ?? "").replace(/\s+/g, " ").trim() === selector)
    .map((match) => (match[2] ?? "").replace(/\s+/g, " ").trim())
    .join(" ");

describe("messenger-keyboard.css (KT-U20)", () => {
  test("KW1. 키 줄 묶음은 폭을 채우되 최대 480px이다", () => {
    const body = bodyOf(".messenger-keyboard-rows");
    expect(body).toContain("width: 100%");
    expect(body).toContain("max-width: 480px");
  });

  test("KW2. 줄 · 칸 사이 간격이 없다 — 칸끼리 맞닿는다", () => {
    expect(css).not.toMatch(/(?:^|[\s;{])gap:/);
    expect(bodyOf(".messenger-keyboard-row")).toContain("width: 100%");
  });

  test("KW3. 칸 비율은 1 · 1.5 · 7이고 기준이 0이다", () => {
    expect(bodyOf(".messenger-keyboard-cell")).toContain("flex: 1 1 0");
    expect(bodyOf(".messenger-keyboard-cell-wide")).toContain("flex: 1.5 1 0");
    expect(bodyOf(".messenger-keyboard-cell-space")).toContain("flex: 7 1 0");
    expect(bodyOf(".messenger-keyboard-key-edge")).toMatch(/width: 66\.666\d*%/);
  });

  test("KW4. 판 높이가 예전과 같다 — 위아래 8 · 칸 안쪽 3 · 보이는 키 48", () => {
    const face = bodyOf(".messenger-keyboard");
    expect(face).toContain("padding-top: var(--libitum-spacing-8)");
    expect(face).toContain("padding-bottom: var(--libitum-spacing-8)");
    expect(bodyOf(".messenger-keyboard-cell")).toContain("padding: 3px");
    expect(bodyOf(".messenger-keyboard-key")).toContain("height: var(--libitum-spacing-48)");
    // 8 + (3 + 48 + 3) × 4 + 8 = 232 = 예전 24 + 40 × 4 + 8 × 3 + 24
    expect(8 + (3 + 48 + 3) * 4 + 8).toBe(24 + 40 * 4 + 8 * 3 + 24);
  });

  // 좁은 화면에서도 키를 키우려고 판 좌우 여백을 시스템 자판처럼 가장자리 가까이 둡니다(2026-10-19 결정의 연장).
  test("KW5. 판 좌우 여백은 3px이다", () => {
    const face = bodyOf(".messenger-keyboard");
    expect(face).toContain("padding-left: 3px");
    expect(face).toContain("padding-right: 3px");
  });

  test("KW6. 말풍선이 판 위로 넘쳐도 잘리지 않는다 — 다섯 상자 모두 overflow: visible", () => {
    for (const selector of [
      ".messenger-keyboard",
      ".messenger-keyboard-rows",
      ".messenger-keyboard-row",
      ".messenger-keyboard-cell",
      ".messenger-keyboard-key",
    ]) {
      expect(bodyOf(selector)).toContain("overflow: visible");
    }
  });

  test("KW7. z-index · transition · animation이 없다(TalkBack 순서 · 즉시 눌림)", () => {
    expect(css).not.toMatch(/z-index|transition|animation/);
  });
});
