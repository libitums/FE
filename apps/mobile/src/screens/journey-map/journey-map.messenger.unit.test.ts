import { describe, expect, it } from "vitest";

import { journeyMapItems, journeySteps, standardUnitSteps, type JourneyUnit } from "./journey-map";

describe("journeyMapItems", () => {
  it("특별 항목은 유닛의 제목을 맵 데이터에 함께 전달한다", () => {
    expect(journeyMapItems.find((item) => item.kind === "messenger")).toEqual({
      kind: "messenger",
      id: "appointment-confirmation",
      title: "Appointment message",
    });
  });

  // ⟨개정⟩ 표지가 **맨 앞**에 붙었습니다 — 에피소드 표지가 맵 항목이 되었고(D2), 그
  // 자리는 구획의 첫 줄입니다. 항목이 아홉에서 **열**로 늡니다.
  it("표지를 맨 앞에 두고, 약속 잡기와 길 묻기 사이에 특별 항목을 둔다", () => {
    expect(
      journeyMapItems.map((item) => (item.kind === "standard" ? item.step.id : item.id)),
    ).toEqual([
      "tutorial-intro",
      "greeting",
      "introduction",
      "ordering",
      "appointment",
      "appointment-confirmation",
      "appointment-confirmation-phone-call",
      "cafe-arrival-visual-novel",
      "directions",
      "tutorial-final-test",
    ]);
  });

  it("전화 특별 항목은 계약의 고정 kind·ID·title을 가진다", () => {
    expect(journeyMapItems).toContainEqual({
      kind: "phone-call",
      id: "appointment-confirmation-phone-call",
      title: "Appointment call",
    });
  });

  // ⟨개정⟩ 맵 항목이 열로 늘어도 **스텝은 다섯 그대로**입니다 — 표지는 특별 유닛이라
  // 스텝을 갖지 않습니다. 항목 수와 스텝 수가 갈리는 것이 이 케이스가 지는 것입니다.
  it("항목이 열로 늘어도 journeySteps는 다섯 개와 순서를 유지한다", () => {
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
        title: "Appointment message",
        screen: "messenger",
      },
      { kind: "standard", steps: standardSteps.slice(4) },
    ];

    expect(standardUnitSteps(units)).toEqual(journeySteps);
  });
});
