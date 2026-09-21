import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { color } from "@libitums/design-tokens";
import { describe, expect, test } from "vitest";

import { getAnswerLabelContract } from "./answer-label.contract";

describe("AnswerLabel contract", () => {
  test("Pending은 과제별 문구와 기본 solid, m, brand 계약을 사용한다", () => {
    expect(getAnswerLabelContract({ result: "pending", label: "잘 들어 보세요" })).toEqual({
      accessibilityLabel: "잘 들어 보세요",
      className:
        "ui-lynx-answer-label ui-lynx-answer-label-pending ui-lynx-answer-label-solid ui-lynx-answer-label-m",
      emphasis: "solid",
      foregroundColor: color.fg["neutral-inverted"],
      icon: null,
      label: "잘 들어 보세요",
      result: "pending",
      size: "m",
      tone: "brand",
    });
  });

  test.each([
    ["correct", "정답이에요", "tick", "positive"],
    ["incorrect", "오답이에요", "cross", "negative"],
  ] as const)("%s는 기본 문구, 고정 icon과 tone을 사용한다", (result, label, icon, tone) => {
    expect(getAnswerLabelContract({ result })).toMatchObject({ result, label, icon, tone });
  });

  test("과제별 문구와 문제 문맥을 접근성 이름으로 결합한다", () => {
    expect(
      getAnswerLabelContract({
        result: "incorrect",
        label: "다시 생각해 보세요",
        contextLabel: "3번 문제",
        emphasis: "subtle",
        size: "l",
      }),
    ).toMatchObject({
      accessibilityLabel: "3번 문제, 다시 생각해 보세요",
      emphasis: "subtle",
      size: "l",
      foregroundColor: color.feedback["incorrect-text"],
    });
  });

  test.each([
    { result: "pending", label: "" },
    { result: "pending", label: "   " },
  ] as const)("기본 문구가 없는 Pending은 빈 Label을 거부한다: %#", (props) => {
    expect(() => getAnswerLabelContract(props)).toThrow(/AnswerLabel label/);
  });

  test.each([
    ["correct", "정답이에요"],
    ["incorrect", "오답이에요"],
  ] as const)("%s의 빈 사용자 문구는 기본 문구를 사용한다", (result, label) => {
    expect(getAnswerLabelContract({ result, label: "   " })).toMatchObject({ label });
  });

  test("사용자 문구의 앞뒤 공백을 제거한다", () => {
    expect(getAnswerLabelContract({ result: "correct", label: "  맞았어요  " })).toMatchObject({
      label: "맞았어요",
      accessibilityLabel: "맞았어요",
    });
  });

  test("지원하지 않는 Result를 명확한 오류로 거부한다", () => {
    const props = { result: "unknown" } as unknown as Parameters<typeof getAnswerLabelContract>[0];

    expect(() => getAnswerLabelContract(props)).toThrow(
      "AnswerLabel result must be pending, correct, or incorrect",
    );
  });

  test("크기, 색과 전환은 디자인 토큰만 사용한다", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "src/answer-label/answer-label.css"),
      "utf8",
    );
    for (const token of [
      "--libitum-spacing-32",
      "--libitum-spacing-40",
      "--libitum-spacing-48",
      "--libitum-icon-size-xs",
      "--libitum-icon-size-sm",
      "--libitum-icon-size-md",
      "--libitum-radius-md",
      "--libitum-radius-lg",
      "--libitum-color-brand-primary",
      "--libitum-color-feedback-correct",
      "--libitum-color-feedback-incorrect",
      "--libitum-motion-duration-color",
      "--libitum-motion-easing-easing",
    ]) {
      expect(styles).toContain(`var(${token})`);
    }
    expect(styles).toContain("width: fit-content");
    expect(styles).not.toMatch(/#[0-9a-f]{3,8}/i);
  });

  test("글자색은 상속에 기대지 않고 상태마다 직접 선언한다", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "src/answer-label/answer-label.css"),
      "utf8",
    );
    expect(styles).not.toMatch(/color:\s*inherit/);
    expect(styles).toMatch(
      /\.ui-lynx-answer-label-solid \.ui-lynx-answer-label-text\s*\{[^}]*color:\s*var\(--libitum-color-fg-neutral-inverted\)/,
    );
    for (const [result, token] of [
      ["pending", "--libitum-color-fg-brand"],
      ["correct", "--libitum-color-feedback-correct-text"],
      ["incorrect", "--libitum-color-feedback-incorrect-text"],
    ] as const) {
      expect(styles).toContain(
        `.ui-lynx-answer-label-${result}.ui-lynx-answer-label-subtle .ui-lynx-answer-label-text {\n  color: var(${token});`,
      );
    }
  });
});
