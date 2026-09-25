import { color } from "@libitums/design-tokens";
import { describe, expect, test } from "vitest";

import { getLearningUnitContract } from "./learning-unit.contract";

const icon = '<svg fill="currentColor" />';

describe("getLearningUnitContract", () => {
  test("기본값은 잠긴 Default이고 입력과 focus를 받지 않는다", () => {
    expect(getLearningUnitContract({ accessibilityLabel: "쇼핑 표현 듣기", icon })).toEqual({
      // `id`를 주지 않으면 testid가 이름 없는 기본값입니다 — 한 화면에 유닛이 하나뿐일
      // 때만 쓸 수 있습니다.
      testId: "ui-lynx-learning-unit",
      status: "default",
      narrative: "none",
      className: "ui-lynx-learning-unit ui-lynx-learning-unit-default",
      accessibilityLabel: "쇼핑 표현 듣기, 잠김",
      traits: "disabled",
      interactive: false,
      iconKind: "lock",
      iconColor: color.gray[700],
      ringColor: color.gray[400],
      focused: false,
    });
  });

  // 상태는 `accessibility-value`가 아니라 **이름 뒤 접미사**로 실립니다(ADR-0016 D3) —
  // iOS 실기에서 그 속성이 낭독되지 않는 것이 확인돼 D3이 통째로 걷은 자리입니다.
  // `available`에만 접미사가 없습니다 — 열려 있고 아직 손대지 않은 평범한 상태입니다.
  test.each([
    ["available", "learning", color.brand.primary, "듣기"],
    ["active", "learning", color.white, "듣기, 현재 항목"],
    ["clear", "tick", color.white, "듣기, 완료됨"],
  ] as const)("%s 상태 계약을 만든다", (status, iconKind, iconColor, accessibilityLabel) => {
    expect(getLearningUnitContract({ accessibilityLabel: "듣기", icon, status })).toMatchObject({
      status,
      traits: "button",
      interactive: true,
      iconKind,
      iconColor,
      ringColor: status === "clear" ? color.feedback.correct : color.gray[400],
      focused: false,
      accessibilityLabel,
    });
  });

  // 상태와 이야기 연결이 함께 붙는 순서를 고정합니다 — 이름 → 상태 → 이야기 연결.
  test("상태와 narrative 접미사가 이름 뒤에 그 순서로 함께 붙는다", () => {
    expect(
      getLearningUnitContract({
        accessibilityLabel: "문화 이야기",
        icon,
        status: "clear",
        narrative: "narrative",
      }),
    ).toMatchObject({ accessibilityLabel: "문화 이야기, 완료됨, 이야기 연결" });
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
      focused: true,
    });
  });

  // 한 화면에 유닛이 여럿 서는 것이 기본 용법이라, 주지 않으면 testid가 모두 같아
  // 어느 유닛인지 가릴 수 없습니다.
  test("id를 주면 testid 뒤에 붙는다", () => {
    expect(
      getLearningUnitContract({ id: "ordering", accessibilityLabel: "주문하기", icon }),
    ).toMatchObject({ testId: "ui-lynx-learning-unit-ordering" });
    expect(() =>
      getLearningUnitContract({ id: " ", accessibilityLabel: "주문하기", icon }),
    ).toThrow("id must not be empty");
  });

  test("Default에서는 전달된 focused를 무시한다", () => {
    const contract = getLearningUnitContract({
      accessibilityLabel: "잠긴 단위",
      icon,
      focused: true,
    });
    expect(contract.focused).toBe(false);
    expect(contract.className).not.toContain("focused");
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
