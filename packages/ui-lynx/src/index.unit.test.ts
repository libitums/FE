import { describe, expect, test } from "vitest";
import { color } from "@libitums/design-tokens";

import {
  getButtonContract,
  getButtonIconColor,
  getRoundButtonContract,
  getRoundButtonForegroundColor,
  getStatusIndicatorLabel,
} from "./index";
import type { ButtonSize, ButtonVariant, ButtonWidth } from "./index";

describe("getButtonContract", () => {
  const variants: readonly ButtonVariant[] = ["neutral", "brand", "outline", "subtle", "text"];
  const sizes: readonly ButtonSize[] = ["s", "m", "l", "xl"];
  const widths: readonly ButtonWidth[] = ["hug", "fill"];

  test.each(variants)("%s variant를 닫힌 class 계약으로 변환한다", (variant) => {
    expect(getButtonContract({ label: "계속", variant }).className).toContain(
      `ui-lynx-button-${variant}`,
    );
  });

  test.each(sizes)("%s size를 닫힌 class 계약으로 변환한다", (size) => {
    expect(getButtonContract({ label: "계속", size }).className).toContain(
      `ui-lynx-button-${size}`,
    );
  });

  test.each(widths)("%s width를 닫힌 class 계약으로 변환한다", (width) => {
    expect(getButtonContract({ label: "계속", width }).className).toContain(
      `ui-lynx-button-${width}`,
    );
  });

  test("기본값은 neutral, m, hug이고 button trait이다", () => {
    expect(getButtonContract({ label: "계속" })).toEqual({
      className: "ui-lynx-button ui-lynx-button-neutral ui-lynx-button-m ui-lynx-button-hug",
      traits: "button",
    });
  });

  test("disabled와 loading 조합은 두 상태 class와 disabled trait을 싣는다", () => {
    expect(getButtonContract({ disabled: true, label: "계속", loading: true })).toEqual({
      className:
        "ui-lynx-button ui-lynx-button-neutral ui-lynx-button-m ui-lynx-button-hug ui-lynx-button-disabled ui-lynx-button-loading",
      traits: "disabled",
    });
  });

  test("loading은 상태 class를 추가하지만 button trait을 유지한다", () => {
    expect(getButtonContract({ label: "계속", loading: true })).toEqual({
      className:
        "ui-lynx-button ui-lynx-button-neutral ui-lynx-button-m ui-lynx-button-hug ui-lynx-button-loading",
      traits: "button",
    });
  });
});

describe("getButtonIconColor", () => {
  test.each([
    ["neutral", color.gray[50]],
    ["brand", color.white],
    ["outline", color.fg["neutral-muted"]],
    ["subtle", color.fg["neutral-muted"]],
    ["text", color.fg.brand],
  ] as const)("%s variant의 기본 전경색을 따른다", (variant, expected) => {
    expect(getButtonIconColor({ label: "계속", variant })).toBe(expected);
  });

  test("disabled 전경색은 variant별 스펙을 따른다", () => {
    expect(getButtonIconColor({ disabled: true, label: "계속", variant: "neutral" })).toBe(
      color.fg.disabled,
    );
    expect(getButtonIconColor({ disabled: true, label: "계속", variant: "text" })).toBe(
      color.gray[300],
    );
  });
});

describe("getStatusIndicatorLabel", () => {
  test("보이는 라벨이 상태 이름이면 중복하지 않는다", () => {
    expect(getStatusIndicatorLabel({ label: "완료", status: "completed" })).toBe("완료");
  });

  test.each([
    ["completed", "완료"],
    ["in-progress", "진행 중"],
    ["needs-retry", "다시 시도"],
    ["locked", "잠김"],
  ] as const)("%s 상태를 임의 라벨과 구분되는 접근성 이름에 포함한다", (status, name) => {
    expect(getStatusIndicatorLabel({ label: "상태", status })).toBe(`상태, ${name}`);
  });

  test("문맥, 보이는 라벨, 표준 상태 이름을 한 접근성 이름으로 결합한다", () => {
    expect(
      getStatusIndicatorLabel({
        contextLabel: "3단계",
        label: "다시 해보기",
        status: "needs-retry",
      }),
    ).toBe("3단계, 다시 해보기, 다시 시도");
  });
});

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
    ).toMatchObject({
      traits,
      interactive: false,
    });
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
