import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층: CSS · allowlist 텍스트에 선언이 있는지만 봅니다(선례: journey-map-row.css.unit.test.ts).

const dir = resolve(process.cwd(), "src/screens/journey-map");
const motionVar = "var(--libitum-motion-";

/** 파일이 없으면 빈 문자열이라 이어지는 단언이 값 불일치로 실패합니다. */
function readText(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "") : "";
}

const readCss = (file: string): string => readText(resolve(dir, file));

type Rule = { readonly selector: string; readonly body: string };

function rulesOf(css: string): readonly Rule[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? "").trim(),
    body: (match[2] ?? "").replace(/\s+/g, " "),
  }));
}

/** 선택자 목록 중 하나가 `name` 그대로인 규칙들의 본문 */
function exactBody(css: string, name: string): string {
  return rulesOf(css)
    .filter((rule) => rule.selector.split(",").some((part) => part.trim() === name))
    .map((rule) => rule.body)
    .join(" ");
}

/** 선택자에 클래스 `name`이 (더 긴 이름의 앞부분이 아니게) 든 규칙들의 본문 */
function bodyOf(css: string, name: string): string {
  const pattern = new RegExp(`${name.replace(/\./g, "\\.")}(?![\\w-])`);
  return rulesOf(css)
    .filter((rule) => pattern.test(rule.selector))
    .map((rule) => rule.body)
    .join(" ");
}

/** `animation` 선언 값(첫 토큰인 keyframe 이름은 뺍니다) */
function animationValues(css: string): readonly string[] {
  return [...css.matchAll(/animation(?:-[a-z-]+)?:\s*([^;}]+)/g)].map((match) =>
    (match[1] ?? "").trim().split(/\s+/).slice(1).join(" "),
  );
}

/** 토큰 참조를 뺀 값에 시간 · 곡선 리터럴이 남았는지(allowlist 리터럴 제외) */
function literalLeftovers(value: string, allowed: readonly string[]): readonly string[] {
  const rest = value.replace(/var\([^)]*\)/g, " ");
  const found = [
    ...(rest.match(/\b\d+(?:\.\d+)?m?s\b/g) ?? []),
    ...(rest.match(/\b(?:ease-in-out|ease-in|ease-out|ease|linear|cubic-bezier)\b/g) ?? []),
  ];
  return found.filter((text) => !allowed.includes(text));
}

/** 비항등 `scale()` 숫자 리터럴 집합(토큰 참조는 숫자가 아니라 건너뜁니다) */
function scaleLiterals(css: string): readonly number[] {
  const numbers = [...css.matchAll(/\bscale\(([^()]*)\)/g)]
    .flatMap((match) => (match[1] ?? "").split(","))
    .map((argument) => argument.trim())
    .filter((argument) => /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(argument))
    .map(Number)
    .filter((value) => Math.abs(value) !== 1);
  return [...new Set(numbers)].sort((a, b) => a - b);
}

describe("step-sheet-motion.css", () => {
  const css = readCss("step-sheet-motion.css");
  const band = ".journey-map-screen-episode-header";

  test("SMK1-a. 등장 선택자들이 있다", () => {
    const selectors = [
      `${band}-awaiting`,
      `${band}-enter`,
      `${band}-motion-reduced`,
      ".step-sheet-pop-awaiting",
      ".step-sheet-pop-enter",
      ".step-sheet-pop-motion-reduced",
      ".step-sheet-progress-fill-enter",
      ".step-sheet-progress-percent-pop-enter",
      ".step-sheet-start-glow",
    ];
    for (const selector of selectors) {
      expect(bodyOf(css, selector), selector).not.toBe("");
    }
  });

  test("SMK1-b. 대기는 투명하고 transform이 없다", () => {
    for (const name of [`${band}-awaiting`, ".step-sheet-pop-awaiting"]) {
      const body = bodyOf(css, name);
      expect(body, name).toMatch(/opacity:\s*0\b/);
      expect(body, name).not.toContain("transform");
    }
  });

  test("SMK1-c. reduced는 불투명도 페이드만(d2 · linear)이다", () => {
    for (const name of [`${band}-motion-reduced`, ".step-sheet-pop-motion-reduced"]) {
      const body = bodyOf(css, name);
      expect(body, name).toContain("animation");
      expect(body, name).not.toContain("transform");
      expect(body, name).toContain(`${motionVar}duration-d2)`);
      expect(body, name).toContain(`${motionVar}easing-linear)`);
    }
  });

  test("SMK1-d. 모든 animation의 시간 · 곡선은 토큰이거나 1600ms뿐이다", () => {
    const values = animationValues(css);
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(literalLeftovers(value, ["1600ms"]), value).toEqual([]);
    }
  });

  test("SMK1-e. 숨쉬기는 1600ms 3회이고 끝없이 반복하지 않는다", () => {
    const glow = bodyOf(css, ".step-sheet-start-glow");
    expect(glow).toContain("1600ms");
    expect(glow).toMatch(/(^|\s)3(\s|;|$)/);
    expect(glow).not.toContain("infinite");
    expect(css).not.toContain("infinite");
  });

  test("SMK1-f. @media가 없고 넘침 래퍼는 overflow: visible이다", () => {
    expect(css).not.toBe("");
    expect(css).not.toContain("@media");
    for (const name of [
      ".step-sheet-pop",
      ".step-sheet-start-wrap",
      ".step-sheet-progress-percent-pop",
    ]) {
      expect(exactBody(css, name), name).toMatch(/overflow:\s*visible/);
    }
  });
});

describe("journey-step-node-motion.css", () => {
  const css = readCss("journey-step-node-motion.css");

  test("SMK2-a. 노드 등장 선택자들이 있다", () => {
    const selectors = [
      ".journey-step-node-stage",
      ".journey-step-node-burst",
      ".journey-step-node-pop",
      ".journey-step-node-pop-enter",
      ".journey-step-node-halo",
      ".journey-step-node-ray",
      ".journey-step-node-spark",
      ".journey-step-node-spark-square",
      ".journey-step-node-spark-round",
    ];
    for (const selector of selectors) {
      expect(bodyOf(css, selector), selector).not.toBe("");
    }
  });

  test("SMK2-b. 튕김 바닥은 scale-pressed 토큰이고 시간 · 곡선은 전부 토큰이다", () => {
    expect(css).toContain("scale(var(--libitum-motion-scale-pressed))");
    const values = animationValues(css);
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(literalLeftovers(value, []), value).toEqual([]);
    }
  });

  test("SMK2-c. reduced 규칙이 없고 넘침 래퍼는 overflow: visible이다", () => {
    expect(css).not.toBe("");
    expect(css).not.toContain("-motion-reduced");
    for (const name of [
      ".journey-step-node-stage",
      ".journey-step-node-burst",
      ".journey-step-node-pop",
    ]) {
      expect(exactBody(css, name), name).toMatch(/overflow:\s*visible/);
    }
  });

  test("SMK2-d. overflow: visible 사슬 — 노드부터 줄까지, 말풍선 안쪽까지", () => {
    const chain: ReadonlyArray<readonly [string, string]> = [
      ["journey-step-node.css", ".journey-step-node"],
      ["journey-special-unit.css", ".journey-special-unit"],
      ["journey-map-row.css", ".journey-map-row"],
      ["journey-map-row.css", ".journey-map-cell"],
      ["journey-map-row.css", ".journey-map-cell-body"],
      ["step-sheet.css", ".step-sheet-anchor"],
      ["step-sheet.css", ".step-sheet-progress"],
      ["step-sheet.css", ".step-sheet-progress-row"],
    ];
    for (const [file, selector] of chain) {
      expect(exactBody(readCss(file), selector), `${file} ${selector}`).toMatch(
        /overflow:\s*visible/,
      );
    }
  });
});

describe("motion-literals allowlist", () => {
  const stepSheetPath = "apps/mobile/src/screens/journey-map/step-sheet-motion.css";
  const nodePath = "apps/mobile/src/screens/journey-map/journey-step-node-motion.css";

  test("SMK3-a. 두 CSS가 사유와 함께 allowlist에 있다", () => {
    const raw = readText(resolve(process.cwd(), "../../devtools/motion-literals/allowlist.json"));
    const entries = JSON.parse(raw === "" ? "[]" : raw) as ReadonlyArray<{
      readonly path: string;
      readonly reason: string;
    }>;
    for (const path of [stepSheetPath, nodePath]) {
      const entry = entries.find((candidate) => candidate.path === path);
      expect(entry, path).toBeDefined();
      expect((entry?.reason ?? "").length, path).toBeGreaterThan(20);
    }
  });

  test("SMK3-b. 비항등 scale 리터럴 집합이 디자인과 같다", () => {
    expect(scaleLiterals(readCss("step-sheet-motion.css"))).toEqual([0.35, 0.98, 1.06, 1.3]);
    expect(scaleLiterals(readCss("journey-step-node-motion.css"))).toEqual([0.3, 0.6, 1.12, 1.5]);
  });

  test("SMK3-c. 다른 파일에는 새 비항등 scale 리터럴이 없다", () => {
    // 가드: 새 모션 파일이 있어야 이 단언이 공허하지 않다.
    expect(scaleLiterals(readCss("step-sheet-motion.css")).length).toBeGreaterThan(0);
    expect(scaleLiterals(readCss("step-sheet.css"))).toEqual([]);
    const header = readText(
      resolve(process.cwd(), "../../packages/ui-lynx/src/episode-header/episode-header.css"),
    );
    expect(header).not.toBe("");
    expect(scaleLiterals(header)).toEqual([]);
  });
});
