import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { catalogSectionDomId } from "./catalog-map";
import type { CatalogMapSection } from "./catalog-map.contract";
import { journeyMapSections } from "./journey-map";
import { tutorialItemId } from "./journey-map-rows";
import {
  catalogLessonKeys,
  catalogProps,
  catalogReadySections,
  mapScreen,
  stubHost,
  tutorialAllDone,
  type Rect,
} from "./JourneyMapScreen.test-support";

// `ui` 계층: 화면이 새 구획 · 줄 구조를 결선했는지 — 낭독 요소의 문서 순서 · 맵 상자의 직계 자식 ·
// 머리 카드 상자의 id만 봅니다. 줄 나누기 · 셀 구조의 세부는 구획 테스트가 지고, 낭독 순서가 기기에서
// 실제로 그렇게 읽히는지는 e2e(수동)만 닫습니다.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mapBox = (): Element => screen.getByTestId("journey-map-screen-map");

const tutorialItems = journeyMapSections.flatMap((section) => section.items);

// 맵의 유닛 목록 순서입니다 — 튜토리얼 항목 → 카탈로그(구획 안은 표지 → 레슨들 → 최종).
function expectedUnitTestIds(catalogSections: readonly CatalogMapSection[]): string[] {
  return [
    ...tutorialItems.map((item) => `ui-lynx-learning-unit-${tutorialItemId(item)}`),
    ...catalogSections.flatMap((section) =>
      section.kind === "catalog-ready"
        ? [
            `ui-lynx-learning-unit-catalog-cover-${section.episodeId}`,
            ...[...section.lessonKeys, section.finalKey].map(
              (key) => `ui-lynx-learning-unit-catalog-unit-${section.episodeId}-${key}`,
            ),
          ]
        : [],
    ),
  ];
}

describe("JourneyMapScreen 줄 결선", () => {
  test("UG-A1. 낭독 요소의 문서 순서가 유닛 목록 순서와 같고 줄 · 셀 상자는 낭독 요소가 아니다", () => {
    render(mapScreen({ catalog: catalogProps() }));

    // 줄 구조가 서 있어야 이 단언이 줄 · 셀을 지나는 순서를 본 것입니다.
    expect(screen.queryAllByTestId("journey-map-row").length).toBeGreaterThan(0);

    const spoken = Array.from(mapBox().querySelectorAll('[accessibility-element="true"]'));
    const ids = spoken.map((element) => element.getAttribute("data-testid") ?? "");
    expect(ids).toEqual(expectedUnitTestIds(catalogReadySections));
    for (const id of ids) {
      expect(id.startsWith("journey-map-row")).toBe(false);
      expect(id.startsWith("journey-map-cell-")).toBe(false);
    }
  });

  test("UG-A1b. 유닛 아래 라벨은 따로 낭독 정지가 되지 않는다(이름은 유닛 표식이 진다)", () => {
    render(mapScreen({ catalog: catalogProps() }));

    const labels = Array.from(
      mapBox().querySelectorAll(".journey-step-node-label, .journey-special-unit-label"),
    );
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label.getAttribute("accessibility-element")).toBe("false");
    }
  });

  test("UG-A2. 맵 상자의 직계 자식은 튜토리얼 구획 → 카탈로그 슬롯 그대로이고 줄이 구획 밖으로 새지 않는다", () => {
    render(mapScreen({ catalog: catalogProps() }));

    const children = Array.from(mapBox().children);
    expect(children).toHaveLength(2);
    expect(children[0]?.getAttribute("id")).toBe("journey-map-screen-episode-tutorial");
    expect(
      children[1] === screen.getByTestId("journey-map-screen-catalog") ||
        children[1]?.contains(screen.getByTestId("journey-map-screen-catalog")),
    ).toBe(true);
    for (const child of children) {
      expect(child.getAttribute("data-testid")).not.toBe("journey-map-row");
    }
  });

  // 머리 카드는 스크롤 자리로 구획을 고릅니다 — 세 갈래(튜토리얼 · 카탈로그 본문 · 카탈로그 본문 없음)를
  // 보려고 구획 자리를 재는 답과 스크롤 이벤트를 줍니다.
  const sections: readonly CatalogMapSection[] = [
    {
      kind: "catalog-ready",
      episodeId: "u01-water",
      ordinal: 1,
      title: "Alley",
      lessonKeys: catalogLessonKeys,
      finalKey: "RP",
      completionKeys: ["RP"],
      cultureKeys: [],
    },
    {
      kind: "catalog-unavailable",
      episodeId: "u02-x",
      ordinal: 2,
      title: "Soon",
      reason: "pending",
    },
  ];
  const sectionRects = (): Record<string, Rect> => ({
    "#journey-map-screen-episode-tutorial": { top: 100, height: 800 },
    [`#${catalogSectionDomId("u01-water")}`]: { top: 1100, height: 800 },
    [`#${catalogSectionDomId("u02-x")}`]: { top: 2100, height: 100 },
  });

  const headerBoxes = (): Element[] =>
    Array.from(
      screen.getByTestId("journey-map-screen").querySelectorAll("#journey-map-screen-header"),
    );

  // 머리 띠는 스텝 말풍선이 열린 동안만 섭니다. 자동 스크롤 · 말풍선이 재는 `#journey-map-screen-header`는
  // 띠 자리의 측정 손잡이가 늘 지고, 말풍선이 없으면 높이가 0입니다.
  test.each([
    ["튜토리얼", null],
    ["카탈로그 본문", 1500],
    ["카탈로그 본문 없음", 2500],
  ] as const)(
    "UG-A3. %s 자리에서도 측정 손잡이 하나가 id를 진다(띠 없음 · 높이 0)",
    (_label, scrollTop) => {
      const host = stubHost({ rects: sectionRects() });
      act(() => {
        render(mapScreen({ progress: tutorialAllDone, catalog: catalogProps({ sections }) }));
      });
      if (scrollTop !== null) {
        host.scroll(scrollTop);
      }

      const boxes = headerBoxes();
      expect(boxes).toHaveLength(1);
      expect((boxes[0]?.getAttribute("class") ?? "").split(/\s+/)).toContain(
        "journey-map-screen-header-anchor",
      );
      expect(boxes[0]?.getAttribute("style") ?? "").toMatch(/height:\s*0px/);
      expect(screen.queryByTestId("ui-lynx-episode-header")).toBeNull();
    },
  );
});
