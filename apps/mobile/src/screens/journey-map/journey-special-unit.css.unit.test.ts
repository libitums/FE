import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층: 한 줄 라벨(제목)의 톤 색 · 타이포 · 안내 겹 규칙이 CSS 텍스트에 있는지만 봅니다
// (선례: journey-map-row.css.unit.test.ts).

const srcDir = resolve(process.cwd(), "src");

/** 파일이 없거나 비어 있으면 빈 문자열이라 이어지는 단언이 값 불일치로 실패합니다. */
const readCss = (file: string): string => {
  const path = resolve(srcDir, file);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
};

type Rule = { readonly selector: string; readonly body: string };

/** 쉼표로 이은 선택자 목록은 선택자마다 같은 본문을 가진 규칙으로 풉니다. */
const rulesOf = (css: string): readonly Rule[] =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap((match) =>
    (match[1] ?? "").split(",").map((selector) => ({
      selector: selector.replace(/\s+/g, " ").trim(),
      body: (match[2] ?? "").replace(/\s+/g, " ").trim(),
    })),
  );

const bodyOf = (css: string, selector: string): string =>
  rulesOf(css)
    .filter((rule) => rule.selector === selector)
    .map((rule) => rule.body)
    .join(" ");

const colorOf = (body: string): string | undefined => /(?:^|[ ;])color:\s*([^;]+);/.exec(body)?.[1];

const mapCss = readCss("screens/journey-map/journey-special-unit.css");
const guideCss = readCss("components/first-unit-guide.css");

// 열림 · 끝은 brand.primary, 잠김 · 확인 중은 muted(ADR-0099 D4 — 표지 · 최종 · 막간 모두 한 줄).
const toneColors = [
  ["muted", "var(--libitum-color-fg-neutral-muted)"],
  ["brand", "var(--libitum-color-brand-primary)"],
  ["correct", "var(--libitum-color-brand-primary)"],
] as const;

describe("journey-special-unit.css", () => {
  test.each(toneColors)("SC7. %s 톤의 제목 색", (tone, title) => {
    expect(
      colorOf(bodyOf(mapCss, `.journey-special-unit-label-${tone} .journey-special-unit-title`)),
    ).toBe(title);
  });

  test("SC7. SPECIAL 윗줄 규칙이 없고 제목은 label-m 타이포 토큰 다섯을 쓴다", () => {
    expect(mapCss).not.toContain("journey-special-unit-eyebrow");
    const properties = ["font-family", "font-weight", "font-size", "line-height", "letter-spacing"];
    const body = bodyOf(mapCss, ".journey-special-unit-title");
    for (const property of properties) {
      expect(body).toContain(`${property}: var(--libitum-typography-label-m-${property})`);
    }
  });

  test("SC7. 속성 선택자를 쓰지 않는다", () => {
    expect(mapCss.length).toBeGreaterThan(0);
    expect(mapCss).not.toContain("[data-");
  });
});

describe("first-unit-guide.css", () => {
  test("SC7. 안내 겹은 제목이 흰색이고 선택자 클래스가 셋이다", () => {
    const selector =
      ".journey-special-unit-guided .journey-special-unit-label .journey-special-unit-title";
    expect(colorOf(bodyOf(guideCss, selector))).toBe("var(--libitum-color-white)");
    expect(selector.match(/\./g)).toHaveLength(3);
    expect(guideCss).not.toContain("journey-special-unit-eyebrow");
  });

  test("SC7. 속성 선택자를 쓰지 않는다", () => {
    expect(guideCss).not.toContain("[data-");
  });

  // 스크림 합성색 위에서 Face가 1.503:1까지 떨어집니다. 흰 Halo가 Face 옆을 흰색으로 두면 Face ↔ 흰색
  // 3.016:1 · 흰색 ↔ 스크림 4.533:1입니다(접근성 점검 U1). Active Halo 규칙(클래스 둘)보다 구체도가 높아야 합니다.
  test("SC9. 안내 겹의 배지는 Halo가 흰색이고 선택자 클래스가 셋이다", () => {
    const selector =
      ".journey-special-unit-guided .ui-lynx-special-unit .ui-lynx-special-unit-halo";
    expect(bodyOf(guideCss, selector)).toContain("background-color: var(--libitum-color-white)");
    expect(selector.match(/\./g)).toHaveLength(3);
  });
});

describe("앱 진입점", () => {
  // jsdom은 CSS를 적용하지 않아 이 import가 빠져도 ui 테스트가 통과합니다. 기기에서는 배지가 크기도
  // 색도 없이 사라지고 라벨만 남습니다(시뮬레이터 확인 2026-10-17).
  test("SC8. 진입점이 SpecialUnit CSS를 부른다", () => {
    const entry = readFileSync(resolve(srcDir, "app/index.tsx"), "utf8");
    expect(entry).toContain('import "@libitums/ui-lynx/special-unit/styles.css";');
  });
});
