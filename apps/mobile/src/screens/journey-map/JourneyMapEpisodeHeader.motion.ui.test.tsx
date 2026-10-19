import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { JourneyMapEpisodeHeader } from "./JourneyMapEpisodeHeader";
import { sheetEntranceClasses, type SheetEntranceMotion } from "./journey-map-sheet-motion";

// `ui` 계층: 띠 래퍼가 등장 종류를 클래스 · 표식으로, 채움 · 빛을 DOM으로 옮기는지 봅니다. 묶음의 값은 unit이 집니다.

afterEach(() => {
  cleanup();
});

const entrances: readonly SheetEntranceMotion[] = ["none", "awaiting", "expressive", "fade"];

function band(entrance: SheetEntranceMotion, completed: number, onLayoutChange?: () => void) {
  return (
    <JourneyMapEpisodeHeader
      episodeLabel="Episode 1, unit 01"
      title="Alley"
      completedUnitCount={completed}
      totalUnitCount={10}
      entrance={entrance}
      {...(onLayoutChange === undefined ? {} : { onLayoutChange })}
    />
  );
}

const wrapper = (): HTMLElement | null =>
  screen.getByTestId("ui-lynx-episode-header").parentElement;
const fill = (): HTMLElement | null => screen.queryByTestId("ui-lynx-episode-header-fill");
const sheen = (): HTMLElement | null => screen.queryByTestId("ui-lynx-episode-header-fill-sheen");

describe("JourneyMapEpisodeHeader 등장 종류", () => {
  test.each(entrances)(
    "HB1. %s: 띠 래퍼 클래스 · 표식이 묶음대로, 채움 등장 · 빛은 expressive만",
    (entrance) => {
      const classes = sheetEntranceClasses(entrance);
      render(band(entrance, 3));

      const outer = wrapper();
      expect(outer?.getAttribute("class")).toBe(classes.band);
      expect(outer?.getAttribute("data-motion")).toBe(classes.motionReduced ? "reduced" : null);
      const entering = entrance === "expressive";
      expect(fill()?.getAttribute("class")?.includes("ui-lynx-episode-header-fill-enter")).toBe(
        entering,
      );
      expect(sheen() !== null).toBe(entering);
      expect(sheen()?.parentElement ?? null).toBe(entering ? fill() : null);
    },
  );

  test("HB1. 접근성 노드(띠 루트)에는 data-motion이 섞이지 않는다", () => {
    render(band("fade", 3));

    expect(screen.getByTestId("ui-lynx-episode-header")).not.toHaveAttribute("data-motion");
    expect(wrapper()).toHaveAttribute("data-motion", "reduced");
  });

  test("HB1. layoutchange는 그대로 래퍼에서 불린다", () => {
    const onLayoutChange = vi.fn<() => void>();
    render(band("expressive", 3, onLayoutChange));

    const outer = wrapper();
    if (outer === null) {
      throw new Error("띠 래퍼가 있어야 합니다");
    }
    fireEvent.layoutchange(outer, { detail: { height: 120 } });

    expect(onLayoutChange).toHaveBeenCalledTimes(1);
  });

  test("HB2. fade: 래퍼에 등장 · 대기 클래스가 없고 빛도 없다", () => {
    render(band("fade", 3));

    const classText = wrapper()?.getAttribute("class") ?? "";
    expect(classText).toContain("journey-map-screen-episode-header-motion-reduced");
    expect(classText).not.toContain("-enter");
    expect(classText).not.toContain("-awaiting");
    expect(sheen()).not.toBeInTheDocument();
    expect(fill()?.getAttribute("class")).toBe("ui-lynx-episode-header-fill");
  });

  test("HB2. expressive 0 / 10: 채울 것이 없어 채움도 빛도 없다", () => {
    render(band("expressive", 0));

    expect(wrapper()?.getAttribute("class")).toBe(sheetEntranceClasses("expressive").band);
    expect(fill()).not.toBeInTheDocument();
    expect(sheen()).not.toBeInTheDocument();
  });
});
