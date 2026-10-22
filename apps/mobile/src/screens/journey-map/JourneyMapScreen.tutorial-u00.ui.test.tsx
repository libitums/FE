import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import type { ComponentType, ReactNode } from "@lynx-js/react";

import { FirstUnitGuideProvider } from "../../components/first-unit-guide";
import { TUTORIAL_EPISODE_ID } from "../../lib/tutorial-episode";
import { CatalogCoverMapItem } from "./CatalogCoverMapItem";
import type { JourneyMapNodeStatus } from "./journey-map-types";
import { realSections, u00Catalog, u00Screen } from "./JourneyMapScreen.tutorial-u00.test-support";

// `ui` 계층: 맵은 카탈로그 구획만 그린다 — 첫 구획이 u00(Episode 0)이고, 첫 유닛 안내는 u00 표지에 합성으로 선다.

afterEach(() => {
  cleanup();
});

const coverId = `ui-lynx-special-unit-catalog-cover-${TUTORIAL_EPISODE_ID}`;
const cellOf = (key: string) =>
  screen.getByTestId(`journey-map-cell-catalog-${TUTORIAL_EPISODE_ID}-${key}`);
const nodeOf = (key: string) =>
  screen.getByTestId(
    `ui-lynx-${key === "RP" ? "special" : "learning"}-unit-catalog-unit-${TUTORIAL_EPISODE_ID}-${key}`,
  );
// 가림은 자손에만 걸린다(ADR-0016 D5) — 접근성 요소(accessibility-element)는 자기 속성을 세지 않고 부모부터 찾는다.
// 래퍼(셀 · 구획 상자)는 자신의 속성이 자손을 가리므로 자신부터 찾는다.
const hiderOf = (element: Element): Element | null | undefined =>
  (element.getAttribute("accessibility-element") === "true"
    ? element.parentElement
    : element
  )?.closest("[accessibility-elements-hidden]");
const hiddenFromReaders = (element: Element): boolean =>
  hiderOf(element)?.getAttribute("accessibility-elements-hidden") === "true";
const coverAttrOf = (element: Element): string | null | undefined =>
  hiderOf(element)?.getAttribute("accessibility-elements-hidden");

describe("맵 구획", () => {
  test("MU1. 실데이터 구획에서 튜토리얼 셀은 없고 u00 구획이 첫째이며 그 안 셀이 15(표지 + 14)다", () => {
    render(u00Screen(u00Catalog()));

    expect(screen.queryAllByTestId("ui-lynx-special-unit-tutorial-intro").length).toBe(0);
    expect(screen.queryAllByTestId("ui-lynx-learning-unit-greeting").length).toBe(0);
    expect(screen.queryAllByTestId("ui-lynx-special-unit-tutorial-final-test").length).toBe(0);
    const sections = Array.from(
      screen
        .getByTestId("journey-map-screen-map")
        .querySelectorAll('[data-testid^="catalog-section-"]'),
    );
    expect(sections[0]?.getAttribute("data-testid")).toBe(`catalog-section-${TUTORIAL_EPISODE_ID}`);
    expect(sections.length).toBe(4);
    expect(sections[0]?.querySelectorAll('[data-testid^="journey-map-cell-"]').length).toBe(15);
  });

  test("MU2. u00 노드 제목은 S1~S11 Lesson 1~11, S12 · S13 Culture, RP Final test이고 표지 낭독은 Episode 0. Episode intro다", () => {
    render(u00Screen(u00Catalog()));

    expect(screen.getByTestId(coverId).getAttribute("accessibility-label")).toContain(
      "Episode 0. Episode intro",
    );
    for (let lesson = 1; lesson <= 11; lesson += 1) {
      expect(nodeOf(`S${lesson}`).getAttribute("accessibility-label")).toContain(
        `Episode 0. Lesson ${lesson}`,
      );
    }
    expect(nodeOf("S12").getAttribute("accessibility-label")).toContain("Episode 0. Culture");
    expect(nodeOf("S13").getAttribute("accessibility-label")).toContain("Episode 0. Culture");
    expect(nodeOf("RP").getAttribute("accessibility-label")).toContain("Episode 0. Final test");
  });

  test("MU3. 진행이 없으면 u00 표지만 열려 있고, 옛 통과 기록이면 u01 표지도 열린다", () => {
    const { unmount } = render(u00Screen(u00Catalog()));
    expect(screen.getByTestId(coverId)).toHaveAttribute("data-status", "available");
    expect(nodeOf("S1")).toHaveAttribute("data-status", "default");
    expect(screen.getByTestId("ui-lynx-special-unit-catalog-cover-u01-water")).toHaveAttribute(
      "data-status",
      "default",
    );
    unmount();

    render(u00Screen(u00Catalog({ legacyTutorialPassed: true })));
    expect(screen.getByTestId("ui-lynx-special-unit-catalog-cover-u01-water")).toHaveAttribute(
      "data-status",
      "available",
    );
    expect(screen.getByTestId(coverId)).toHaveAttribute("data-status", "available");
    expect(nodeOf("S1")).toHaveAttribute("data-status", "default");
  });

  test("MU9. u00 레슨 말풍선을 열면 띠가 Episode 0, unit 01 · 제목 Tutorial이다", () => {
    render(u00Screen(u00Catalog({ progress: { [TUTORIAL_EPISODE_ID]: ["intro"] } })));

    act(() => {
      fireEvent.tap(nodeOf("S1"), { detail: { y: 300 } });
    });

    expect(screen.getByTestId("ui-lynx-episode-header-label")).toHaveTextContent(
      "Episode 0, unit 01",
    );
    expect(screen.getByTestId("ui-lynx-episode-header-title")).toHaveTextContent("Tutorial");
  });
});

describe("첫 유닛 안내", () => {
  const guided = (catalog = u00Catalog(), enabled = true) => (
    <FirstUnitGuideProvider enabled={enabled}>{u00Screen(catalog)}</FirstUnitGuideProvider>
  );

  test("MU4. 안내가 켜지면 가림막과 말풍선(Tap to start your lesson!)이 u00 표지 셀 안에 서고 표지가 안내 겹이다", () => {
    render(guided());

    expect(screen.getByTestId("first-unit-guide-map")).toBeInTheDocument();
    const tooltip = screen.getByTestId("first-unit-map-tooltip");
    expect(tooltip).toHaveTextContent("Tap to start your lesson!");
    expect(cellOf("intro").contains(tooltip)).toBe(true);
    expect(screen.getByTestId(coverId).closest(".journey-special-unit")).toHaveClass(
      "journey-special-unit-guided",
    );
  });

  test("MU5. 안내 중 u00 표지 밖 셀과 다른 구획은 낭독에서 가려지고 표지는 가려지지 않는다", () => {
    render(guided());

    expect(hiddenFromReaders(screen.getByTestId(coverId))).toBe(false);
    expect(hiddenFromReaders(cellOf("intro"))).toBe(false);
    expect(hiddenFromReaders(cellOf("S1"))).toBe(true);
    expect(hiddenFromReaders(cellOf("RP"))).toBe(true);
    expect(hiddenFromReaders(screen.getByTestId("catalog-section-u01-water"))).toBe(true);
    expect(hiddenFromReaders(screen.getByTestId("catalog-section-u03-mina"))).toBe(true);
  });

  test("TA1. 안내 중 준비 중 · 잠김 · 맨 끝 coming soon 구획도 부모 래퍼로 가려지고, 닫으면 false가 남는다", () => {
    const [u00, next] = realSections;
    if (u00 === undefined || next === undefined) throw new Error("fixture");
    const sections = [
      u00,
      {
        kind: "catalog-unavailable",
        episodeId: "u91-pending",
        ordinal: 1,
        title: "P",
        reason: "pending",
      },
      {
        kind: "catalog-unavailable",
        episodeId: "u92-locked",
        ordinal: 2,
        title: "L",
        reason: "client-too-old",
      },
      { ...next, episodeId: "u93-last", ordinal: 3 },
    ] as const;
    render(guided(u00Catalog({ sections })));
    const ids = [
      "catalog-pending-u91-pending",
      "catalog-unavailable-u92-locked",
      "catalog-coming-soon",
    ];

    for (const id of ids) {
      expect(hiddenFromReaders(screen.getByTestId(id))).toBe(true);
    }
    expect(screen.getByTestId("catalog-section-u93-last").parentElement).toHaveClass(
      "catalog-map-section-cover",
    );

    fireEvent.tap(screen.getByTestId(coverId), {});

    for (const id of ids) {
      expect(coverAttrOf(screen.getByTestId(id))).toBe("false");
    }
  });

  test("MU6. 안내 중 표지를 누르면 안내가 닫히고 시작이 u00 id로 정확히 한 번 올라간다", () => {
    const onStartCover = vi.fn<(episodeId: string) => void>();
    render(guided(u00Catalog({ onStartCover })));

    fireEvent.tap(screen.getByTestId(coverId), {});

    expect(screen.queryAllByTestId("first-unit-guide-map").length).toBe(0);
    expect(screen.queryAllByTestId("first-unit-map-tooltip").length).toBe(0);
    expect(onStartCover).toHaveBeenCalledTimes(1);
    expect(onStartCover).toHaveBeenCalledWith(TUTORIAL_EPISODE_ID);
  });

  test("MU6. 말풍선을 눌러도 같다", () => {
    const onStartCover = vi.fn<(episodeId: string) => void>();
    render(guided(u00Catalog({ onStartCover })));

    fireEvent.tap(screen.getByTestId("first-unit-map-tooltip"), {});

    expect(screen.queryAllByTestId("first-unit-guide-map").length).toBe(0);
    expect(screen.queryAllByTestId("first-unit-map-tooltip").length).toBe(0);
    expect(onStartCover).toHaveBeenCalledTimes(1);
    expect(onStartCover).toHaveBeenCalledWith(TUTORIAL_EPISODE_ID);
  });

  test("MU7. 안내가 꺼져 있으면 가림막과 말풍선이 없다", () => {
    render(guided(u00Catalog(), false));

    expect(screen.queryAllByTestId("first-unit-guide-map").length).toBe(0);
    expect(screen.queryAllByTestId("first-unit-map-tooltip").length).toBe(0);
    expect(hiddenFromReaders(cellOf("S1"))).toBe(false);
  });

  test("MU8. 첫 구획이 u00이 아니면(u01부터) 안내가 켜져 있어도 가림막이 없다", () => {
    render(guided(u00Catalog({ sections: realSections.slice(1) })));

    expect(screen.queryAllByTestId("first-unit-guide-map").length).toBe(0);
    expect(screen.queryAllByTestId("first-unit-map-tooltip").length).toBe(0);
  });
});

describe("CatalogCoverMapItem 합성", () => {
  type LooseCoverProps = {
    readonly episodeId: string;
    readonly ordinal: number;
    readonly status: JourneyMapNodeStatus;
    readonly onSelect: (episodeId: string) => void;
    readonly layer?: "map" | "guide";
    readonly children?: ReactNode;
  };
  const Cover = CatalogCoverMapItem as unknown as ComponentType<LooseCoverProps>;
  const base = {
    episodeId: TUTORIAL_EPISODE_ID,
    ordinal: 0,
    status: "available" as const,
    onSelect: vi.fn<(episodeId: string) => void>(),
  };

  test("MU10. layer=guide와 자식을 주면 안내 겹이고 자식이 표식 뒤에 선다", () => {
    render(
      <Cover {...base} layer="guide">
        <view data-testid="probe-child" />
      </Cover>,
    );

    const marker = screen.getByTestId(coverId);
    const child = screen.getByTestId("probe-child");
    expect(marker.closest(".journey-special-unit")).toHaveClass("journey-special-unit-guided");
    expect(marker.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("MU10. 주지 않으면 지금 모양이다 — 안내 겹이 아니고 자식도 없다", () => {
    render(<Cover {...base} />);

    expect(screen.getByTestId(coverId).closest(".journey-special-unit")).not.toHaveClass(
      "journey-special-unit-guided",
    );
    expect(screen.queryAllByTestId("probe-child").length).toBe(0);
  });
});
