import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import star from "@libitums/icons/lynx/five-pointed-star";

import { FirstUnitGuideProvider } from "../../components/first-unit-guide";
import { JourneyMapScreen, type JourneyMapScreenProps } from "./JourneyMapScreen";
import { journeySteps } from "./journey-map";
import type { CatalogMapSection, JourneyMapCatalogProps } from "./catalog-map.contract";
import {
  noProgress,
  tutorialAllDone,
  type TutorialProgressProps,
} from "./JourneyMapScreen.test-support";

// `ui` 계층: 맵 화면이 스페셜 8종(튜토리얼 5 + 카탈로그 표지 · 문화 · 최종)을 `SpecialUnit`으로,
// 스텝 · 카탈로그 레슨을 `LearningUnit`으로 그리는지 봅니다. 상태 표 · 톤 · 낭독 이름의 계산은 unit이
// 집니다.

afterEach(() => {
  cleanup();
});

const lessonKeys = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT"];
const lessonOnlyKeys = lessonKeys.filter((key) => key !== "CULT");
const section: CatalogMapSection = {
  kind: "catalog-ready",
  episodeId: "u01-water",
  ordinal: 1,
  title: "Water",
  lessonKeys,
  finalKey: "RP",
  completionKeys: ["RP"],
  cultureKeys: ["CULT"],
};

function catalogOf(): JourneyMapCatalogProps {
  return {
    sections: [section],
    progress: {},
    onStartCover: vi.fn<(episodeId: string) => void>(),
    onStartUnit: vi.fn<(episodeId: string, unitKey: string) => void>(),
  };
}

function mapScreen(
  progress: TutorialProgressProps,
  overrides: Partial<JourneyMapScreenProps> = {},
) {
  return (
    <JourneyMapScreen
      completedStepCount={progress.completedStepCount}
      completedEpisodeIntroIds={progress.completedEpisodeIntroIds}
      completedMessengerUnitIds={progress.completedMessengerUnitIds}
      completedPhoneCallUnitIds={progress.completedPhoneCallUnitIds}
      completedVisualNovelUnitIds={progress.completedVisualNovelUnitIds}
      completedEpisodeFinalIds={progress.completedEpisodeFinalIds}
      onStartStep={() => {}}
      onStartEpisodeIntroUnit={() => {}}
      onStartMessengerUnit={() => {}}
      onStartPhoneCallUnit={() => {}}
      onStartVisualNovelUnit={() => {}}
      onStartEpisodeFinal={() => {}}
      catalog={catalogOf()}
      {...overrides}
    />
  );
}

/** 유닛 루트만(하위 장식 testid는 `data-status`가 없습니다) 문서 순서로 뽑습니다. */
const rootsOf = (prefix: "special" | "learning"): Element[] =>
  Array.from(
    screen
      .getByTestId("journey-map-screen-map")
      .querySelectorAll(`[data-testid^="ui-lynx-${prefix}-unit-"][data-status]`),
  );
const idsOf = (roots: readonly Element[]): (string | null)[] =>
  roots.map((root) => root.getAttribute("data-testid"));

const glyphOf = (node: Element): string => {
  const content = node.getAttribute("content") ?? "";
  const painted = node.getAttribute("current-color") ?? "";
  return painted === "" ? content : content.split(painted).join("currentColor");
};

describe("JourneyMapScreen 스페셜 유닛", () => {
  test("JMS1. 튜토리얼의 스페셜 다섯이 SpecialUnit이고 스텝은 모두 LearningUnit이다", () => {
    render(mapScreen(noProgress));

    const specialTutorial = idsOf(rootsOf("special")).filter(
      (id) => !(id ?? "").startsWith("ui-lynx-special-unit-catalog-"),
    );
    expect(specialTutorial).toEqual([
      "ui-lynx-special-unit-tutorial-intro",
      "ui-lynx-special-unit-appointment-confirmation",
      "ui-lynx-special-unit-appointment-confirmation-phone-call",
      "ui-lynx-special-unit-cafe-arrival-visual-novel",
      "ui-lynx-special-unit-tutorial-final-test",
    ]);
    const tutorialSteps = idsOf(rootsOf("learning")).filter(
      (id) => !(id ?? "").startsWith("ui-lynx-learning-unit-catalog-"),
    );
    expect(tutorialSteps.sort()).toEqual(
      journeySteps.map((step) => `ui-lynx-learning-unit-${step.id}`).sort(),
    );
  });

  test("JMS2. 카탈로그의 표지 · 문화 · 최종은 SpecialUnit이고 레슨은 LearningUnit이다", () => {
    render(mapScreen(tutorialAllDone));

    const catalogSpecial = idsOf(rootsOf("special")).filter((id) =>
      (id ?? "").startsWith("ui-lynx-special-unit-catalog-"),
    );
    expect(catalogSpecial).toEqual([
      "ui-lynx-special-unit-catalog-cover-u01-water",
      "ui-lynx-special-unit-catalog-unit-u01-water-CULT",
      "ui-lynx-special-unit-catalog-unit-u01-water-RP",
    ]);
    const catalogLessons = idsOf(rootsOf("learning")).filter((id) =>
      (id ?? "").startsWith("ui-lynx-learning-unit-catalog-"),
    );
    expect(catalogLessons).toEqual(
      lessonOnlyKeys.map((key) => `ui-lynx-learning-unit-catalog-unit-u01-water-${key}`),
    );
  });

  test("JMS2. 레슨 노드의 바깥 상자는 스텝 노드 클래스이고 스페셜 상자가 아니다", () => {
    render(mapScreen(tutorialAllDone));

    const lesson = screen.getByTestId("ui-lynx-learning-unit-catalog-unit-u01-water-S1");
    const outer = lesson.closest(".journey-step-node");
    expect(outer).not.toBeNull();
    expect(lesson.closest(".journey-special-unit")).toBeNull();
  });

  test.each([
    ["처음 부팅", noProgress],
    ["튜토리얼 끝", tutorialAllDone],
  ] as const)(
    "JMS3. %s의 맵에서 스페셜 아이콘은 모두 별이고 배지 · 고리가 없다",
    (_name, progress) => {
      render(mapScreen(progress));

      const roots = rootsOf("special");
      // 튜토리얼 다섯 + 카탈로그 셋 — 비어 있으면 아래 단언이 헛돕니다.
      expect(roots).toHaveLength(8);
      for (const root of roots) {
        const testId = root.getAttribute("data-testid") ?? "";
        expect(root.querySelector(`[data-testid="${testId}-badge"]`)).toBeNull();
        expect(root.querySelector(`[data-testid="${testId}-ring"]`)).toBeNull();
        const icon = root.querySelector(`[data-testid="${testId}-icon"]`);
        expect(icon).not.toBeNull();
        expect(glyphOf(icon as Element)).toBe(star);
      }
    },
  );

  test("JMS4. 안내 말풍선이 뜬 표지는 안내 겹으로 서고 탭하면 안내가 닫히며 시작이 한 번 올라간다", () => {
    const onStartEpisodeIntroUnit = vi.fn<(id: string) => void>();
    const { container } = render(
      <FirstUnitGuideProvider enabled>
        {mapScreen(noProgress, { onStartEpisodeIntroUnit })}
      </FirstUnitGuideProvider>,
    );

    const cover = screen.getByTestId("ui-lynx-special-unit-tutorial-intro");
    expect(cover.closest(".journey-special-unit")).toHaveClass("journey-special-unit-guided");
    expect(container.querySelector(".first-unit-map-tooltip")).not.toBeNull();

    fireEvent.tap(cover, {});

    expect(container.querySelector(".first-unit-map-tooltip")).toBeNull();
    const outer = screen
      .getByTestId("ui-lynx-special-unit-tutorial-intro")
      .closest(".journey-special-unit");
    expect(outer).not.toBeNull();
    expect(outer).not.toHaveClass("journey-special-unit-guided");
    expect(onStartEpisodeIntroUnit).toHaveBeenCalledTimes(1);
    expect(onStartEpisodeIntroUnit).toHaveBeenCalledWith("tutorial-intro");
  });

  test("JMS5. 진행 확인 중에는 스페셜 8종이 checking이고 loading으로 끝나며 탭이 무반응이다", () => {
    const onStartEpisodeIntroUnit = vi.fn<(id: string) => void>();
    const onStartMessengerUnit = vi.fn<(id: string) => void>();
    const catalog = catalogOf();
    render(
      mapScreen(tutorialAllDone, {
        progressLoad: { status: "checking" },
        onStartEpisodeIntroUnit,
        onStartMessengerUnit,
        catalog,
      }),
    );

    const roots = rootsOf("special");
    expect(roots).toHaveLength(8);
    for (const root of roots) {
      expect(root).toHaveAttribute("data-status", "checking");
      expect(root).toHaveAttribute("accessibility-traits", "disabled");
      expect((root.getAttribute("accessibility-label") ?? "").endsWith(", loading")).toBe(true);
      fireEvent.tap(root, {});
    }
    expect(onStartEpisodeIntroUnit).not.toHaveBeenCalled();
    expect(onStartMessengerUnit).not.toHaveBeenCalled();
    expect(catalog.onStartCover).not.toHaveBeenCalled();
    expect(catalog.onStartUnit).not.toHaveBeenCalled();
  });
});
