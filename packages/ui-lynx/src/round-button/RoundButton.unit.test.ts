import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { color } from "@libitums/design-tokens";
import { describe, expect, test } from "vitest";

import {
  getRoundButtonContract,
  getRoundButtonForegroundColor,
  hasPressedShade,
} from "./round-button.contract";

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

  test.each(["neutral", "brand", "overlay"] as const)(
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
      accessibilityLabel: "정보, loading",
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

  test.each([undefined, null, 1] as const)(
    "JS 소비자의 잘못된 accessibilityLabel=%j을 계약 오류로 거부한다",
    (accessibilityLabel) => {
      expect(() =>
        getRoundButtonContract({
          accessibilityLabel,
          icon: "<svg />",
        } as unknown as Parameters<typeof getRoundButtonContract>[0]),
      ).toThrow("RoundButton accessibilityLabel must not be empty");
    },
  );
});

describe("getRoundButtonForegroundColor", () => {
  test.each([
    [{ variant: "neutral" }, color.fg["neutral-subtle"]],
    [{ variant: "brand" }, color.brand.primary],
    [{ variant: "neutral", loading: true }, color.fg["neutral-subtle"]],
    [{ variant: "brand", loading: true }, color.brand.primary],
    [{ variant: "neutral", disabled: true }, color.gray[500]],
    [{ variant: "brand", disabled: true }, color.brand["reward-disabled-surface"]],
    [{ variant: "neutral", disabled: true, loading: true }, color.gray[500]],
    [{ variant: "brand", disabled: true, loading: true }, color.brand["reward-disabled-surface"]],
    [{ variant: "overlay" }, color.white],
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
    // SP3: 정적 spinner 블록에는 animation이 없다(회전은 loading 규칙이 건다).
    const spinnerBlock = styles.match(/\.ui-lynx-round-button-spinner\s*\{[^}]*\}/)?.[0] ?? "";
    expect(spinnerBlock).not.toMatch(/\banimation(?:-name)?\s*:/);
    // SP1: 0 → 360도 회전 keyframes
    expect(styles).toMatch(
      /@keyframes\s+ui-lynx-round-button-spin\s*\{\s*from\s*\{[^}]*rotate\(0deg\)[^}]*\}\s*to\s*\{[^}]*rotate\(360deg\)[^}]*\}\s*\}/,
    );
    // SP2: loading spinner가 토큰으로 돈다
    expect(styles).toMatch(
      /\.ui-lynx-round-button-loading\s+\.ui-lynx-round-button-spinner\s*\{[^}]*animation:\s*ui-lynx-round-button-spin var\(--libitum-motion-duration-spinner\) var\(--libitum-motion-easing-linear\) infinite/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button(?:-surface|-spinner)[^}]*border-radius:\s*var\(--libitum-radius-full\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-neutral\.ui-lynx-round-button-loading\s+\.ui-lynx-round-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-fg-neutral-subtle\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-brand\.ui-lynx-round-button-loading\s+\.ui-lynx-round-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-brand-primary\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-disabled\.ui-lynx-round-button-loading\s+\.ui-lynx-round-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-border-default\)/,
    );
  });

  test("SP4. spinner의 variant/state border-color 뒤에 loading 한정 top 투명 override가 온다", () => {
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
    const overlayRule =
      /\.ui-lynx-round-button-overlay\.ui-lynx-round-button-loading[^{]*\.ui-lynx-round-button-spinner\s*\{[^}]*border-color/.exec(
        styles,
      );
    if (overlayRule) borderColorRules.push(overlayRule.index);
    const override =
      /\.ui-lynx-round-button\.ui-lynx-round-button-loading\s+\.ui-lynx-round-button-spinner\s*\{[^}]*border-top-color:\s*transparent/.exec(
        styles,
      );
    expect(override).not.toBeNull();
    expect(override?.index ?? -1).toBeGreaterThan(Math.max(...borderColorRules));
    // (0,1,0) 단독 규칙으로는 variant 색이 이긴다 — 그런 top 투명 규칙은 없다.
    expect(styles).not.toMatch(
      /(?:^|\n)\s*\.ui-lynx-round-button-spinner\s*\{[^}]*border-top-color/,
    );
  });

  test("Pressed는 surface만 95%로 줄이고 loading/disabled에는 적용하지 않는다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-round-button:not\(\.ui-lynx-round-button-loading\):not\(\.ui-lynx-round-button-disabled\):active\s+\.ui-lynx-round-button-surface\s*\{[^}]*transform:\s*scale\(var\(--libitum-motion-scale-pressed\)\)/,
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
      /\.ui-lynx-round-button-disabled\s+\.ui-lynx-round-button-icon\s*\{[^}]*opacity:\s*var\(--libitum-opacity-disabled, 0\.35\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-disabled\.ui-lynx-round-button-loading\s+\.ui-lynx-round-button-spinner\s*\{[^}]*opacity:\s*1/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-motion-reduced[^{]*:active\s+\.ui-lynx-round-button-surface\s*\{[^}]*transform:\s*none/,
    );
  });
});

describe("getRoundButtonContract: 컨텍스트 motion", () => {
  const props = { accessibilityLabel: "정보", icon: "<svg />" };

  test("RBc1. 컨텍스트 reduced면 className 끝에 reduced 토큰이 붙고 필드 집합은 그대로다", () => {
    const reduced = getRoundButtonContract(props, "reduced");
    const standard = getRoundButtonContract(props);
    expect(reduced.className).toBe(
      "ui-lynx-round-button ui-lynx-round-button-neutral ui-lynx-round-button-m ui-lynx-round-button-motion-reduced",
    );
    expect(Object.keys(reduced)).toEqual(Object.keys(standard));
    expect({ ...reduced, className: "" }).toEqual({ ...standard, className: "" });
  });

  test("RBc2. 컨텍스트를 주지 않으면 standard className에 motion 토큰이 없다", () => {
    expect(getRoundButtonContract(props).className).toBe(
      "ui-lynx-round-button ui-lynx-round-button-neutral ui-lynx-round-button-m",
    );
  });
});

describe("hasPressedShade (RoundButton)", () => {
  test.each(["neutral", "brand"] as const)("RBs1. %s는 reduced에서 눌림 막을 낸다", (variant) => {
    expect(hasPressedShade(variant, "reduced")).toBe(true);
  });

  test.each([
    ["overlay", "reduced"],
    ["neutral", "standard"],
    ["overlay", "standard"],
  ] as const)("RBs2. (%s, %s)는 막을 내지 않는다", (variant, motion) => {
    expect(hasPressedShade(variant, motion)).toBe(false);
  });
});
