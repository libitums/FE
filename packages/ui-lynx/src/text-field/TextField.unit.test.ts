import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { getTextFieldContract } from "./text-field.contract";

describe("getTextFieldContract", () => {
  test("기본 상태는 Empty + Unfocused + None + Enabled다", () => {
    expect(getTextFieldContract({ label: "이름", placeholder: "예: 김말랑" })).toEqual({
      accessibilityLabel: "이름",
      availability: "enabled",
      className: "ui-lynx-text-field ui-lynx-text-field-empty",
      content: "empty",
      interaction: "unfocused",
      nativeType: "text",
      validation: "none",
      visualState: "empty",
    });
  });

  test.each([
    [{ availability: "disabled", supporting: { kind: "error", message: "오류" } }, "disabled"],
    [{ availability: "read-only", supporting: { kind: "error", message: "오류" } }, "read-only"],
    [{ supporting: { kind: "error", message: "오류" } }, "error"],
    [{}, "focused"],
    [{}, "filled"],
  ] as const)("상태 우선순위를 적용한다: %j → %s", (overrides, expected) => {
    const focused = expected === "focused";
    const value = expected === "filled" ? "값" : "";
    expect(
      getTextFieldContract({ label: "이름", ...overrides }, { focused, value }).visualState,
    ).toBe(expected);
  });

  test.each([
    ["email", "email", undefined],
    ["password", "password", undefined],
    ["telephone", "tel", undefined],
    ["search", "text", "search"],
    ["url", "text", undefined],
  ] as const)("%s purpose를 native input 계약에 매핑한다", (purpose, nativeType, confirmType) => {
    const contract = getTextFieldContract({ accessibilityLabel: "입력", purpose });
    expect(contract.nativeType).toBe(nativeType);
    expect(contract.nativeConfirmType).toBe(confirmType);
  });

  test("오류와 counter를 보이는 label의 접근성 설명에 합친다", () => {
    expect(
      getTextFieldContract(
        {
          label: "이메일 주소",
          qualifier: "필수",
          supporting: {
            kind: "error",
            message: "name@example.com 형식으로 입력해 주세요.",
          },
          counter: { maxLength: 30 },
        },
        { focused: false, value: "hello" },
      ),
    ).toMatchObject({
      accessibilityLabel:
        "이메일 주소, 필수, 오류: name@example.com 형식으로 입력해 주세요., 30자 중 5자 입력",
      counterAccessibilityLabel: "30자 중 5자 입력",
      counterLabel: "5/30",
      validation: "error",
    });
  });

  test.each([
    [{}, "label or accessibilityLabel is required"],
    [{ label: " " }, "label must not be empty"],
    [{ accessibilityLabel: " " }, "accessibilityLabel must not be empty"],
    [{ label: "이름", supporting: { kind: "helper", message: " " } }, "supporting.message"],
    [{ label: "이름", counter: { maxLength: 0 } }, "counter.maxLength"],
    [{ label: "이름", trailing: { kind: "suffix", text: " " } }, "trailing.text"],
  ] as const)("불완전한 계약을 거부한다: %j", (props, message) => {
    expect(() => getTextFieldContract(props)).toThrow(message);
  });
});

describe("text-field.css", () => {
  const styles = readFileSync(resolve(process.cwd(), "src/text-field/text-field.css"), "utf8");

  test("56px 최소 높이, 16px padding과 radius.lg를 token으로 연결한다", () => {
    expect(styles).toMatch(/\.ui-lynx-text-field-surface\s*\{[^}]*min-height:\s*56px/);
    expect(styles).toContain("padding-left: var(--libitum-spacing-16)");
    expect(styles).toContain("padding-right: var(--libitum-spacing-16)");
    expect(styles).toContain("border-radius: var(--libitum-radius-lg)");
  });

  test("배타적 시각 상태를 semantic color token으로 표현한다", () => {
    for (const token of [
      "--libitum-color-brand-strong",
      "--libitum-color-feedback-incorrect-surface",
      "--libitum-color-feedback-incorrect",
      "--libitum-color-gray-100",
      "--libitum-color-gray-50",
      "--libitum-color-border-disabled",
    ]) {
      expect(styles).toContain(`var(${token})`);
    }
  });

  test("Trailing Action은 48px hit area와 공통 focus ring을 사용한다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-text-field-trailing-action\s*\{[^}]*width:\s*var\(--libitum-spacing-48\)[^}]*height:\s*var\(--libitum-spacing-48\)/,
    );
    expect(styles).toMatch(/\.ui-lynx-text-field-trailing-action:focus\s*\{[^}]*box-shadow:/);
  });
});
