import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import {
  getCompactNumericInputContract,
  getCompactNumericInputValue,
} from "./compact-numeric-input.contract";

const styles = readFileSync(
  resolve(process.cwd(), "src/compact-numeric-input/compact-numeric-input.css"),
  "utf8",
);

describe("getCompactNumericInputValue", () => {
  test.each([
    ["", ""],
    ["7", "7"],
    ["57", "7"],
    ["ab8cd", "8"],
    ["-3.5", "5"],
    ["１２", ""],
  ])("%j에서 마지막 ASCII 숫자 한 자리만 반환한다", (input, expected) => {
    expect(getCompactNumericInputValue(input)).toBe(expected);
  });
});

describe("getCompactNumericInputContract", () => {
  test("기본값은 M, Empty, interactive 상태다", () => {
    expect(getCompactNumericInputContract({ accessibilityLabel: "반복 횟수" })).toEqual({
      accessibilityLabel: "반복 횟수",
      className: "ui-lynx-compact-numeric-input ui-lynx-compact-numeric-input-m",
      defaultValue: "",
      disabled: false,
      error: false,
      interactive: true,
      placeholder: undefined,
      size: "m",
    });
  });

  test.each(["s", "m", "l"] as const)("%s size class를 고정한다", (size) => {
    expect(getCompactNumericInputContract({ accessibilityLabel: "수량", size }).className).toBe(
      `ui-lynx-compact-numeric-input ui-lynx-compact-numeric-input-${size}`,
    );
  });

  test("defaultValue와 placeholder는 마지막 숫자 한 자리로 정규화한다", () => {
    expect(
      getCompactNumericInputContract({
        accessibilityLabel: "수량",
        defaultValue: "a42",
        placeholder: "예: 9",
      }),
    ).toMatchObject({ defaultValue: "2", placeholder: "9" });
  });

  test("Error와 Disabled 상태 class를 결합하고 Disabled interaction을 차단한다", () => {
    expect(
      getCompactNumericInputContract({
        accessibilityLabel: "수량",
        error: true,
        disabled: true,
      }),
    ).toMatchObject({
      className:
        "ui-lynx-compact-numeric-input ui-lynx-compact-numeric-input-m ui-lynx-compact-numeric-input-error ui-lynx-compact-numeric-input-disabled",
      error: true,
      disabled: true,
      interactive: false,
    });
  });

  test.each(["", "   "])("빈 accessibilityLabel %j을 거부한다", (accessibilityLabel) => {
    expect(() => getCompactNumericInputContract({ accessibilityLabel })).toThrow(
      "CompactNumericInput accessibilityLabel must not be empty",
    );
  });
});

describe("compact-numeric-input.css", () => {
  test("S/M/L frame, typography, radius를 design-system token으로 고정한다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-compact-numeric-input-s\s*\{[^}]*width:\s*var\(--libitum-spacing-48\)[^}]*height:\s*56px[^}]*border-radius:\s*var\(--libitum-radius-md\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-compact-numeric-input-m\s*\{[^}]*width:\s*var\(--libitum-spacing-64\)[^}]*height:\s*72px[^}]*border-radius:\s*var\(--libitum-radius-lg\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-compact-numeric-input-l\s*\{[^}]*width:\s*72px[^}]*height:\s*80px[^}]*border-radius:\s*var\(--libitum-radius-lg\)/,
    );
    for (const [size, typography] of [
      ["s", "s"],
      ["m", "m"],
      ["l", "l"],
    ]) {
      expect(styles).toMatch(
        new RegExp(
          `\\.ui-lynx-compact-numeric-input-${size}\\s*\\{[^}]*font-size:\\s*var\\(--libitum-typography-heading-${typography}-font-size\\)[^}]*line-height:\\s*var\\(--libitum-typography-heading-${typography}-line-height\\)[^}]*letter-spacing:\\s*var\\(--libitum-typography-heading-${typography}-letter-spacing\\)`,
        ),
      );
    }
  });

  test("Empty, Focused, Error, Disabled 및 focus ring 상태를 token으로 표현한다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-compact-numeric-input\s*\{[^}]*background-color:\s*var\(--libitum-color-gray-100\)[^}]*color:\s*var\(--libitum-color-fg-neutral\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-compact-numeric-input:focus,\s*\.ui-lynx-compact-numeric-input-focused\s*\{[^}]*background-color:\s*var\(--libitum-color-white\)[^}]*border-width:\s*var\(--libitum-stroke-width-thin\)[^}]*border-color:\s*var\(--libitum-color-brand-strong\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-compact-numeric-input-error(?:,|\s*\{)[\s\S]*background-color:\s*var\(--libitum-color-feedback-incorrect-surface\)[^}]*color:\s*var\(--libitum-color-feedback-incorrect-text\)[^}]*border-color:\s*var\(--libitum-color-feedback-incorrect\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-compact-numeric-input-disabled\s*\{[^}]*background-color:\s*var\(--libitum-color-gray-50\)[^}]*color:\s*var\(--libitum-color-fg-disabled\)[^}]*box-shadow:\s*none/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-compact-numeric-input:not\(\.ui-lynx-compact-numeric-input-disabled\):focus-visible\s*\{[^}]*box-shadow:\s*0 0 0 var\(--libitum-stroke-width-strong\) var\(--libitum-color-white\),\s*0 0 0 var\(--libitum-spacing-4\) var\(--libitum-color-border-strong\)/,
    );
  });
});
