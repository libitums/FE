import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층: 학습 껍데기 CSS 텍스트에 지시문 글자 크기 · 카드 진행 막대 칸 색의 선언이 있는지만
// 봅니다(선례: journey-map-row.css.unit.test.ts).

const dir = resolve(process.cwd(), "src/screens/learning");

/** 파일이 없거나 비어 있으면 빈 문자열이라 이어지는 단언이 값 불일치로 실패합니다. */
const readCss = (file: string): string => {
  const path = resolve(dir, file);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
};

const bodyOf = (css: string, selector: string): string =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => (match[1] ?? "").trim() === selector)
    .map((match) => (match[2] ?? "").replace(/\s+/g, " "))
    .join(" ");

describe("지시문 글자 크기 — heading-m(22/28)", () => {
  const body = bodyOf(readCss("learning-shell.css"), ".learning-shell-instruction");

  test.each(["font-family", "font-weight", "font-size", "line-height", "letter-spacing"])(
    "LS-CSS1. %s가 heading-m 토큰이다",
    (property) => {
      expect(body).toContain(`${property}: var(--libitum-typography-heading-m-${property});`);
      expect(body).not.toContain("--libitum-typography-label-l-");
    },
  );
});

describe("카드 진행 막대 칸 색", () => {
  const css = readCss("learning-run-header.css");

  test.each([
    ["done", "--libitum-color-brand-primary"],
    ["current", "--libitum-color-brand-secondary"],
    ["upcoming", "--libitum-color-gray-300"],
  ])("LS-CSS2. %s 칸은 %s다", (state, token) => {
    expect(bodyOf(css, `.learning-run-header-segment-${state}`)).toContain(
      `background-color: var(${token});`,
    );
  });

  test("LS-CSS2. 캡션은 label-s · muted다", () => {
    const body = bodyOf(css, ".learning-run-header-caption");
    expect(body).toContain("font-size: var(--libitum-typography-label-s-font-size);");
    expect(body).toContain("color: var(--libitum-color-fg-neutral-muted);");
  });
});

describe("완료 장면 무대 규칙 (LS-CSS3 ~ 8)", () => {
  const css = readCss("learning-shell.css");
  const body = (selector: string): string => bodyOf(css, selector).trim();

  test("LS-CSS3. 장면 규칙은 가운데 정렬 하나이고 높이 · 줄어듦을 건드리지 않는다", () => {
    const rule = body(".learning-shell-stage-scene-complete");
    expect(rule).toBe("justify-content: center;");
    for (const property of ["height", "min-height", "flex-shrink", "flex-basis"]) {
      expect(rule).not.toContain(`${property}:`);
    }
  });

  test("LS-CSS4. 나뉜 배치는 남는 세로를 받고 버튼 몫을 아래에 비운다", () => {
    const rule = body(".learning-shell-stage-fill-rest");
    expect(rule).toContain("flex-grow: 1;");
    const margin = /margin-bottom:\s*calc\((.*)\);/.exec(rule)?.[1] ?? "";
    expect(margin.replace(/\s+/g, "")).toBe(
      "var(--libitum-spacing-48)+var(--libitum-spacing-8)+var(--libitum-layout-gap-block)",
    );
    expect(rule).not.toMatch(/(^|[\s;])margin:/);
    expect(rule).not.toContain("flex-shrink");
  });

  test("LS-CSS5. 합친 흐름은 flex-grow, 스크롤 직계는 min-height 하나씩만 쓴다", () => {
    expect(body(".learning-shell-stage-fill-flow")).toBe("flex-grow: 1;");
    expect(body(".learning-shell-stage-fill-scroll")).toBe("min-height: 100%;");
  });

  test("LS-CSS6. 합친 흐름 상자는 스크롤을 채우고 border-box다", () => {
    const rule = body(".learning-shell-flow-fill-scroll");
    expect(rule).toContain("min-height: 100%;");
    expect(rule).toContain("box-sizing: border-box;");
  });

  test("LS-CSS7. 기본 무대 · 흐름 규칙은 그대로다", () => {
    expect(body(".learning-shell-stage")).toBe(
      "display: flex; flex-direction: column; flex-shrink: 0;",
    );
    expect(body(".learning-shell-flow")).toBe(
      "display: flex; flex-direction: column; gap: var(--libitum-layout-gap-block); " +
        "padding-left: var(--libitum-layout-screen-padding-x); " +
        "padding-right: var(--libitum-layout-screen-padding-x); " +
        "padding-top: var(--libitum-layout-gap-block);",
    );
  });

  test("LS-CSS8. 장면 규칙은 base 규칙 뒤에 온다", () => {
    const at = (needle: string): number => css.indexOf(needle);
    const stage = at(".learning-shell-stage {");
    const flow = at(".learning-shell-flow {");
    expect(stage).toBeGreaterThanOrEqual(0);
    expect(flow).toBeGreaterThanOrEqual(0);
    for (const name of [
      ".learning-shell-stage-scene-complete {",
      ".learning-shell-stage-fill-rest {",
      ".learning-shell-stage-fill-flow {",
      ".learning-shell-stage-fill-scroll {",
    ]) {
      expect(at(name)).toBeGreaterThan(stage);
    }
    expect(at(".learning-shell-flow-fill-scroll {")).toBeGreaterThan(flow);
  });
});
