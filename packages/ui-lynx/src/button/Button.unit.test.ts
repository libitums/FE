import { describe, expect, test } from "vitest";
import { color } from "@libitums/design-tokens";

import { getButtonContract, getButtonIconColor } from "./index";
import type { ButtonSize, ButtonVariant, ButtonWidth } from "./index";

describe("Button contract", () => {
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

describe("Button icon color", () => {
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
