import { color } from "@libitums/design-tokens";
import { describe, expect, test } from "vitest";

import { getLearningUnitContract, hasPressedShade } from "./learning-unit.contract";

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
      accessibilityLabel: "쇼핑 표현 듣기, locked",
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
    ["active", "learning", color.white, "듣기, current"],
    ["clear", "tick", color.white, "듣기, completed"],
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
    ).toMatchObject({ accessibilityLabel: "문화 이야기, completed, story" });
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
      accessibilityLabel: "1단원 쇼핑 표현 듣기, story",
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

describe("getLearningUnitContract: 컨텍스트 motion", () => {
  test("LUc1. 컨텍스트 reduced면 className 마지막 토큰이 reduced이고 필드 집합은 그대로다", () => {
    const props = {
      accessibilityLabel: "쇼핑 표현 듣기",
      icon,
      status: "available",
      focused: true,
    } as const;
    const reduced = getLearningUnitContract(props, "reduced");
    const standard = getLearningUnitContract(props);
    const tokens = reduced.className.split(" ");
    expect(tokens.at(-1)).toBe("ui-lynx-learning-unit-motion-reduced");
    expect(tokens.at(-2)).toMatch(/-focused$/);
    expect(Object.keys(reduced)).toEqual(Object.keys(standard));
  });
});

describe("hasPressedShade (LearningUnit)", () => {
  test.each(["available", "active", "clear"] as const)(
    "LUs1. %s는 reduced에서 눌림 막을 낸다",
    (status) => {
      expect(hasPressedShade(status, "reduced")).toBe(true);
    },
  );

  test.each([
    ["default", "reduced"],
    ["active", "standard"],
  ] as const)("LUs2. (%s, %s)는 막을 내지 않는다", (status, motion) => {
    expect(hasPressedShade(status, motion)).toBe(false);
  });
});

// `unit` 계층: 「확인 중」(checking) 상태 계약. 진행을 아직 모르는 노드라 잠김 · 열림 · 완료 어느
// 쪽으로도 읽히면 안 됩니다.

describe("LearningUnit checking 계약", () => {
  test("LU1. 누를 수 없고 학습 아이콘을 유지하며 이름 뒤에 loading이 붙는다", () => {
    const contract = getLearningUnitContract({
      accessibilityLabel: "Lesson 1",
      icon,
      status: "checking",
    });

    expect(contract.status).toBe("checking");
    expect(contract.interactive).toBe(false);
    expect(contract.traits).toBe("disabled");
    expect(contract.iconKind).toBe("learning");
    expect(contract.className.split(" ")).toContain("ui-lynx-learning-unit-checking");
    expect(contract.accessibilityLabel).toBe("Lesson 1, loading");
  });

  test("LU2. narrative가 있으면 loading 뒤에 story가 붙는다", () => {
    expect(
      getLearningUnitContract({
        accessibilityLabel: "Lesson 1",
        icon,
        status: "checking",
        narrative: "narrative",
      }).accessibilityLabel,
    ).toBe("Lesson 1, loading, story");
  });

  test("LU3. focused를 줘도 포커스되지 않는다", () => {
    const contract = getLearningUnitContract({
      accessibilityLabel: "Lesson 1",
      icon,
      status: "checking",
      focused: true,
    });

    expect(contract.focused).toBe(false);
    expect(contract.className).not.toContain("-focused");
  });

  test.each([
    ["reduced", false],
    ["standard", false],
  ] as const)("LU4. hasPressedShade(checking, %s) -> %s", (motion, expected) => {
    expect(hasPressedShade("checking", motion)).toBe(expected);
  });

  test("LU6. 링 · 아이콘 색은 토큰 값이고 정답 색 · 브랜드 색이 아니다", () => {
    const tokenValues = new Set<string>();
    const collect = (node: unknown): void => {
      if (typeof node === "string") tokenValues.add(node);
      else if (node !== null && typeof node === "object") Object.values(node).forEach(collect);
    };
    collect(color);

    const contract = getLearningUnitContract({
      accessibilityLabel: "Lesson 1",
      icon,
      status: "checking",
    });

    for (const value of [contract.ringColor, contract.iconColor]) {
      expect(tokenValues.has(value)).toBe(true);
      expect(value).not.toBe(color.feedback.correct);
      expect(value).not.toBe(color.brand.primary);
    }
  });
});

describe("LearningUnit 기존 status 넷 (LU5 가드)", () => {
  test.each([
    ["default", false, "disabled", "lock", "locked"],
    ["available", true, "button", "learning", undefined],
    ["active", true, "button", "learning", "current"],
    ["clear", true, "button", "tick", "completed"],
  ] as const)("LU5. %s", (status, interactive, traits, iconKind, suffix) => {
    const contract = getLearningUnitContract({ accessibilityLabel: "Lesson 1", icon, status });

    expect(contract.status).toBe(status);
    expect(contract.interactive).toBe(interactive);
    expect(contract.traits).toBe(traits);
    expect(contract.iconKind).toBe(iconKind);
    expect(contract.accessibilityLabel).toBe(
      suffix === undefined ? "Lesson 1" : `Lesson 1, ${suffix}`,
    );
    expect(hasPressedShade(status, "reduced")).toBe(status !== "default");
    expect(hasPressedShade(status, "standard")).toBe(false);
  });
});
