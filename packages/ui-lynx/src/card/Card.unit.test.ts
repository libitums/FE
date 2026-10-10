import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { getCardContract, validateCardHeader } from "./card.contract";

const styles = readFileSync(resolve(process.cwd(), "src/card/card.css"), "utf8");

describe("getCardContract", () => {
  test("기본값은 static, M padding, LTR, 흰 면, 떠 있는 카드다", () => {
    expect(getCardContract({ children: null })).toEqual({
      interaction: "static",
      padding: "m",
      direction: "ltr",
      surface: "default",
      elevation: "raised",
      className:
        "ui-lynx-card ui-lynx-card-m ui-lynx-card-ltr ui-lynx-card-surface-default ui-lynx-card-elevation-raised ui-lynx-card-static",
      focusable: false,
      accessibilityElement: false,
    });
  });

  // 면과 떠 있는 정도는 서로 독립입니다 — 회색 면이면서 그림자가 없는 조합(학습 세션
  // 헤더)과 흰 면이면서 무대인 조합(학습 카드)이 둘 다 성립해야 합니다.
  test("면과 떠 있는 정도가 따로 class에 실린다", () => {
    expect(
      getCardContract({ children: null, surface: "secondary", elevation: "flat" }).className,
    ).toBe(
      "ui-lynx-card ui-lynx-card-m ui-lynx-card-ltr ui-lynx-card-surface-secondary ui-lynx-card-elevation-flat ui-lynx-card-static",
    );
    expect(getCardContract({ children: null, elevation: "stage" }).className).toBe(
      "ui-lynx-card ui-lynx-card-m ui-lynx-card-ltr ui-lynx-card-surface-default ui-lynx-card-elevation-stage ui-lynx-card-static",
    );
  });

  test("interactive 접근성 계약과 L padding, RTL class를 파생한다", () => {
    expect(
      getCardContract({
        children: null,
        interaction: "interactive",
        padding: "l",
        direction: "rtl",
        accessibilityLabel: "오늘의 학습",
        accessibilityDescription: "새로운 표현 5개",
        accessibilityRole: "link",
        bindtap: () => undefined,
      }),
    ).toEqual({
      interaction: "interactive",
      padding: "l",
      direction: "rtl",
      surface: "default",
      elevation: "raised",
      className:
        "ui-lynx-card ui-lynx-card-l ui-lynx-card-rtl ui-lynx-card-surface-default ui-lynx-card-elevation-raised ui-lynx-card-interactive",
      focusable: true,
      accessibilityElement: true,
      accessibilityLabel: "오늘의 학습",
      accessibilityDescription: "새로운 표현 5개",
      accessibilityRole: "link",
    });
  });

  test.each(["", "   ", undefined, null] as const)(
    "interactive의 빈 접근성 이름 %j을 거부한다",
    (accessibilityLabel) => {
      expect(() =>
        getCardContract({
          children: null,
          interaction: "interactive",
          accessibilityLabel,
          accessibilityRole: "button",
          bindtap: () => undefined,
        } as unknown as Parameters<typeof getCardContract>[0]),
      ).toThrow("Card accessibilityLabel must not be empty");
    },
  );

  test("빈 설명은 접근성 값에서 제거한다", () => {
    expect(
      getCardContract({
        children: null,
        interaction: "interactive",
        accessibilityLabel: "연습 시작",
        accessibilityDescription: "   ",
        accessibilityRole: "button",
        bindtap: () => undefined,
      }),
    ).not.toHaveProperty("accessibilityDescription");
  });

  test("문자열이 아닌 설명은 접근성 값에서 안전하게 제거한다", () => {
    expect(
      getCardContract({
        children: null,
        interaction: "interactive",
        accessibilityLabel: "연습 시작",
        accessibilityDescription: 5,
        accessibilityRole: "button",
        bindtap: () => undefined,
      } as unknown as Parameters<typeof getCardContract>[0]),
    ).not.toHaveProperty("accessibilityDescription");
  });

  test.each([
    [{ accessibilityRole: "menu" }, "Card accessibilityRole must be link or button"],
    [{ bindtap: undefined }, "Interactive Card bindtap must be a function"],
  ] as const)("잘못된 interactive 계약 %j을 거부한다", (override, message) => {
    expect(() =>
      getCardContract({
        children: null,
        interaction: "interactive",
        accessibilityLabel: "학습",
        accessibilityRole: "link",
        bindtap: () => undefined,
        ...override,
      } as unknown as Parameters<typeof getCardContract>[0]),
    ).toThrow(message);
  });
});

describe("getCardContract motion", () => {
  const staticProps = { children: null };
  const interactiveProps = {
    children: null,
    interaction: "interactive" as const,
    accessibilityLabel: "학습",
    accessibilityRole: "button" as const,
    bindtap: () => undefined,
  };

  test("U-C4: reduced면 static · interactive 모두 className 끝에 motion 표지가 붙고 나머지는 같다", () => {
    for (const [props, interaction] of [
      [staticProps, "static"],
      [interactiveProps, "interactive"],
    ] as const) {
      const standard = getCardContract(props);
      const reduced = getCardContract(props, "reduced");
      expect(reduced.className).toBe(`${standard.className} ui-lynx-card-motion-reduced`);
      expect(reduced.className).toMatch(
        new RegExp(`ui-lynx-card-${interaction} ui-lynx-card-motion-reduced$`),
      );
      expect({ ...reduced, className: "" }).toEqual({ ...standard, className: "" });
    }
  });

  test("U-C5: 인자가 없거나 standard면 className에 motion이 없다", () => {
    expect(getCardContract(staticProps).className).not.toContain("motion");
    expect(getCardContract(interactiveProps, "standard").className).not.toContain("motion");
    expect(getCardContract(interactiveProps, "standard")).toEqual(
      getCardContract(interactiveProps),
    );
  });
});

describe("validateCardHeader", () => {
  test.each([
    ["", undefined, "Card title must not be empty"],
    ["제목", " ", "Card overline must not be empty"],
  ] as const)("title=%j, overline=%j을 검증한다", (title, overline, message) => {
    expect(() => validateCardHeader(title, overline)).toThrow(message);
  });
});

describe("card.css", () => {
  // 면 · 모서리 · 그림자는 뿌리 규칙이 아니라 변형이 정합니다 — 뿌리에 두면 변형이
  // 매번 덮어써야 하고, 어느 값이 이기는지를 읽는 사람이 추적하게 됩니다.
  test("표면, radius, shadow와 padding 토큰을 사용한다", () => {
    expect(styles).toMatch(/\.ui-lynx-card\s*\{[^}]*width:\s*100%/);
    expect(styles).toMatch(
      /\.ui-lynx-card-surface-default\s*\{[^}]*background-color:\s*var\(--libitum-color-white\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-card-surface-secondary\s*\{[^}]*background-color:\s*var\(--libitum-color-background-secondary\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-card-elevation-raised\s*\{[^}]*border-radius:\s*var\(--libitum-radius-md\)[^}]*box-shadow:\s*var\(--libitum-elevation-shadow-s1\)/,
    );
    // `flat`은 그림자 선언이 아예 없습니다 — 없는 선언이 「띄우지 않는다」입니다.
    expect(styles).toMatch(
      /\.ui-lynx-card-elevation-flat\s*\{[^}]*border-radius:\s*var\(--libitum-radius-md\)[^}]*\}/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-card-elevation-stage\s*\{[^}]*border-radius:\s*var\(--libitum-radius-xl\)[^}]*box-shadow:\s*var\(--libitum-elevation-shadow-s3\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-card-m \.ui-lynx-card-content\s*\{[^}]*padding:\s*var\(--libitum-spacing-16\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-card-l \.ui-lynx-card-content\s*\{[^}]*padding:\s*var\(--libitum-spacing-24\)/,
    );
  });

  test("영역별 간격과 typography를 고정한다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-card-header \+ \.ui-lynx-card-body\s*\{[^}]*margin-top:\s*var\(--libitum-spacing-12\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-card-body \+ \.ui-lynx-card-footer,[^{]*\.ui-lynx-card-header \+ \.ui-lynx-card-footer\s*\{[^}]*margin-top:\s*var\(--libitum-spacing-20\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-card-title\s*\{[^}]*font-size:\s*var\(--libitum-typography-heading-s-font-size\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-card-body-text\s*\{[^}]*font-size:\s*var\(--libitum-typography-body-m-font-size\)/,
    );
  });

  test("interactive pressed, focus, motion과 RTL 화살표를 정의한다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-card-interactive:active\s*\{[^}]*background-color:\s*var\(--libitum-color-gray-100\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-card-interactive:focus-visible,[^{]*\.ui-lynx-card-interactive:focus\s*\{[^}]*var\(--libitum-color-border-strong\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-card-interactive\s*\{[^}]*transition-duration:\s*var\(--libitum-motion-duration-pressed\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-card-rtl \.ui-lynx-card-arrow\s*\{[^}]*transform:\s*scaleX\(-1\)/,
    );
  });
});

describe("card.css motion", () => {
  /** 선택자 정규식에 맞는 첫 규칙의 본문. 규칙이 없으면 빈 문자열이라 단언이 값 불일치로 실패합니다. */
  const ruleBody = (css: string, selector: RegExp): string =>
    new RegExp(`(?:^|[}/])\\s*${selector.source}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
  const body = (selector: RegExp): string => ruleBody(styles, selector);

  test("U-C1: interactive 눌림은 pressed scale 토큰을 쓰고 기존 색을 유지한다", () => {
    const active = body(/\.ui-lynx-card-interactive:active/);
    expect(active).toMatch(/transform:\s*scale\(var\(--libitum-motion-scale-pressed\)\)/);
    expect(active).toMatch(/background-color:\s*var\(--libitum-color-gray-100\)/);
  });

  test("U-C2: interactive base는 background-color와 transform을 전환한다", () => {
    const base = body(/\.ui-lynx-card-interactive/);
    expect(base).toMatch(/transition-property:\s*background-color,\s*transform/);
    expect(base).toMatch(/transition-duration:\s*var\(--libitum-motion-duration-pressed\)/);
  });

  test("U-C3: reduced는 눌림 transform을 없애고 색 전환만 남긴다", () => {
    expect(body(/\.ui-lynx-card-motion-reduced\.ui-lynx-card-interactive:active/)).toMatch(
      /transform:\s*none/,
    );
    const base = body(/\.ui-lynx-card-motion-reduced\.ui-lynx-card-interactive/);
    expect(base).toMatch(/transition-property:\s*background-color\s*;/);
    expect(base).not.toMatch(/transform/);
  });
});
