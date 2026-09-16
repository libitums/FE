import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { getCardContract, validateCardHeader } from "./card.contract";

const styles = readFileSync(resolve(process.cwd(), "src/card/card.css"), "utf8");

describe("getCardContract", () => {
  test("기본값은 static, M padding, LTR이다", () => {
    expect(getCardContract({ children: null })).toEqual({
      interaction: "static",
      padding: "m",
      direction: "ltr",
      className: "ui-lynx-card ui-lynx-card-m ui-lynx-card-ltr ui-lynx-card-static",
      focusable: false,
      accessibilityElement: false,
    });
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
      className: "ui-lynx-card ui-lynx-card-l ui-lynx-card-rtl ui-lynx-card-interactive",
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

describe("validateCardHeader", () => {
  test.each([
    ["", undefined, "Card title must not be empty"],
    ["제목", " ", "Card overline must not be empty"],
  ] as const)("title=%j, overline=%j을 검증한다", (title, overline, message) => {
    expect(() => validateCardHeader(title, overline)).toThrow(message);
  });
});

describe("card.css", () => {
  test("표면, radius, shadow와 padding 토큰을 사용한다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-card\s*\{[^}]*width:\s*100%[^}]*background-color:\s*var\(--libitum-color-white\)[^}]*box-shadow:\s*var\(--libitum-elevation-shadow-s1\)/,
    );
    expect(styles).toMatch(/\.ui-lynx-card\s*\{[^}]*border-radius:\s*var\(--libitum-radius-md\)/);
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
