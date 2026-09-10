import { describe, expect, it } from "vitest";

import { journeyMapItems, journeySteps, standardUnitSteps, type JourneyUnit } from "./journey-map";

describe("journeyMapItems (LIB-254 계약)", () => {
  it("특별 항목은 유닛의 제목을 맵 데이터에 함께 전달한다", () => {
    expect(journeyMapItems.find((item) => item.kind === "special")).toEqual({
      kind: "special",
      id: "appointment-confirmation",
      title: "약속 확인 메시지",
    });
  });

  it("약속 잡기와 길 묻기 사이에 특별 항목을 둔다", () => {
    expect(
      journeyMapItems.map((item) => (item.kind === "standard" ? item.step.id : item.id)),
    ).toEqual([
      "greeting",
      "introduction",
      "ordering",
      "appointment",
      "appointment-confirmation",
      "appointment-confirmation-phone-call",
      "directions",
    ]);
  });

  it("전화 특별 항목은 계약의 고정 kind·ID·title을 가진다", () => {
    expect(journeyMapItems).toContainEqual({
      kind: "phone-call",
      id: "appointment-confirmation-phone-call",
      title: "약속 확인 전화",
    });
  });

  it("기존 journeySteps 다섯 개와 순서를 유지한다", () => {
    expect(journeySteps.map((step) => step.id)).toEqual([
      "greeting",
      "introduction",
      "ordering",
      "appointment",
      "directions",
    ]);
  });

  it("special 유닛은 standardUnitSteps에 기여하지 않는다", () => {
    const standardSteps = journeyMapItems
      .filter((item) => item.kind === "standard")
      .map((item) => item.step);
    const units: readonly JourneyUnit[] = [
      { kind: "standard", steps: standardSteps.slice(0, 4) },
      {
        kind: "special",
        id: "appointment-confirmation",
        title: "약속 확인 메시지",
        screen: "messenger",
      },
      { kind: "standard", steps: standardSteps.slice(4) },
    ];

    expect(standardUnitSteps(units)).toEqual(journeySteps);
  });
});
