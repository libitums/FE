import { color } from "@libitums/design-tokens";
import { describe, expect, test } from "vitest";

import { getLearningUnitContract } from "./learning-unit.contract";

const icon = '<svg fill="currentColor" />';

describe("getLearningUnitContract", () => {
  test("기본값은 잠긴 Default이고 입력과 focus를 받지 않는다", () => {
    expect(getLearningUnitContract({ accessibilityLabel: "쇼핑 표현 듣기", icon })).toEqual({
      status: "default",
      narrative: "none",
      className: "ui-lynx-learning-unit ui-lynx-learning-unit-default",
      accessibilityLabel: "쇼핑 표현 듣기",
      accessibilityValue: undefined,
      traits: "disabled",
      interactive: false,
      iconKind: "lock",
      iconColor: color.gray[700],
    });
  });

  test.each([
    ["available", "learning", color.brand.primary, undefined],
    ["active", "learning", color.white, "현재 항목"],
    ["clear", "tick", color.white, "완료됨"],
  ] as const)("%s 상태 계약을 만든다", (status, iconKind, iconColor, accessibilityValue) => {
    expect(getLearningUnitContract({ accessibilityLabel: "듣기", icon, status })).toMatchObject({
      status,
      traits: "button",
      interactive: true,
      iconKind,
      iconColor,
      accessibilityValue,
    });
  });

  test("Narrative는 상태와 독립적이며 접근성 이름에 이야기 연결을 덧붙인다", () => {
    expect(
      getLearningUnitContract({
        accessibilityLabel: " 1단원 쇼핑 표현 듣기 ",
        icon,
        status: "available",
        narrative: "narrative",
        focused: true,
      }),
    ).toMatchObject({
      accessibilityLabel: "1단원 쇼핑 표현 듣기, 이야기 연결",
      className:
        "ui-lynx-learning-unit ui-lynx-learning-unit-available ui-lynx-learning-unit-narrative ui-lynx-learning-unit-focused",
    });
  });

  test("Default에서는 전달된 focused를 무시한다", () => {
    expect(
      getLearningUnitContract({ accessibilityLabel: "잠긴 단위", icon, focused: true }).className,
    ).not.toContain("focused");
  });

  test.each([
    [{ accessibilityLabel: "", icon }, "accessibilityLabel"],
    [{ accessibilityLabel: "듣기", icon: "" }, "icon"],
    [{ accessibilityLabel: "듣기", icon, status: "bad" }, "status"],
    [{ accessibilityLabel: "듣기", icon, narrative: "bad" }, "narrative"],
  ])("잘못된 입력 %o을 거부한다", (props, message) => {
    expect(() => getLearningUnitContract(props as never)).toThrow(message);
  });
});
