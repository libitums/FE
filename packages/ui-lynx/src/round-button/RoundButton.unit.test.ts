import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { color } from "@libitums/design-tokens";
import { describe, expect, test } from "vitest";

import { getRoundButtonContract, getRoundButtonForegroundColor } from "./round-button.contract";

const styles = readFileSync(resolve(process.cwd(), "src/round-button/round-button.css"), "utf8");

describe("getRoundButtonContract", () => {
  test("기본값은 neutral, m, button trait 및 interactive다", () => {
    expect(getRoundButtonContract({ accessibilityLabel: "정보", icon: "<svg />" })).toEqual({
      variant: "neutral",
      size: "m",
      className: "ui-lynx-round-button ui-lynx-round-button-neutral ui-lynx-round-button-m",
      traits: "button",
      accessibilityLabel: "정보",
      interactive: true,
    });
  });

  test.each(["neutral", "brand"] as const)(
    "%s variant와 모든 size의 class 순서를 고정한다",
    (variant) => {
      for (const size of ["s", "m", "l", "xl"] as const) {
        expect(
          getRoundButtonContract({ accessibilityLabel: "정보", icon: "<svg />", variant, size })
            .className,
        ).toBe(`ui-lynx-round-button ui-lynx-round-button-${variant} ui-lynx-round-button-${size}`);
      }
    },
  );

  test("loading은 label에 로딩 중을 붙이고 interactive를 끈다", () => {
    expect(
      getRoundButtonContract({ accessibilityLabel: "정보", icon: "<svg />", loading: true }),
    ).toMatchObject({
      accessibilityLabel: "정보, 로딩 중",
      traits: "button",
      interactive: false,
      className: expect.stringContaining("ui-lynx-round-button-loading"),
    });
  });

  test.each([
    [{ disabled: true }, "disabled"],
    [{ loading: true }, "button"],
    [{ disabled: true, loading: true }, "disabled"],
  ] as const)("%j 상태는 interactive를 차단하고 %s semantics를 선택한다", (state, traits) => {
    expect(
      getRoundButtonContract({ accessibilityLabel: "정보", icon: "<svg />", ...state }),
    ).toMatchObject({ traits, interactive: false });
  });

  test.each(["", "   "])('빈 accessibilityLabel "%s"을 거부한다', (accessibilityLabel) => {
    expect(() => getRoundButtonContract({ accessibilityLabel, icon: "<svg />" })).toThrow(
      "RoundButton accessibilityLabel must not be empty",
    );
  });
});

describe("getRoundButtonForegroundColor", () => {
  test.each([
    [{ variant: "neutral" }, color.fg["neutral-subtle"]],
    [{ variant: "brand" }, color.fg.brand],
    [{ variant: "neutral", loading: true }, color.fg["neutral-subtle"]],
    [{ variant: "brand", loading: true }, color.fg.brand],
    [{ variant: "neutral", disabled: true }, color.gray[500]],
    [{ variant: "brand", disabled: true }, color.brand["reward-disabled-surface"]],
    [{ variant: "neutral", disabled: true, loading: true }, color.gray[500]],
    [{ variant: "brand", disabled: true, loading: true }, color.brand["reward-disabled-surface"]],
  ] as const)("%j 상태는 정확한 token identity를 반환한다", (state, expected) => {
    expect(
      getRoundButtonForegroundColor({ accessibilityLabel: "정보", icon: "<svg />", ...state }),
    ).toBe(expected);
  });
});

describe("round-button.css", () => {
  test("visual frame, icon, hit area size matrix를 고정한다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-round-button-s \.ui-lynx-round-button-surface\s*\{[^}]*width:\s*28px[^}]*height:\s*28px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-m \.ui-lynx-round-button-surface\s*\{[^}]*width:\s*36px[^}]*height:\s*36px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-l \.ui-lynx-round-button-surface\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-xl \.ui-lynx-round-button-surface\s*\{[^}]*width:\s*56px[^}]*height:\s*56px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-s[^}]*\.ui-lynx-round-button-icon[^}]*width:\s*16px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-m[^}]*\.ui-lynx-round-button-icon[^}]*width:\s*18px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-l[^}]*\.ui-lynx-round-button-icon[^}]*width:\s*20px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-xl[^}]*\.ui-lynx-round-button-icon[^}]*width:\s*24px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button\s*\{[^}]*width:\s*var\(--libitum-spacing-48\)[^}]*height:\s*var\(--libitum-spacing-48\)/,
    );
    expect(styles).toMatch(/\.ui-lynx-round-button-xl\s*\{[^}]*width:\s*56px[^}]*height:\s*56px/);
  });

  test("spinner와 원형 radius는 고정 token/authoritative 값이다", () => {
    expect(styles).toMatch(/\.ui-lynx-round-button-spinner[^}]*width:\s*12px[^}]*height:\s*12px/);
    expect(styles).toMatch(
      /\.ui-lynx-round-button-spinner[^}]*border(?:-width)?:\s*var\(--libitum-stroke-width-regular\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-spinner\s*\{[^}]*border-top-color:\s*transparent/,
    );
    const spinnerBlock = styles.match(/\.ui-lynx-round-button-spinner\s*\{[^}]*\}/)?.[0] ?? "";
    expect(spinnerBlock).not.toMatch(/\banimation(?:-name)?\s*:/);
    expect(styles).not.toMatch(/@keyframes\s+[^\{]*(?:round[-_]?button[-_]?spinner)/i);
    expect(styles).toMatch(
      /\.ui-lynx-round-button(?:-surface|-spinner)[^}]*border-radius:\s*var\(--libitum-radius-full\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-neutral\.ui-lynx-round-button-loading\s+\.ui-lynx-round-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-fg-neutral-subtle\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-brand\.ui-lynx-round-button-loading\s+\.ui-lynx-round-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-fg-brand\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-disabled\.ui-lynx-round-button-loading\s+\.ui-lynx-round-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-border-default\)/,
    );
  });

  test("spinner의 variant/state border-color 뒤에 top 투명 override가 온다", () => {
    const borderColorRules = [
      ".ui-lynx-round-button-neutral.ui-lynx-round-button-loading",
      ".ui-lynx-round-button-brand.ui-lynx-round-button-loading",
      ".ui-lynx-round-button-disabled.ui-lynx-round-button-loading",
    ].map((selector) => {
      const ruleStart = styles.indexOf(selector);
      expect(ruleStart).toBeGreaterThanOrEqual(0);
      const ruleEnd = styles.indexOf("}", ruleStart);
      expect(styles.slice(ruleStart, ruleEnd)).toMatch(/border-color\s*:/);
      return ruleStart;
    });
    const transparentRule = styles.match(
      /(?:\.ui-lynx-round-button-spinner[^,{]*|[^{}]*\.ui-lynx-round-button-spinner[^{}]*)\s*\{[^}]*border-top-color:\s*transparent/,
    );
    expect(transparentRule).not.toBeNull();
    const transparentRuleStart = transparentRule ? styles.indexOf(transparentRule[0]) : -1;
    expect(transparentRuleStart).toBeGreaterThan(Math.max(...borderColorRules));
  });

  test("Pressed는 surface만 95%로 줄이고 loading/disabled에는 적용하지 않는다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-round-button:not\(\.ui-lynx-round-button-loading\):not\(\.ui-lynx-round-button-disabled\):active\s+\.ui-lynx-round-button-surface\s*\{[^}]*transform:\s*scale\(0\.95\)/,
    );
  });

  test("focus ring은 strong 2px 두 겹이고 reduced motion은 scale을 제거한다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-round-button:not\(\.ui-lynx-round-button-disabled\):focus-visible[^}]*box-shadow:\s*0 0 0 var\(--libitum-stroke-width-strong\) var\(--libitum-color-white\),\s*0 0 0 var\(--libitum-spacing-4\) var\(--libitum-color-border-strong\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-disabled(?::focus-visible)?[^}]*box-shadow:\s*none/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-disabled\s+\.ui-lynx-round-button-icon\s*\{[^}]*opacity:\s*0\.35/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-disabled\.ui-lynx-round-button-loading\s+\.ui-lynx-round-button-spinner\s*\{[^}]*opacity:\s*1/,
    );
    expect(styles).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.ui-lynx-round-button:active[\s\S]*transform:\s*none/,
    );
  });
});
