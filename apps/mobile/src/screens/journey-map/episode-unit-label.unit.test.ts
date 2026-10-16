import { describe, expect, test } from "vitest";

import { openedUnitOf } from "./episode-unit-label";
import { journeyMapSections } from "./journey-map";
import type { JourneyMapSection, JourneyStepId } from "./journey-map";

// `unit` 계층: 띠 설명 줄의 unit 번호 — 열린 스텝이 든 구획과 그 스텝의 구획 안 자리(표지 00).

const tutorial = journeyMapSections[0] as JourneyMapSection;
const items = tutorial.items;

// 구획의 항목 자리(0부터)입니다 — 기대값을 데이터에서 읽어 순서가 바뀌면 같이 움직이게 합니다.
const indexOfStep = (id: JourneyStepId) =>
  items.findIndex((item) => item.kind === "standard" && item.step.id === id);

describe("openedUnitOf", () => {
  test("HN0(전제). 표지가 00, 첫 스텝(Your First Hello)이 01이다", () => {
    expect(items[0]?.kind).toBe("episode-intro");
    expect(indexOfStep("greeting")).toBe(1);
  });

  test("HN1. 열린 스텝이 없으면 undefined다", () => {
    expect(openedUnitOf(journeyMapSections, null)).toBeUndefined();
  });

  test("HN2. 열린 스텝이 든 구획과 그 스텝의 자리를 낸다", () => {
    expect(openedUnitOf(journeyMapSections, "greeting")).toEqual({ section: tutorial, unit: 1 });
    expect(openedUnitOf(journeyMapSections, "ordering")).toEqual({
      section: tutorial,
      unit: indexOfStep("ordering"),
    });
  });

  test("HN3. 이 구획들에 없는 스텝이면 undefined다", () => {
    const reduced: JourneyMapSection = {
      episode: tutorial.episode,
      items: [items[0], items[items.length - 1]] as JourneyMapSection["items"],
    };

    expect(openedUnitOf([reduced], "greeting")).toBeUndefined();
  });

  test("HN4. 스텝이 든 구획을 앞에서부터 찾는다 (스크롤 자리와 무관)", () => {
    const pending: JourneyMapSection = {
      episode: { kind: "pending", id: "tutorial", label: "Episode 3.", title: "Later." },
      items: [],
    };

    expect(openedUnitOf([pending, tutorial], "greeting")?.section).toBe(tutorial);
  });
});
