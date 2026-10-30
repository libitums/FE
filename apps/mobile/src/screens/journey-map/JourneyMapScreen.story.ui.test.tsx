import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, within } from "@lynx-js/react/testing-library";

import type { CatalogProgress } from "../../lib/catalog-progress";
import { JourneyMapScreen } from "./JourneyMapScreen";
import type { CatalogMapSection, JourneyMapCatalogProps } from "./catalog-map.contract";

// `ui` 계층: 막간 이야기 유닛(ADR-0088)이 맵에서 최종 테스트와 같은 스페셜 노드(`SpecialUnit`)로 서고, 라벨이
// `SPECIAL` + `Story`이며, 레슨 번호가 이야기를 건너뛰는지 봅니다. 파생 계산은 unit이 집니다.

afterEach(() => {
  cleanup();
});

const lessonKeys = ["S1", "S2", "S3", "S4", "INT", "S5", "S6", "S7", "S8", "CULT"];
const section: CatalogMapSection = {
  kind: "catalog-ready",
  episodeId: "u01-water",
  ordinal: 1,
  title: "Water",
  lessonKeys,
  finalKey: "RP",
  completionKeys: ["RP"],
  cultureKeys: ["CULT"],
  storyKeys: ["INT"],
};

function catalogOf(progress: CatalogProgress): JourneyMapCatalogProps {
  return {
    sections: [section],
    progress,
    legacyTutorialPassed: false,
    onStartCover: vi.fn<(episodeId: string) => void>(),
    onStartUnit: vi.fn<(episodeId: string, unitKey: string) => void>(),
  };
}

const progressThroughS4: CatalogProgress = { "u01-water": ["intro", "S1", "S2", "S3", "S4"] };

test("SU1. 이야기 유닛은 SpecialUnit이고 레슨 노드(LearningUnit)가 아니다", () => {
  render(<JourneyMapScreen catalog={catalogOf(progressThroughS4)} />);

  expect(screen.getByTestId("ui-lynx-special-unit-catalog-unit-u01-water-INT")).toBeInTheDocument();
  expect(screen.queryByTestId("ui-lynx-learning-unit-catalog-unit-u01-water-INT")).toBeNull();
});

test("SU2. 이야기 노드의 라벨은 SPECIAL · Story이고, S4 뒤라 열려 있다", () => {
  render(<JourneyMapScreen catalog={catalogOf(progressThroughS4)} />);

  const node = screen.getByTestId("ui-lynx-special-unit-catalog-unit-u01-water-INT");
  expect(node.getAttribute("data-status")).toBe("available");
  const item = node.closest(".journey-special-unit") as HTMLElement;
  expect(within(item).getByText("Story")).toBeInTheDocument();
  expect(within(item).getByText("SPECIAL")).toBeInTheDocument();
});

test("SU3. 레슨 번호는 이야기를 건너뛰어 S5가 Lesson 5다", () => {
  render(<JourneyMapScreen catalog={catalogOf(progressThroughS4)} />);

  const s5 = screen.getByTestId("ui-lynx-learning-unit-catalog-unit-u01-water-S5");
  expect(s5.getAttribute("accessibility-label") ?? "").toContain("Lesson 5");
  expect(
    screen
      .getByTestId("ui-lynx-learning-unit-catalog-unit-u01-water-S5")
      .getAttribute("data-status"),
  ).toBe("default");
});
