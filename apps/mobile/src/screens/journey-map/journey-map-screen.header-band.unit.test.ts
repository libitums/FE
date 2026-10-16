import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층: 띠 배치 CSS(spec §19 H-3 + §20). 계산된 레이아웃은 jsdom이 못 보므로 선언을 읽습니다.

const styles = readFileSync(
  resolve(process.cwd(), "src/screens/journey-map/journey-map-screen.css"),
  "utf8",
);
const block = (css: string, selector: string): string =>
  new RegExp(`${selector.replace(/\./g, "\\.")}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";

const chipRowBottom =
  "calc\\(\\s*var\\(--libitum-spacing-12\\)\\s*\\+\\s*var\\(--libitum-spacing-40\\)\\s*\\+\\s*var\\(--libitum-spacing-12\\)";

describe("띠 배치 CSS", () => {
  const band = block(styles, ".journey-map-screen-episode-header");

  test("HP1. 띠는 절대 배치이고 좌우를 화면 가로 여백에 맞춘다 (폭 고정 없음)", () => {
    expect(band).toMatch(/position:\s*absolute/);
    expect(band).toMatch(/left:\s*var\(--libitum-layout-screen-padding-x\)/);
    expect(band).toMatch(/right:\s*var\(--libitum-layout-screen-padding-x\)/);
    expect(band).not.toMatch(/(^|[\s;])width:\s*151px/);
    expect(band).toMatch(/z-index:\s*var\(--libitum-elevation-z-sticky\)/);
  });

  test("HP2. 띠 위치는 칩 줄 아래다 (spacing-12 + spacing-40 + spacing-12)", () => {
    expect(band).toMatch(new RegExp(`top:\\s*${chipRowBottom}\\s*\\)`));
  });

  test("HP3. (§20) 맵 위 여백은 §19 전 CSS 값(칩 줄 몫)이다 - 띠가 맵을 밀지 않는다", () => {
    const map = block(styles, ".journey-map-screen-map");
    expect(map).toMatch(
      /padding-top:\s*calc\(\s*var\(--libitum-spacing-32\)\s*\+\s*var\(--libitum-spacing-8\)\s*\+\s*var\(--libitum-layout-gap-block\)\s*\)/,
    );
    expect(map).toMatch(/padding-bottom:/);
  });

  test("HP4. 줄(로딩 · 실패)은 띠 아래 spacing-8에서 시작한다", () => {
    const row = block(styles, ".journey-map-screen-progress-row");
    expect(row).toMatch(
      new RegExp(`top:\\s*${chipRowBottom}\\s*\\+\\s*var\\(--libitum-spacing-8\\)\\s*\\)`),
    );
  });
});
