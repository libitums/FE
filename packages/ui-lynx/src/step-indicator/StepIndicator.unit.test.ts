import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { getStepIndicatorContract } from "./step-indicator.contract";

describe("getStepIndicatorContract", () => {
  test("현재 단계를 기준으로 completed/current/upcoming 순서를 만든다", () => {
    const contract = getStepIndicatorContract({ currentStep: 2, totalSteps: 4 });

    expect(contract).toEqual({
      accessibilityLabel: "4단계 중 2단계",
      steps: [
        { number: 1, status: "completed" },
        { number: 2, status: "current" },
        { number: 3, status: "upcoming" },
        { number: 4, status: "upcoming" },
      ],
    });
    expect(contract.steps.filter(({ status }) => status === "current")).toHaveLength(1);
  });

  test.each([
    { currentStep: 1, totalSteps: 2, accessibilityLabel: "2단계 중 1단계" },
    { currentStep: 5, totalSteps: 5, accessibilityLabel: "5단계 중 5단계" },
  ])("2–5단계 경계값을 허용한다: %j", ({ accessibilityLabel, ...props }) => {
    const contract = getStepIndicatorContract(props);

    expect(contract.steps).toHaveLength(props.totalSteps);
    expect(contract.accessibilityLabel).toBe(accessibilityLabel);
    expect(contract.steps.filter(({ status }) => status === "current")).toHaveLength(1);
  });

  test.each([
    [{ currentStep: 1, totalSteps: 1 }, "totalSteps must be an integer between 2 and 5"],
    [{ currentStep: 1, totalSteps: 6 }, "totalSteps must be an integer between 2 and 5"],
    [{ currentStep: 1, totalSteps: 2.5 }, "totalSteps must be an integer between 2 and 5"],
    [{ currentStep: 0, totalSteps: 3 }, "currentStep must be an integer between 1 and totalSteps"],
    [{ currentStep: 4, totalSteps: 3 }, "currentStep must be an integer between 1 and totalSteps"],
    [
      { currentStep: 1.5, totalSteps: 3 },
      "currentStep must be an integer between 1 and totalSteps",
    ],
  ] as const)("잘못된 단계 계약 %j을 거부한다", (props, message) => {
    expect(() => getStepIndicatorContract(props)).toThrow(message);
  });

  test("두 값이 모두 잘못되면 totalSteps를 먼저 검증한다", () => {
    expect(() => getStepIndicatorContract({ currentStep: 0, totalSteps: 1 })).toThrow(
      "totalSteps must be an integer between 2 and 5",
    );
  });
});

describe("step-indicator.css", () => {
  const styles = readFileSync(
    resolve(process.cwd(), "src/step-indicator/step-indicator.css"),
    "utf8",
  );

  test("32px 원, 2px 선과 label.m 숫자 계약을 token으로 고정한다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-step-indicator-circle\s*\{[^}]*width:\s*var\(--libitum-spacing-32\)[^}]*height:\s*var\(--libitum-spacing-32\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-step-indicator-circle\s*\{[^}]*border-radius:\s*var\(--libitum-radius-full\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-step-indicator-circle\s*\{[^}]*border-width:\s*var\(--libitum-stroke-width-strong\)/,
    );
    expect(styles).toMatch(/\.ui-lynx-step-indicator-circle-completed\s*\{[^}]*border-width:\s*0/);
    expect(styles).toMatch(
      /\.ui-lynx-step-indicator-connector\s*\{[^}]*height:\s*var\(--libitum-stroke-width-strong\)[^}]*flex-grow:\s*1/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-step-indicator-number\s*\{[^}]*font-size:\s*var\(--libitum-typography-label-m-font-size\)[^}]*line-height:\s*var\(--libitum-typography-label-m-line-height\)/,
    );
  });

  test("세 상태와 왼쪽 단계 기준 연결선의 정확한 semantic token을 사용한다", () => {
    expect(styles).toContain("var(--libitum-color-brand-strong)");
    expect(styles).toContain("var(--libitum-color-fg-neutral-inverted)");
    expect(styles).toContain("var(--libitum-color-white)");
    expect(styles).toContain("var(--libitum-color-fg-brand)");
    expect(styles).toContain("var(--libitum-color-fg-neutral-subtle)");
    expect(styles).toContain("var(--libitum-color-fg-neutral-muted)");
    expect(styles).toMatch(
      /\.ui-lynx-step-indicator-connector-completed\s*\{[^}]*background-color:\s*var\(--libitum-color-brand-strong\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-step-indicator-connector-current\s*,\s*\.ui-lynx-step-indicator-connector-upcoming\s*\{[^}]*background-color:\s*var\(--libitum-color-fg-neutral-subtle\)/,
    );
  });
});
