import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { JourneyMapScreen } from "./JourneyMapScreen";
import type { JourneyMapCatalogProps } from "./catalog-map.contract";

// `ui` 계층: 맵 화면의 카탈로그 슬롯 — 맵의 유일한 내용이고, 첫 구획은 늘 열려 있다. 구획 안쪽 동작은
// `CatalogMapSections.ui.test.tsx`가, 첫 유닛 안내는 `JourneyMapScreen.tutorial-u00.ui.test.tsx`가 봅니다.

const lessonKeys = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT"];
const titles = [
  "익선동 골목 어귀 편의점",
  "익선 게스트하우스 프런트",
  "익선 게스트하우스 여성 도미토리",
];
const ids = ["u01-water", "u02-checkin", "u03-mina"];

function catalogProps(
  onStartCover: (episodeId: string) => void = vi.fn<(episodeId: string) => void>(),
  progress: JourneyMapCatalogProps["progress"] = {},
): JourneyMapCatalogProps {
  return {
    sections: ids.map((episodeId, i) => ({
      kind: "catalog-ready" as const,
      episodeId,
      ordinal: i + 1,
      title: titles[i] ?? "",
      lessonKeys,
      finalKey: "RP",
      completionKeys: ["RP"],
      cultureKeys: ["CULT"],
    })),
    progress,
    legacyTutorialPassed: false,
    onStartCover,
    onStartUnit: vi.fn<(episodeId: string, unitKey: string) => void>(),
  };
}

function mapScreen(options: { readonly catalog: JourneyMapCatalogProps }) {
  return <JourneyMapScreen catalog={options.catalog} />;
}

const mapChildren = () =>
  Array.from(screen.getByTestId("journey-map-screen-map").children) as Element[];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("JourneyMapScreen catalog slot", () => {
  test("UJ2. 카탈로그는 맵 컨테이너의 유일한 내용이고 첫 구획의 표지는 열려 있다", () => {
    render(mapScreen({ catalog: catalogProps() }));

    const children = mapChildren();
    const catalog = screen.getByTestId("journey-map-screen-catalog");
    expect(children).toHaveLength(1);
    const wrapper = children[0] as Element;
    expect(wrapper === catalog || wrapper.contains(catalog)).toBe(true);
    expect(screen.getByTestId("ui-lynx-special-unit-catalog-cover-u01-water")).toHaveAttribute(
      "data-status",
      "available",
    );
    expect(screen.getByTestId("ui-lynx-special-unit-catalog-cover-u02-checkin")).toHaveAttribute(
      "data-status",
      "default",
    );
  });

  test("UJ3. 첫 표지를 탭하면 에피소드 id를 올린다", () => {
    const onStartCover = vi.fn<(episodeId: string) => void>();
    render(mapScreen({ catalog: catalogProps(onStartCover) }));

    const cover = screen.getByTestId("ui-lynx-special-unit-catalog-cover-u01-water");
    expect(cover).toHaveAttribute("data-status", "available");
    fireEvent.tap(cover, {});

    expect(onStartCover).toHaveBeenCalledTimes(1);
    expect(onStartCover).toHaveBeenCalledWith("u01-water");
  });

  test("UCN1. 문화 노드는 Culture 라벨로 서고 진행에 따라 잠김 · 열림 · 끝이 다른 레슨과 같은 규칙이며 고리가 없다", () => {
    const node = () => screen.getByTestId("ui-lynx-learning-unit-catalog-unit-u01-water-CULT");
    const base = ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7"];
    const states = [
      { done: base, status: "default" },
      { done: [...base, "S8"], status: "available" },
      { done: [...base, "S8", "CULT"], status: "clear" },
    ];

    for (const { done, status } of states) {
      const { unmount } = render(
        mapScreen({
          catalog: catalogProps(vi.fn<(episodeId: string) => void>(), { "u01-water": done }),
        }),
      );
      expect(node()).toHaveAttribute("data-status", status);
      expect(node().getAttribute("accessibility-label") ?? "").toMatch(/^Episode 1\. Culture\b/);
      expect(node()).toHaveAttribute("data-narrative", "none");
      expect(screen.getAllByText("Culture").length).toBeGreaterThan(0);
      expect(screen.queryAllByText("Lesson 9")).toHaveLength(0);
      unmount();
    }
  });

  test("UCN1b. 열린 문화 노드(원형) 아이콘은 열린 레슨 노드(play)와 열린 최종 노드(별)의 아이콘과 모두 다르다", () => {
    const iconOf = (done: readonly string[], key: string): string => {
      const { unmount } = render(
        mapScreen({
          catalog: catalogProps(vi.fn<(episodeId: string) => void>(), { "u01-water": done }),
        }),
      );
      const prefix = key === "RP" ? "ui-lynx-special-unit" : "ui-lynx-learning-unit";
      const node = screen.getByTestId(`${prefix}-catalog-unit-u01-water-${key}`);
      expect(node).toHaveAttribute("data-status", "available");
      const icon =
        screen
          .getByTestId(`${prefix}-catalog-unit-u01-water-${key}-icon`)
          .getAttribute("content") ?? "";
      unmount();
      return icon;
    };
    const upToS8 = ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];

    const lesson = iconOf(["intro"], "S1");
    const culture = iconOf(upToS8, "CULT");
    const finalTest = iconOf([...upToS8, "CULT"], "RP");

    expect(culture).not.toBe("");
    expect(culture).not.toBe(lesson);
    expect(culture).not.toBe(finalTest);
    expect(lesson).not.toBe(finalTest);
  });
});
