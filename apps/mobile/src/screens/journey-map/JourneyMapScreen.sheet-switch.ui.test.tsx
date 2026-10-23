import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { catalogUnitDomId } from "./catalog-map";
import { catalogProps, mapScreen, stubHost } from "./JourneyMapScreen.test-support";

// `ui` 계층: 말풍선이 열린 동안 다른 열린 유닛 자리를 누르면 말풍선 · 띠가 그 유닛으로 옮겨 가고, 빈 자리 · 잠긴
// 유닛 자리를 누르면 닫힌다. 가림막이 맵을 덮으므로 누른 자리와 유닛 칸의 잰 자리를 견준다.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const progress = { "u01-water": ["intro", "S1"] };
const cell = (key: string) => `#${catalogUnitDomId("u01-water", key)}`;
const tapS1 = () => {
  act(() => {
    fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-catalog-unit-u01-water-S1"), {
      detail: { y: 300 },
    });
  });
};
const tapScrimAt = (x: number, y: number) => {
  act(() => {
    fireEvent.tap(screen.getByTestId("step-sheet-close"), { detail: { x, y } });
  });
};

test("SW3. 열린 말풍선에서 다른 열린 유닛 자리를 누르면 그 유닛의 말풍선 · 띠가 서고 그쪽으로 스크롤한다", () => {
  const host = stubHost({
    rects: {
      [cell("S1")]: { top: 250, height: 124, left: 40, width: 120 },
      [cell("S3")]: { top: 250, height: 124, left: 220, width: 120 },
    },
  });
  render(mapScreen({ catalog: catalogProps({ progress }) }));
  tapS1();
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("Lesson 1");
  const before = host.measured().length;

  tapScrimAt(280, 300);

  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("Lesson 2");
  expect(screen.getByTestId("ui-lynx-episode-header-label")).toHaveTextContent("unit 02");
  expect(host.measured().slice(before)).toContain(cell("S3"));
});

test("SW3. 빈 자리 · 잠긴 유닛 자리 · 지금 열린 유닛 자리를 누르면 닫힌다", () => {
  stubHost({
    rects: {
      [cell("S1")]: { top: 250, height: 124, left: 40, width: 120 },
      [cell("S3")]: { top: 250, height: 124, left: 220, width: 120 },
      [cell("S4")]: { top: 450, height: 124, left: 40, width: 120 },
    },
  });
  render(mapScreen({ catalog: catalogProps({ progress }) }));

  for (const [x, y] of [
    [10, 10],
    [90, 500],
    [90, 300],
  ] as const) {
    tapS1();
    tapScrimAt(x, y);
    expect(screen.queryAllByTestId("step-sheet-panel").length).toBe(0);
    expect(screen.queryAllByTestId("ui-lynx-episode-header").length).toBe(0);
  }
});

test("SW3. 누른 자리가 없는 탭(좌표 없음)은 그냥 닫는다", () => {
  render(mapScreen({ catalog: catalogProps({ progress }) }));
  tapS1();
  act(() => {
    fireEvent.tap(screen.getByTestId("step-sheet-close"), {});
  });
  expect(screen.queryAllByTestId("step-sheet-panel").length).toBe(0);
});
