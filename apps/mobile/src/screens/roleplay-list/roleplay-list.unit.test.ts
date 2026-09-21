import { describe, expect, it } from "vitest";

import type { JourneyMapItem, JourneyStep } from "../journey-map/journey-map";
import {
  roleplayFormLabel,
  roleplayItemAccessibilityLabel,
  roleplayItemsFrom,
} from "./roleplay-list";
import type { RoleplayItem } from "./roleplay-list.contract";

// 계약: .agent-harness/work/lib-255/spec.md §2.3 · §3
// 계획: .agent-harness/work/lib-255/test-plan.md unit § `roleplay-list.unit.test.ts`
//
// fixture는 `JourneyMapItem`(type import)으로 이 파일 안에서 짓는다 — 여정 폴더의
// **값**을 가져오지 않는다(code.md 「import」). 실제 데이터 순서는 integration I1이 본다.
// 케이스 ID는 test-plan의 R1~R6 그대로다.

function standardStep(id: JourneyStep["id"]): JourneyMapItem {
  return { kind: "standard", step: { id, title: `스텝 ${id}`, description: `설명 ${id}` } };
}

const messengerItem: JourneyMapItem = {
  kind: "special",
  id: "appointment-confirmation",
  title: "약속 확인 메시지",
};

const phoneCallItem: JourneyMapItem = {
  kind: "phone-call",
  id: "appointment-confirmation-phone-call",
  title: "약속 확인 전화",
};

const visualNovelItem: JourneyMapItem = {
  kind: "visual-novel",
  id: "cafe-arrival-visual-novel",
  title: "카페에 도착한 지민",
};

describe("roleplayItemsFrom (LIB-255 계약 §2.3)", () => {
  // R1
  it("R1. standard·special·phone-call·visual-novel·standard 입력에서 셋을 뽑고 form 순서·필드가 정확하다", () => {
    const input: readonly JourneyMapItem[] = [
      standardStep("greeting"),
      messengerItem,
      phoneCallItem,
      visualNovelItem,
      standardStep("directions"),
    ];

    const result = roleplayItemsFrom(input);

    expect(result).toHaveLength(3);
    expect(result.map((item) => item.form)).toEqual(["messenger", "phone-call", "visual-novel"]);
    expect(result[0]).toEqual({
      form: "messenger",
      unitId: "appointment-confirmation",
      title: "약속 확인 메시지",
    });
    expect(result[1]).toEqual({
      form: "phone-call",
      unitId: "appointment-confirmation-phone-call",
      title: "약속 확인 전화",
    });
    expect(result[2]).toEqual({
      form: "visual-novel",
      unitId: "cafe-arrival-visual-novel",
      title: "카페에 도착한 지민",
    });
    // 필드가 form·unitId·title뿐이다 — toEqual이 초과 필드를 잡는다.
    for (const item of result) {
      expect(Object.keys(item).sort()).toEqual(["form", "title", "unitId"]);
    }
  });

  // R2
  it("R2. 입력 순서를 보존한다 — 비주얼 노벨이 메신저보다 앞선 fixture에서 출력도 그 순서다", () => {
    const input: readonly JourneyMapItem[] = [visualNovelItem, phoneCallItem, messengerItem];

    const result = roleplayItemsFrom(input);

    expect(result.map((item) => item.form)).toEqual(["visual-novel", "phone-call", "messenger"]);
  });

  // R3
  it("R3. 일반 스텝만 있는 입력은 빈 배열을 낸다", () => {
    const input: readonly JourneyMapItem[] = [
      standardStep("greeting"),
      standardStep("introduction"),
      standardStep("ordering"),
    ];

    expect(roleplayItemsFrom(input)).toEqual([]);
  });

  // R6 (roleplayItemsFrom 몫)
  it("R6. 같은 입력을 두 번 불러도 같은 값이고 입력 배열이 변하지 않는다", () => {
    const input: readonly JourneyMapItem[] = [messengerItem, phoneCallItem, visualNovelItem];
    const snapshot = [...input];

    const first = roleplayItemsFrom(input);
    const second = roleplayItemsFrom(input);

    expect(first).toEqual(second);
    expect(input).toEqual(snapshot);
  });
});

describe("roleplayFormLabel (LIB-255 계약 §2.3)", () => {
  // R4
  it("R4. 세 형태 각각을 한국어 낱말로 사상한다", () => {
    expect(roleplayFormLabel("messenger")).toBe("메신저");
    expect(roleplayFormLabel("phone-call")).toBe("전화");
    expect(roleplayFormLabel("visual-novel")).toBe("비주얼 노벨");
  });
});

describe("roleplayItemAccessibilityLabel (LIB-255 계약 §2.3)", () => {
  const fixtures: readonly RoleplayItem[] = [
    { form: "messenger", unitId: "appointment-confirmation", title: "약속 확인 메시지" },
    {
      form: "phone-call",
      unitId: "appointment-confirmation-phone-call",
      title: "약속 확인 전화",
    },
    { form: "visual-novel", unitId: "cafe-arrival-visual-novel", title: "카페에 도착한 지민" },
  ];

  // R5
  it("R5. 세 fixture 항목 각각 `${title}, ${formLabel}`이고 완료됨·잠김을 포함하지 않는다", () => {
    expect(roleplayItemAccessibilityLabel(fixtures[0])).toBe("약속 확인 메시지, 메신저");
    expect(roleplayItemAccessibilityLabel(fixtures[1])).toBe("약속 확인 전화, 전화");
    expect(roleplayItemAccessibilityLabel(fixtures[2])).toBe("카페에 도착한 지민, 비주얼 노벨");

    for (const item of fixtures) {
      const label = roleplayItemAccessibilityLabel(item);
      expect(label).not.toContain("완료됨");
      expect(label).not.toContain("잠김");
    }
  });

  // R6 (roleplayItemAccessibilityLabel 몫)
  it("R6. 같은 항목을 두 번 불러도 같은 값이다", () => {
    for (const item of fixtures) {
      expect(roleplayItemAccessibilityLabel(item)).toBe(roleplayItemAccessibilityLabel(item));
    }
  });
});
