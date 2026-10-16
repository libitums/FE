import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { FirstUnitGuideProvider } from "../../components/first-unit-guide";
import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../episode-intro/episode-intro.contract";
import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";
import { JourneyMapScreen } from "./JourneyMapScreen";
import { journeySteps } from "./journey-map";
import type { JourneyMapCatalogProps } from "./catalog-map.contract";

// `ui` 계층: 맵 화면의 카탈로그 슬롯 — 튜토리얼 구획 뒤에 서고, 튜토리얼 통과로 열리며, 첫 유닛
// 안내 동안 낭독에서 가려진다. 구획 안쪽 동작은
// `CatalogMapSections.ui.test.tsx`가 봅니다.

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
    onStartCover,
    onStartUnit: vi.fn<(episodeId: string, unitKey: string) => void>(),
  };
}

function mapScreen(options: {
  readonly catalog?: JourneyMapCatalogProps;
  readonly completedEpisodeFinalIds?: readonly EpisodeFinalUnitId[];
}) {
  return (
    <JourneyMapScreen
      completedStepCount={2}
      onStartStep={() => {}}
      completedEpisodeIntroIds={["tutorial-intro"]}
      onStartEpisodeIntroUnit={vi.fn<(id: EpisodeIntroUnitId) => void>()}
      completedMessengerUnitIds={[]}
      onStartMessengerUnit={vi.fn<(id: MessengerUnitId) => void>()}
      completedPhoneCallUnitIds={[]}
      onStartPhoneCallUnit={vi.fn<(id: PhoneCallUnitId) => void>()}
      completedVisualNovelUnitIds={[]}
      onStartVisualNovelUnit={vi.fn<(id: VisualNovelUnitId) => void>()}
      completedEpisodeFinalIds={options.completedEpisodeFinalIds ?? []}
      onStartEpisodeFinal={vi.fn<(id: EpisodeFinalUnitId) => void>()}
      {...(options.catalog === undefined ? {} : { catalog: options.catalog })}
    />
  );
}

const mapChildren = () =>
  Array.from(screen.getByTestId("journey-map-screen-map").children) as Element[];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("JourneyMapScreen catalog slot", () => {
  test("UJ1. catalog 없이는 카탈로그 상자가 없고 튜토리얼 스텝이 정의 순서대로 선다", () => {
    render(mapScreen({}));

    expect(screen.queryByTestId("journey-map-screen-catalog")).not.toBeInTheDocument();
    const map = screen.getByTestId("journey-map-screen-map");
    const stepOrder = journeySteps.map((step) =>
      Array.from(map.querySelectorAll("*")).indexOf(
        screen.getByTestId(`ui-lynx-learning-unit-${step.id}`),
      ),
    );
    expect(stepOrder).toEqual([...stepOrder].sort((a, b) => a - b));
    expect(stepOrder.every((position) => position >= 0)).toBe(true);
  });

  test("UJ2. catalog가 있으면 튜토리얼 구획 바로 뒤, 같은 맵 컨테이너 안에 서고 표지는 잠겨 있다", () => {
    render(mapScreen({ catalog: catalogProps() }));

    const children = mapChildren();
    const catalog = screen.getByTestId("journey-map-screen-catalog");
    const wrapper = children[children.length - 1] as Element;
    expect(wrapper === catalog || wrapper.contains(catalog)).toBe(true);
    const previous = children[children.length - 2] as Element;
    expect(previous.contains(screen.getByTestId("ui-lynx-learning-unit-greeting"))).toBe(true);
    expect(screen.getByTestId("ui-lynx-learning-unit-catalog-cover-u01-water")).toHaveAttribute(
      "data-status",
      "default",
    );
  });

  test("UJ3. 튜토리얼 최종 테스트를 끝내면 첫 표지가 열리고 탭하면 에피소드 id를 올린다", () => {
    const onStartCover = vi.fn<(episodeId: string) => void>();
    render(
      mapScreen({
        catalog: catalogProps(onStartCover),
        completedEpisodeFinalIds: ["tutorial-final-test"],
      }),
    );

    const cover = screen.getByTestId("ui-lynx-learning-unit-catalog-cover-u01-water");
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
          completedEpisodeFinalIds: ["tutorial-final-test"],
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

  test("UCN1b. 열린 상태의 문화 노드 아이콘은 열린 레슨 노드(play)와 열린 최종 노드(flag)의 아이콘과 모두 다르다", () => {
    const iconOf = (done: readonly string[], key: string): string => {
      const { unmount } = render(
        mapScreen({
          catalog: catalogProps(vi.fn<(episodeId: string) => void>(), { "u01-water": done }),
          completedEpisodeFinalIds: ["tutorial-final-test"],
        }),
      );
      const node = screen.getByTestId(`ui-lynx-learning-unit-catalog-unit-u01-water-${key}`);
      expect(node).toHaveAttribute("data-status", "available");
      const icon =
        screen
          .getByTestId(`ui-lynx-learning-unit-catalog-unit-u01-water-${key}-icon`)
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

  test("UJ4. 첫 유닛 안내가 떠 있는 동안 카탈로그를 감싼 상자는 낭독에서 가려진다", () => {
    render(
      <FirstUnitGuideProvider enabled>
        {mapScreen({ catalog: catalogProps() })}
      </FirstUnitGuideProvider>,
    );

    const catalog = screen.getByTestId("journey-map-screen-catalog");
    const hidden = catalog.closest('[accessibility-elements-hidden="true"]');
    expect(hidden).not.toBeNull();
    expect(hidden === screen.getByTestId("journey-map-screen-map")).toBe(false);
  });
});
