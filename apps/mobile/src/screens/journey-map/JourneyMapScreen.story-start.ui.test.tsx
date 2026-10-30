import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import film from "@libitums/icons/lynx/film";
import message from "@libitums/icons/lynx/message";
import phone from "@libitums/icons/lynx/phone";

import { JourneyMapScreen } from "./JourneyMapScreen";
import type { CatalogReadySection, JourneyMapCatalogProps } from "./catalog-map.contract";

// `ui` 계층: Story 노드(ADR-0088 D6)는 형식에 맞는 아이콘(필름 · 말풍선 · 전화)으로 서고, 누르면 말풍선 없이 바로 시작한다.

afterEach(() => {
  cleanup();
});

const section: CatalogReadySection = {
  kind: "catalog-ready",
  episodeId: "u04-directions",
  ordinal: 4,
  title: "Directions",
  lessonKeys: ["S1", "S2", "S3", "S4", "INT", "S5"],
  finalKey: "RP",
  completionKeys: ["RP"],
  cultureKeys: [],
  storyKeys: ["INT"],
  storyIcons: { INT: "chat" },
};

function mount(icon: "film" | "chat" | "phone" = "chat") {
  const onStartUnit = vi.fn<(episodeId: string, unitKey: string) => void>();
  const catalog: JourneyMapCatalogProps = {
    sections: [{ ...section, storyIcons: { INT: icon } }],
    progress: { "u04-directions": ["intro", "S1", "S2", "S3", "S4"] },
    legacyTutorialPassed: false,
    onStartCover: vi.fn<(episodeId: string) => void>(),
    onStartUnit,
  };
  render(<JourneyMapScreen catalog={catalog} />);
  return { onStartUnit };
}

const node = () => screen.getByTestId("ui-lynx-special-unit-catalog-unit-u04-directions-INT");
const glyph = () => {
  const icon = screen.getByTestId("ui-lynx-special-unit-catalog-unit-u04-directions-INT-icon");
  const painted = icon.getAttribute("current-color") ?? "";
  return (icon.getAttribute("content") ?? "").split(painted).join("currentColor");
};

test.each([
  ["film", film],
  ["chat", message],
  ["phone", phone],
] as const)("SU4. 형식 아이콘 %s으로 선다", (icon, svg) => {
  mount(icon);
  expect(glyph()).toBe(svg);
});

test("SU5. Story 노드를 누르면 말풍선 없이 바로 onStartUnit이다", () => {
  const { onStartUnit } = mount();
  fireEvent.tap(node(), { detail: { y: 300 } });
  expect(onStartUnit).toHaveBeenCalledWith("u04-directions", "INT");
  expect(screen.queryByTestId("step-sheet-start")).toBeNull();
});
