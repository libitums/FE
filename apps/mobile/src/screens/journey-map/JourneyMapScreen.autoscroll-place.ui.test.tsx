import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import {
  asRects,
  deferAll,
  headerSelector,
  mount,
  nodeSelector,
  scrollToCall,
  screenSelector,
  unitSelector,
} from "./JourneyMapScreen.autoscroll-support";
import {
  mapScreen,
  scrollSelector,
  stubHost,
  twoStepsDone,
  type HostStub,
  type Rect,
} from "./JourneyMapScreen.test-support";

// `ui` 계층: 자동 스크롤과 유닛 탭이 같은 자리를 쓰는지(한 규칙의 두 호출처)를 화면 단위로 봅니다.
// 목적지 식은 unit이 지고, 여기서는 어느 질의가 나가는지 · 도착 뒤 탭이 맵을 움직이지 않는지만 봅니다.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const tapOrdering = (): void => {
  act(() => {
    fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), { detail: { y: 750 } });
  });
};

function lastOffset(host: HostStub): number {
  const calls = host.scrollTos();
  return Number(calls[calls.length - 1]?.params?.offset);
}

function placeUnit(host: HostStub, rect: Rect): void {
  host.rects[unitSelector] = rect;
  host.rects[nodeSelector] = rect;
}

describe("JourneyMapScreen 자동 스크롤의 자리", () => {
  test("AU1. 출발 질의(대상 · 스크롤 · 화면 · 띠 손잡이)는 답을 기다리지 않고 한꺼번에 나가고, 답이 오면 한 번 간다", () => {
    const host = stubHost({ rects: asRects() });
    deferAll(host);
    mount(mapScreen({ progress: twoStepsDone }));

    expect(host.measured()).toEqual(
      expect.arrayContaining([unitSelector, scrollSelector, screenSelector, headerSelector]),
    );
    expect(host.scrollTos()).toEqual([]);

    host.flush();

    expect(host.scrollTos()).toEqual([scrollToCall(290, true)]);
  });

  test("AU2. 같은 표에서 자동 스크롤 목적지와 탭 목적지가 같다", () => {
    const host = stubHost({ rects: asRects() });
    placeUnit(host, { top: 700, height: 100 });
    mount(mapScreen({ progress: twoStepsDone }));
    expect(host.scrollTos()).toEqual([scrollToCall(290, true)]);

    tapOrdering();

    expect(host.scrollTos().map((call) => call.params?.offset)).toEqual([290, 290]);
  });

  test("AU3. 자동 스크롤이 도착한 뒤 유닛을 탭해도 맵이 움직이지 않고 말풍선은 노드 아래에 선다", () => {
    const host = stubHost({ rects: asRects() });
    placeUnit(host, { top: 700, height: 100 });
    mount(mapScreen({ progress: twoStepsDone }));
    placeUnit(host, { top: 410, height: 100 });
    host.scroll(290);
    expect(host.scrollTos()).toHaveLength(1);

    tapOrdering();

    expect(screen.queryByTestId("step-sheet-panel")).not.toBeNull();
    expect(Math.abs(lastOffset(host) - 290)).toBeLessThanOrEqual(1);
    const style = screen.getByTestId("step-sheet-panel").parentElement?.getAttribute("style");
    expect(style).toContain("518px");
  });

  const band = (height: number): Rect => ({ top: 88, height, left: 16, width: 360.7 });
  const shortBand = (height: number): Rect => ({ top: 104, height, left: 16, width: 360 });
  const wide: Rect = { top: 1600, height: 100, left: 52.4, width: 100 };
  const short: Rect = { top: 700, height: 100, left: 52, width: 100 };

  const cases = [
    {
      name: "392dp 표준, 탭 때 띠 손잡이 높이 0",
      unit: wide,
      scroll: { top: 24, height: 827 },
      screen: { top: 24, height: 827 },
      header: band(0),
      tapHeader: band(0),
      start: 1212.5,
      arrivedTop: 387.5,
    },
    {
      name: "392dp 표준, 탭 때 띠가 선 뒤(높이 150)",
      unit: wide,
      scroll: { top: 24, height: 827 },
      screen: { top: 24, height: 827 },
      header: band(0),
      tapHeader: band(150),
      start: 1212.5,
      arrivedTop: 387.5,
    },
    {
      name: "짧은 화면, 탭 때 높이 0",
      unit: short,
      scroll: { top: 60, height: 400 },
      screen: { top: 0, height: 800 },
      header: shortBand(0),
      tapHeader: shortBand(0),
      start: 460,
      arrivedTop: 240,
    },
  ];

  test.each(cases)("AU4. 띠가 서는 화면에서도 도착 뒤 탭은 같은 자리다 ($name)", (row) => {
    const host = stubHost({ rects: asRects() });
    host.rects[scrollSelector] = row.scroll;
    host.rects[screenSelector] = row.screen;
    host.rects[headerSelector] = row.header;
    placeUnit(host, row.unit);
    mount(mapScreen({ progress: twoStepsDone }));
    expect(host.scrollTos()).toEqual([scrollToCall(row.start, true)]);

    placeUnit(host, { ...row.unit, top: row.arrivedTop });
    host.scroll(row.start);
    expect(host.scrollTos()).toHaveLength(1);
    host.rects[headerSelector] = row.tapHeader;
    tapOrdering();

    expect(screen.queryByTestId("step-sheet-panel")).not.toBeNull();
    // 같은 자리면 호출이 없거나, 있어도 도착한 자리에서 1 안으로 움직입니다.
    const moved = host
      .scrollTos()
      .slice(1)
      .filter((call) => Math.abs(Number(call.params?.offset) - row.start) > 1);
    expect(moved).toEqual([]);
  });

  test("AU5. 띠 손잡이를 못 재도 자동 스크롤은 폴백하지 않고 같은 목적지로 간다", () => {
    const host = stubHost({ rects: asRects() });
    delete host.rects[headerSelector];
    mount(mapScreen({ progress: twoStepsDone }));

    expect(host.scrollTos()).toEqual([scrollToCall(290, true)]);
    expect(host.scrollIntoViews()).toEqual([]);
  });

  test("AU6. 화면 상자를 못 재면 대상 셀을 가운데로 맡기는 폴백 하나뿐이다", () => {
    const host = stubHost({ rects: asRects() });
    delete host.rects[screenSelector];
    mount(mapScreen({ progress: twoStepsDone }));

    expect(host.scrollTos()).toEqual([]);
    expect(host.scrollIntoViews()).toEqual([
      {
        selector: unitSelector,
        method: "scrollIntoView",
        params: { scrollIntoViewOptions: { block: "center", behavior: "smooth" } },
      },
    ]);
  });
});
