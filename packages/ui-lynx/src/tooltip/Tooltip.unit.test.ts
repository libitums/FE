import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { getTooltipContract, resolveTooltipLayout } from "./tooltip.contract";

describe("getTooltipContract", () => {
  test("기본 계약은 Top Center Arrow On Neutral Visible LTR이다", () => {
    expect(getTooltipContract({ message: "학습 힌트 보기" })).toEqual({
      accessibilityElement: true,
      alignment: "center",
      arrow: "on",
      className:
        "ui-lynx-tooltip ui-lynx-tooltip-top ui-lynx-tooltip-align-center ui-lynx-tooltip-arrow-on ui-lynx-tooltip-tone-neutral ui-lynx-tooltip-visible ui-lynx-tooltip-ltr",
      contentLanguage: "ui",
      direction: "ltr",
      placement: "top",
      tone: "neutral",
      visibility: "visible",
    });
  });

  test.each(["top", "bottom", "start", "end"] as const)(
    "%s placement를 독립 class로 유지한다",
    (placement) => {
      expect(getTooltipContract({ message: "설명", placement }).className).toContain(
        `ui-lynx-tooltip-${placement}`,
      );
    },
  );

  test.each(["start", "center", "end"] as const)(
    "%s alignment를 독립 class로 유지한다",
    (alignment) => {
      expect(getTooltipContract({ message: "설명", alignment }).className).toContain(
        `ui-lynx-tooltip-align-${alignment}`,
      );
    },
  );

  test("Hidden은 접근성 트리에서도 숨긴다", () => {
    expect(getTooltipContract({ message: "설명", visibility: "hidden" })).toMatchObject({
      accessibilityElement: false,
      visibility: "hidden",
    });
  });

  test("학습 언어는 비어 있지 않은 languageTag를 보존한다", () => {
    expect(
      getTooltipContract({
        message: "Try again",
        contentLanguage: "learning",
        languageTag: " en-US ",
      }),
    ).toMatchObject({ contentLanguage: "learning", languageTag: "en-US" });
  });

  test.each([
    [{ message: "" }, "Tooltip message must not be empty"],
    [{ message: "   " }, "Tooltip message must not be empty"],
    [
      { message: "Try again", contentLanguage: "learning" },
      "Tooltip languageTag is required for learning content",
    ],
  ] as const)("불완전한 입력을 거부한다: %j", (props, message) => {
    expect(() =>
      getTooltipContract(props as unknown as Parameters<typeof getTooltipContract>[0]),
    ).toThrow(message);
  });
});

describe("resolveTooltipLayout", () => {
  const boundary = { x: 0, y: 0, width: 320, height: 640 };

  test("기본 방향이 경계를 벗어나면 반대 방향으로 Flip한다", () => {
    expect(
      resolveTooltipLayout({
        boundary,
        bubble: { width: 120, height: 36 },
        trigger: { x: 100, y: 10, width: 40, height: 40 },
        placement: "top",
      }),
    ).toEqual({ left: 60, top: 58, placement: "bottom", arrow: "on", arrowOffset: 60 });
  });

  test("교차 축이 잘리면 16px 경계 안으로 Shift한다", () => {
    expect(
      resolveTooltipLayout({
        boundary,
        bubble: { width: 160, height: 36 },
        trigger: { x: 0, y: 200, width: 24, height: 40 },
        placement: "top",
      }),
    ).toMatchObject({ left: 16, top: 156, placement: "top" });
  });

  test("Shift 뒤 Arrow가 모서리 12px 여백을 지킬 수 없으면 Arrow를 끈다", () => {
    expect(
      resolveTooltipLayout({
        boundary,
        bubble: { width: 160, height: 36 },
        trigger: { x: 0, y: 200, width: 24, height: 40 },
        placement: "top",
      }),
    ).toEqual({ left: 16, top: 156, placement: "top", arrow: "off" });
  });

  test("RTL의 Start는 물리 오른쪽에 배치한다", () => {
    expect(
      resolveTooltipLayout({
        boundary,
        bubble: { width: 100, height: 36 },
        trigger: { x: 100, y: 200, width: 40, height: 40 },
        placement: "start",
        direction: "rtl",
      }),
    ).toEqual({ left: 148, top: 202, placement: "start", arrow: "on", arrowOffset: 18 });
  });
});

describe("tooltip.css", () => {
  const styles = readFileSync(resolve(process.cwd(), "src/tooltip/tooltip.css"), "utf8");

  test("240px 상한과 spacing·radius·body.m·floating token을 사용한다", () => {
    expect(styles).toMatch(/\.ui-lynx-tooltip\s*\{[^}]*max-width:\s*240px/);
    expect(styles).toMatch(/z-index:\s*var\(--libitum-elevation-z-floating\)/);
    expect(styles).toMatch(/padding:\s*var\(--libitum-spacing-8\) var\(--libitum-spacing-12\)/);
    expect(styles).toMatch(/border-radius:\s*var\(--libitum-radius-md\)/);
    expect(styles).toContain("var(--libitum-typography-body-m-font-size)");
    expect(styles).toContain("var(--libitum-typography-body-m-line-height)");
  });

  test("Brand와 Neutral은 승인된 고대비 surface와 inverted foreground를 사용한다", () => {
    expect(styles).toContain("var(--libitum-color-brand-strong)");
    expect(styles).toContain("var(--libitum-color-gray-950)");
    expect(styles).toContain("var(--libitum-color-fg-neutral-inverted)");
    expect(styles).not.toContain("var(--libitum-color-brand-primary)");
  });

  test("Arrow는 12 × 6px token 크기와 모서리 12px 여백을 사용한다", () => {
    expect(styles).toMatch(/border-left:\s*var\(--libitum-spacing-6\) solid transparent/);
    expect(styles).toMatch(/border-right:\s*var\(--libitum-spacing-6\) solid transparent/);
    expect(styles).toMatch(/left:\s*var\(--libitum-spacing-12\)/);
    expect(styles).toMatch(/right:\s*var\(--libitum-spacing-12\)/);
  });

  test("표시 전환은 opacity와 d2 enter·exit easing만 사용한다", () => {
    expect(styles).toMatch(/transition-property:\s*opacity/);
    expect(styles).toMatch(/transition-duration:\s*var\(--libitum-motion-duration-d2\)/);
    expect(styles).toContain("var(--libitum-motion-easing-enter)");
    expect(styles).toContain("var(--libitum-motion-easing-exit)");
    expect(styles).not.toMatch(/transition-property:[^;]*(transform|width|height)/);
  });
});
