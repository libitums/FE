import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { getSpecialUnitContract } from "@libitums/ui-lynx/special-unit";
import {
  compositeOver,
  contrastRatio,
  cssDeclaration,
  parseCssColor,
  rgbaInValue,
  tokenColorValue,
} from "../../lib/wcag-contrast.test-support";

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

  // 사용자 결정 2026-11-22(ADR-0068 적용 기록) — 들린 노드는 안내를 닫았을 때와 같은 모양입니다.
  test("SC9. 안내 겹은 배지의 Halo · 면 · 두께를 덮어쓰지 않는다", () => {
    expect(rulesOf(guideCss).filter((rule) => /ui-lynx-special-unit/.test(rule.selector))).toEqual(
      [],
    );
  });

  // 흰 테가 빠져 Face ↔ 가림막은 1.503:1입니다. 알아보는 단서로 남는 두 대비는 지킵니다.
  test("SC10. 안내 겹에서 별 ↔ Face는 3:1, 라벨 ↔ 가림막은 4.5:1 이상이다", () => {
    const tokenRgb = (value: string) => parseCssColor(tokenColorValue(value)).rgb;
    const star = getSpecialUnitContract(
      { id: "cover", accessibilityLabel: "Intro", status: "available" },
      "standard",
    ).iconColor;
    const face = tokenRgb("var(--libitum-color-brand-primary)");
    expect(contrastRatio(parseCssColor(star).rgb, face)).toBeGreaterThanOrEqual(3);

    const scrim = rgbaInValue(
      cssDeclaration(
        bodyOf(guideCss, ".first-unit-map-scrim .ui-lynx-overlay"),
        "background-color",
      ),
    );
    if (scrim === undefined) throw new Error("가림막 색이 없습니다");
    const label = colorOf(
      bodyOf(
        guideCss,
        ".journey-special-unit-guided .journey-special-unit-label .journey-special-unit-title",
      ),
    );
    const veiled = compositeOver(scrim, tokenRgb("var(--libitum-color-background-primary)"));
    expect(contrastRatio(tokenRgb(label ?? ""), veiled)).toBeGreaterThanOrEqual(4.5);
  });

  // Android는 들린 상자(래퍼 · 노드 묶음)마다 네이티브 View라 그 밖에 선 글에는 TalkBack 초점이 가지 않습니다
  // (GL10t, 2026-11-22 기기 red). 두 상자가 글 몫만큼 아래로 커지고, 같은 만큼의 음수 여백으로 배치는 그대로입니다.
  test("SC11. 들린 두 상자는 안내 글을 품고, 배치 · 글 자리는 그대로다", () => {
    const px = (selector: string, property: string): number =>
      Number.parseFloat(cssDeclaration(bodyOf(guideCss, selector), property) ?? "NaN");
    const wrapper = ".catalog-cover-illustrated-guided";
    const item = ".catalog-cover-illustrated-guided .journey-special-unit-guided";
    const room = px(wrapper, "padding-bottom");

    // 글 위 24 + 상하 안쪽 24 · 24 + 글 네 줄(줄 60 — 미얀마어 · 큰 글자)
    expect(room).toBeGreaterThanOrEqual(24 + 24 + 24 + 4 * 60);
    expect(px(wrapper, "margin-bottom")).toBe(-room);
    expect(px(item, "padding-bottom")).toBe(room);
    expect(px(item, "margin-bottom")).toBe(-room);
    // 노드 묶음이 124 폭이면 초점이 글 가운데만 잡습니다.
    expect(px(item, "width")).toBe(px(".first-unit-map-tooltip", "width"));
    expect(px(".catalog-cover-illustrated-guided .first-unit-map-tooltip", "margin-top")).toBe(
      24 - room,
    );
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
