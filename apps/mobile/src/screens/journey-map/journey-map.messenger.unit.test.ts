import { describe, expect, it } from "vitest";

import { journeyMapItems, journeySteps, standardUnitSteps, type JourneyUnit } from "./journey-map";

describe("journeyMapItems", () => {
  it("특별 항목은 유닛의 제목을 맵 데이터에 함께 전달한다", () => {
    expect(journeyMapItems.find((item) => item.kind === "messenger")).toEqual({
      kind: "messenger",
      id: "appointment-confirmation",
      title: "A Message from Minseo",
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
      "tutorial-listening",
      "tutorial-speaking",
      "tutorial-writing",
      "tutorial-final-test",
    ]);
  });

  it("전화 특별 항목은 계약의 고정 kind·ID·title을 가진다", () => {
    expect(journeyMapItems).toContainEqual({
      kind: "phone-call",
      id: "appointment-confirmation-phone-call",
      title: "A Call from Minseo",
    });
  });

  // 일반 스텝 여덟과 특별 유닛 다섯이 함께 맵을 구성합니다.
  it("항목이 열셋으로 늘어도 journeySteps는 여덟 개와 순서를 유지한다", () => {
    expect(journeySteps.map((step) => step.id)).toEqual([
      "greeting",
      "introduction",
      "ordering",
      "appointment",
      "directions",
      "tutorial-listening",
      "tutorial-speaking",
      "tutorial-writing",
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
        title: "A Message from Minseo",
        screen: "messenger",
      },
      { kind: "standard", steps: standardSteps.slice(4) },
    ];

    expect(standardUnitSteps(units)).toEqual(journeySteps);
  });
});
