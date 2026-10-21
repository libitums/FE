import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import type { ComponentType, ReactNode } from "@lynx-js/react";

import { CatalogEpisodeSection } from "./CatalogEpisodeSection";
import type { CatalogReadySection } from "./catalog-map.contract";
import { realSections } from "./JourneyMapScreen.tutorial-u00.test-support";
import type { JourneyMapNodeStatus } from "./journey-map-types";

// `ui` 계층: 구획의 안내 손잡이(guide) — 있으면 표지가 안내 겹으로 서고 말풍선이 붙으며 표지 선택이 안내를 닫고 시작한다.

afterEach(() => {
  cleanup();
});

type LooseSectionProps = {
  readonly section: CatalogReadySection;
  readonly coverStatus: JourneyMapNodeStatus;
  readonly access: "open";
  readonly progress: Record<string, readonly string[]>;
  readonly guide: { readonly dismiss: () => void } | null;
  readonly onStartCover: (episodeId: string) => void;
  readonly onSelectUnit: (episodeId: string, unitKey: string, tapY: number) => void;
};
const Section = CatalogEpisodeSection as unknown as ComponentType<LooseSectionProps>;

const u00 = realSections.find((section) => section.episodeId === "u00-tutorial") as
  | CatalogReadySection
  | undefined;

function mount(guide: LooseSectionProps["guide"]): {
  onStartCover: ReturnType<typeof vi.fn<(episodeId: string) => void>>;
} {
  const onStartCover = vi.fn<(episodeId: string) => void>();
  if (u00 === undefined) throw new Error("u00 구획이 없습니다");
  const node: ReactNode = (
    <Section
      section={u00}
      coverStatus="available"
      access="open"
      progress={{}}
      guide={guide}
      onStartCover={onStartCover}
      onSelectUnit={vi.fn<(episodeId: string, unitKey: string, tapY: number) => void>()}
    />
  );
  render(node);
  return { onStartCover };
}

const cover = () => screen.getByTestId("ui-lynx-special-unit-catalog-cover-u00-tutorial");

describe("CatalogEpisodeSection guide", () => {
  test("guide가 있으면 표지가 안내 겹이고 말풍선이 표지 셀 안에 선다", () => {
    mount({ dismiss: vi.fn<() => void>() });

    expect(cover().closest(".journey-special-unit")).toHaveClass("journey-special-unit-guided");
    const tooltip = screen.getByTestId("first-unit-map-tooltip");
    expect(tooltip).toHaveTextContent("Tap to start your lesson!");
    expect(
      screen.getByTestId("journey-map-cell-catalog-u00-tutorial-intro").contains(tooltip),
    ).toBe(true);
  });

  test("guide가 있으면 표지 밖 셀은 낭독에서 가려지고 표지는 가려지지 않는다", () => {
    mount({ dismiss: vi.fn<() => void>() });

    const hidden = (element: Element) =>
      (element.getAttribute("accessibility-element") === "true"
        ? element.parentElement
        : element
      )?.closest('[accessibility-elements-hidden="true"]') != null;
    expect(hidden(cover())).toBe(false);
    expect(hidden(screen.getByTestId("journey-map-cell-catalog-u00-tutorial-S1"))).toBe(true);
    expect(hidden(screen.getByTestId("journey-map-cell-catalog-u00-tutorial-RP"))).toBe(true);
  });

  test("표지를 선택하면 안내를 먼저 닫고 시작을 올린다", () => {
    const order: string[] = [];
    const dismiss = vi.fn<() => void>(() => void order.push("dismiss"));
    const { onStartCover } = mount({ dismiss });
    onStartCover.mockImplementation(() => void order.push("start"));

    fireEvent.tap(cover(), {});

    expect(order).toEqual(["dismiss", "start"]);
    expect(onStartCover).toHaveBeenCalledWith("u00-tutorial");
  });

  test("guide가 null이면 말풍선도 안내 겹도 없고 모든 셀이 낭독 대상이다", () => {
    mount(null);

    expect(screen.queryAllByTestId("first-unit-map-tooltip").length).toBe(0);
    expect(cover().closest(".journey-special-unit")).not.toHaveClass("journey-special-unit-guided");
    expect(
      screen
        .getByTestId("journey-map-cell-catalog-u00-tutorial-S1")
        .closest('[accessibility-elements-hidden="true"]') === null,
    ).toBe(true);
  });
});
