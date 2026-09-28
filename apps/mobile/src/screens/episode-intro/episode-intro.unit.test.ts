import { describe, expect, it } from "vitest";

import type { JourneyMapItem, JourneyMapSection } from "../journey-map/journey-map";
import { hasSeenEpisodeIntro, markEpisodeIntroSeen, sectionOfTarget } from "./episode-intro";

// `unit` 계층: 순수 함수의 입출력만 봅니다 (ADR-0006 D4). 구획은 이 파일 안에서 짓습니다
// — 여정 폴더의 **값**을 가져오지 않습니다(code.md 「import」).

function section(id: string, items: readonly JourneyMapItem[]): JourneyMapSection {
  return { episode: { id, label: `Episode ${id}.`, title: id, units: [] }, items };
}

const tutorial = section("tutorial", [
  { kind: "standard", step: { id: "greeting", title: "첫 인사", description: "" } },
  { kind: "messenger", id: "appointment-confirmation", title: "약속 확인 메시지" },
]);
const cafe = section("cafe", [
  { kind: "standard", step: { id: "ordering", title: "주문하기", description: "" } },
  { kind: "phone-call", id: "appointment-confirmation-phone-call", title: "약속 확인 전화" },
  { kind: "visual-novel", id: "cafe-arrival-visual-novel", title: "카페에 도착한 지민" },
]);
const sections = [tutorial, cafe];

describe("sectionOfTarget", () => {
  it("E1. 스텝이 속한 에피소드의 구획을 찾는다", () => {
    expect(sectionOfTarget(sections, { kind: "step", stepId: "ordering" })).toBe(cafe);
  });

  it("E2. 특별 유닛 셋도 종류마다 제 구획을 찾는다", () => {
    expect(
      sectionOfTarget(sections, { kind: "messenger", unitId: "appointment-confirmation" }),
    ).toBe(tutorial);
    expect(
      sectionOfTarget(sections, {
        kind: "phone-call",
        unitId: "appointment-confirmation-phone-call",
      }),
    ).toBe(cafe);
    expect(
      sectionOfTarget(sections, { kind: "visual-novel", unitId: "cafe-arrival-visual-novel" }),
    ).toBe(cafe);
  });

  it("E3. 종류가 다르면 같은 id라도 맞추지 않는다", () => {
    expect(() =>
      sectionOfTarget([tutorial], {
        kind: "phone-call",
        unitId: "appointment-confirmation-phone-call",
      }),
    ).toThrow(/어느 에피소드에도 없는 유닛/);
  });

  it("E4. 어느 구획에도 없으면 던진다", () => {
    expect(() => sectionOfTarget([], { kind: "step", stepId: "greeting" })).toThrow(
      /어느 에피소드에도 없는 유닛/,
    );
  });
});

describe("hasSeenEpisodeIntro · markEpisodeIntroSeen", () => {
  it("S1. 본 목록에 있으면 본 것이다", () => {
    expect(hasSeenEpisodeIntro(["tutorial"], "tutorial")).toBe(true);
    expect(hasSeenEpisodeIntro(["tutorial"], "cafe")).toBe(false);
  });

  it("S2. 더하면 끝에 붙고 입력을 변형하지 않는다", () => {
    const seen = ["tutorial"];

    expect(markEpisodeIntroSeen(seen, "cafe")).toEqual(["tutorial", "cafe"]);
    expect(seen).toEqual(["tutorial"]);
  });

  it("S3. 이미 있으면 같은 참조를 돌려준다", () => {
    const seen = ["tutorial"];

    expect(markEpisodeIntroSeen(seen, "tutorial")).toBe(seen);
  });
});
