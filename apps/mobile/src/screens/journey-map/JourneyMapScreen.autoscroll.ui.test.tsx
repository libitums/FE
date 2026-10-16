import type { ReactElement } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { FirstUnitGuideProvider } from "../../components/first-unit-guide";
import { catalogSectionDomId, catalogUnitDomId } from "./catalog-map";
import {
  catalogProps,
  catalogReadySections,
  mapScreen,
  noProgress,
  scrollSelector,
  stubHost,
  threeStepsDone,
  touchMap,
  tutorialAllDone,
  twoStepsDone,
  type HostStub,
  type Rect,
} from "./JourneyMapScreen.test-support";

// `ui` 계층: 맵이 열릴 때 다음에 풀 유닛으로 자동 스크롤하는지 — 호스트에 나가는 측정 · `scrollTo` ·
// `scrollIntoView`의 횟수와 인자만 봅니다. 호스트의 질의는 대역이고, 재는 값은 이 파일이 정합니다.
// 목적지 식(`autoScrollOffset`)은 unit이 지므로 여기서는 손으로 맞춘 수 하나로만 이어 봅니다.
//
// 손으로 맞춘 목적지: 머리 카드 아래 모서리 60 + 168 = 228, 정렬선 = 228 + 24 = 252,
// 한계선 = 60 + 800 − 68 − 24 − 100 = 668 → 설 자리 252. 스크롤 자리 0에서 대상 위 모서리가 700이면
// 목적지는 700 − 252 = 448입니다.
//
// 이 파일이 못 지는 것: 부드러운 이동의 모양 · 터치와 우리 스크롤을 가르는 실제 이벤트 순서 · 호스트가 답을
// 주는 시점 — 기기(e2e)에서만 닫힙니다.

const unitRect = (top: number): Rect => ({ top, height: 100 });

const baseRects: Record<string, Rect> = {
  "#journey-map-unit-ordering": unitRect(700),
  "#journey-map-unit-appointment": unitRect(900),
  [scrollSelector]: { top: 60, height: 800 },
  "#journey-map-screen-header": { top: 60, height: 168 },
  // 말풍선이 재는 값입니다(AS13) — `JourneyMapScreen.anchor.ui.test.tsx`의 값과 같습니다.
  "#journey-step-node-ordering": { top: 700, height: 124 },
  "#journey-map-screen": { top: 0, height: 900 },
};

const asRects = (): Record<string, Rect> => ({ ...baseRects });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mount(element: ReactElement) {
  let view: ReturnType<typeof render> | undefined;
  act(() => {
    view = render(element);
  });
  return view as ReturnType<typeof render>;
}

function rerender(view: ReturnType<typeof render>, element: ReactElement): void {
  act(() => {
    view.rerender(element);
  });
}

const reduced = (element: ReactElement) => (
  <MotionProvider motion="reduced">{element}</MotionProvider>
);

const scrollToCall = (offset: number, smooth: boolean) => ({
  selector: scrollSelector,
  method: "scrollTo",
  params: { offset, smooth },
});

function deferAll(host: HostStub): void {
  host.defer = () => true;
}

describe("JourneyMapScreen 자동 스크롤", () => {
  test("AS1. 진행이 없으면 스크롤하지 않고 대상 셀도 재지 않는다", () => {
    const host = stubHost({ rects: asRects() });
    mount(mapScreen({ progress: noProgress }));

    expect(host.scrollTos()).toEqual([]);
    expect(host.scrollIntoViews()).toEqual([]);
    expect(host.measured()).not.toContain("#journey-map-unit-tutorial-intro");
  });

  test("AS2. 표지와 스텝 둘을 끝내고 열면 대상 셀 · 스크롤 · 머리 카드를 재고 목적지로 한 번 부드럽게 간다", () => {
    const host = stubHost({ rects: asRects() });
    mount(mapScreen({ progress: twoStepsDone }));

    expect(host.measured()).toEqual(
      expect.arrayContaining([
        "#journey-map-unit-ordering",
        "#journey-map-screen-scroll",
        "#journey-map-screen-header",
      ]),
    );
    expect(host.scrollTos()).toEqual([scrollToCall(448, true)]);
    expect(host.scrollIntoViews()).toEqual([]);
  });

  test("AS3. 같은 props로 다시 그리거나 스크롤 이벤트가 여럿 와도 다시 옮기지 않는다", () => {
    const host = stubHost({ rects: asRects() });
    const view = mount(mapScreen({ progress: twoStepsDone }));
    expect(host.scrollTos()).toHaveLength(1);

    rerender(view, mapScreen({ progress: twoStepsDone }));
    host.scroll(120);
    host.scroll(448);

    expect(host.scrollTos()).toHaveLength(1);
  });

  test("AS4. 답이 오기 전에 사용자가 먼저 스크롤하면 늦게 온 답으로는 옮기지 않는다", () => {
    const host = stubHost({ rects: asRects() });
    deferAll(host);
    mount(mapScreen({ progress: twoStepsDone }));

    host.scroll(80);
    host.flush();

    expect(host.scrollTos()).toEqual([]);
    expect(host.scrollIntoViews()).toEqual([]);
  });

  test("AS5b. 답이 오기 전에 맵이 내려가면 늦게 온 답으로는 옮기지 않는다", () => {
    const host = stubHost({ rects: asRects() });
    deferAll(host);
    const view = mount(mapScreen({ progress: twoStepsDone }));

    view.unmount();
    host.flush();

    expect(host.scrollTos()).toEqual([]);
    expect(host.scrollIntoViews()).toEqual([]);
  });

  test("AS5. 답이 오기 전에 맵을 터치하면 늦게 온 답으로는 옮기지 않는다", () => {
    const host = stubHost({ rects: asRects() });
    deferAll(host);
    mount(mapScreen({ progress: twoStepsDone }));

    touchMap();
    host.flush();

    expect(host.scrollTos()).toEqual([]);
    expect(host.scrollIntoViews()).toEqual([]);
  });

  test("AS6. 동작 줄이기에서는 같은 목적지로 즉시(smooth 거짓) 간다", () => {
    const host = stubHost({ rects: asRects() });
    mount(reduced(mapScreen({ progress: twoStepsDone })));

    expect(host.scrollTos()).toEqual([scrollToCall(448, false)]);
  });

  test("AS7. 자리를 못 재면 대상 셀을 가운데로 옮기는 일을 호스트에 맡기고, 동작 줄이기에서는 behavior none이다", () => {
    const smoothHost = stubHost({ measurable: false });
    mount(mapScreen({ progress: twoStepsDone }));

    expect(smoothHost.scrollTos()).toEqual([]);
    expect(smoothHost.scrollIntoViews()).toEqual([
      {
        selector: "#journey-map-unit-ordering",
        method: "scrollIntoView",
        params: { scrollIntoViewOptions: { block: "center", behavior: "smooth" } },
      },
    ]);

    cleanup();
    vi.restoreAllMocks();

    const reducedHost = stubHost({ measurable: false });
    mount(reduced(mapScreen({ progress: twoStepsDone })));

    expect(reducedHost.scrollIntoViews()).toEqual([
      {
        selector: "#journey-map-unit-ordering",
        method: "scrollIntoView",
        params: { scrollIntoViewOptions: { block: "center", behavior: "none" } },
      },
    ]);
  });

  test("AS8. 진행 없이 열었다가 진행이 늦게 닿으면 그 대상으로 한 번 옮긴다", () => {
    const host = stubHost({ rects: asRects() });
    const view = mount(mapScreen({ progress: noProgress }));
    expect(host.scrollTos()).toEqual([]);

    rerender(view, mapScreen({ progress: twoStepsDone }));

    expect(host.scrollTos()).toEqual([scrollToCall(448, true)]);
  });

  test("AS9. 진행이 닿기 전에 사용자가 손댔으면 늦게 닿은 진행을 따라가지 않는다", () => {
    const host = stubHost({ rects: asRects() });
    const view = mount(mapScreen({ progress: noProgress }));

    touchMap();
    rerender(view, mapScreen({ progress: twoStepsDone }));

    expect(host.scrollTos()).toEqual([]);
    expect(host.scrollIntoViews()).toEqual([]);
  });

  test("AS10. 맵을 떠났다가 진행이 늘어 새로 열면 새 대상으로 다시 한 번 옮긴다", () => {
    const host = stubHost({ rects: asRects() });
    const first = mount(mapScreen({ progress: twoStepsDone }));
    expect(host.scrollTos()).toEqual([scrollToCall(448, true)]);

    act(() => {
      first.unmount();
    });
    const callsBefore = host.calls.length;
    mount(mapScreen({ progress: threeStepsDone }));

    const second = host.calls.slice(callsBefore);
    expect(
      second.filter((call) => call.method === "boundingClientRect").map((c) => c.selector),
    ).toContain("#journey-map-unit-appointment");
    // 900 − 252 = 648.
    expect(second.filter((call) => call.method === "scrollTo")).toEqual([scrollToCall(648, true)]);
  });

  test("AS11. 튜토리얼을 다 끝낸 맵에 카탈로그가 늦게 오면 처음은 최종 테스트로, 다음은 첫 표지로 한 번씩 옮긴다", () => {
    const coverDomId = catalogUnitDomId("u01-water", "intro");
    const host = stubHost({
      rects: {
        ...asRects(),
        "#journey-map-unit-tutorial-final-test": unitRect(5000),
        [`#${coverDomId}`]: unitRect(6200),
      },
    });
    const view = mount(mapScreen({ progress: tutorialAllDone }));

    expect(
      host.measured().filter((selector) => selector === "#journey-map-unit-tutorial-final-test"),
    ).toHaveLength(1);
    expect(host.scrollTos()).toEqual([scrollToCall(5000 - 252, true)]);

    rerender(view, mapScreen({ progress: tutorialAllDone, catalog: catalogProps() }));

    expect(host.measured().filter((selector) => selector === `#${coverDomId}`)).toHaveLength(1);
    expect(
      host.measured().filter((selector) => selector === "#journey-map-unit-tutorial-final-test"),
    ).toHaveLength(1);
    expect(host.scrollTos()).toEqual([
      scrollToCall(5000 - 252, true),
      scrollToCall(6200 - 252, true),
    ]);
  });

  test("AS12. 첫 유닛 가이드가 떠 있는 동안과 닫은 뒤에도 옮기지 않는다", () => {
    const host = stubHost({ rects: asRects() });
    mount(
      <FirstUnitGuideProvider enabled>
        {mapScreen({ progress: noProgress })}
      </FirstUnitGuideProvider>,
    );
    expect(screen.queryByTestId("first-unit-guide-map")).not.toBeNull();
    expect(host.scrollTos()).toEqual([]);

    act(() => {
      fireEvent.tap(screen.getByTestId("first-unit-guide-map"), { eventType: "catchEvent" });
    });

    expect(screen.queryByTestId("first-unit-guide-map")).toBeNull();
    expect(host.scrollTos()).toEqual([]);
    expect(host.scrollIntoViews()).toEqual([]);
  });

  test("AS12b. 가이드가 떠 있는 채 재는 답이 늦게 와도 가이드를 닫은 뒤에도 옮기지 않는다(대상이 있는 진행)", () => {
    const host = stubHost({ rects: asRects() });
    deferAll(host);
    mount(
      <FirstUnitGuideProvider enabled>
        {mapScreen({ progress: twoStepsDone })}
      </FirstUnitGuideProvider>,
    );
    expect(screen.queryByTestId("first-unit-guide-map")).not.toBeNull();

    host.flush();
    expect(host.scrollTos()).toEqual([]);

    act(() => {
      fireEvent.tap(screen.getByTestId("first-unit-guide-map"), { eventType: "catchEvent" });
    });
    host.flush();

    expect(host.scrollTos()).toEqual([]);
    expect(host.scrollIntoViews()).toEqual([]);
  });

  test("AS13. 재는 사이에 스텝을 눌러 말풍선이 열리면 스크롤 호출은 말풍선의 것 하나뿐이다", () => {
    const host = stubHost({ rects: asRects() });
    deferAll(host);
    mount(mapScreen({ progress: twoStepsDone }));

    act(() => {
      fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), { detail: { y: 750 } });
    });
    host.flush();

    expect(screen.queryByTestId("step-sheet-panel")).not.toBeNull();
    // 말풍선의 목적지(유닛 중심 750을 가운데 460으로)는 290이고, 자동 스크롤의 448과 다릅니다.
    expect(host.actions()).toEqual([scrollToCall(290, true)]);
  });

  test("AS14. 구획 자리 측정이 자동 스크롤 뒤에 닿아도 그때 스크롤 자리로 머리 카드가 구획을 고른다", () => {
    const host = stubHost({
      rects: {
        ...asRects(),
        "#journey-map-screen-episode-tutorial": unitRect(100),
        [`#${catalogSectionDomId("u01-water")}`]: unitRect(1100),
        [`#${catalogSectionDomId("u02-checkin")}`]: unitRect(2100),
        [`#${catalogSectionDomId("u03-mina")}`]: unitRect(3100),
      },
    });
    host.defer = (selector) =>
      selector.startsWith("#journey-map-screen-episode-") ||
      selector.startsWith("#journey-map-screen-catalog-");
    mount(
      mapScreen({
        progress: twoStepsDone,
        catalog: catalogProps({ sections: catalogReadySections }),
      }),
    );
    // 자동 스크롤은 구획 답과 상관없이 먼저 돕니다(대상: ordering).
    expect(host.scrollTos()).toHaveLength(1);

    // 둘째 카탈로그 구획 안(2100 − 100 = 2000 이상)입니다. 구획 자리를 아직 모르는 때의 이벤트입니다.
    host.scroll(2500);
    expect(screen.queryByText("Lobby")).toBeNull();

    host.flush();

    expect(screen.queryByText("Lobby")).not.toBeNull();
    expect(screen.queryByText("Alley")).toBeNull();
  });
});

// 도착 뒤 한 번 바로잡기(정정 2). 도착 전 · 후의 rect 표를 테스트가 갈아 끼웁니다: 목적지 X(448)로 간 뒤
// 머리 카드가 30 커져(아래 모서리 258 → 정렬선 282) 대상이 정렬선 위 30(252)에 서 있는 상태입니다.
const unitSelector = "#journey-map-unit-ordering";
const headerSelector = "#journey-map-screen-header";
const arrival = 448;

const measureCount = (host: HostStub): number =>
  host.measured().filter((selector) => selector === unitSelector).length;

/** 도착 뒤의 표 — 대상이 `top`에 서 있고 머리 카드가 30 커졌다. */
function swapToArrived(host: HostStub, targetTop = 700 - arrival): void {
  host.rects[unitSelector] = unitRect(targetTop);
  host.rects[headerSelector] = { top: 60, height: 198 };
}

function mountArrived(element: ReactElement = mapScreen({ progress: twoStepsDone })) {
  const host = stubHost({ rects: asRects() });
  const view = mount(element);
  expect(host.scrollTos()).toEqual([scrollToCall(arrival, true)]);
  return { host, view };
}

describe("JourneyMapScreen 도착 뒤 보정", () => {
  test("AC1. 도착하면 대상 셀 · 스크롤 · 머리 카드를 다시 재고 30만큼 되돌린 목적지로 한 번 더 간다(보정은 늘 즉시)", () => {
    const { host } = mountArrived();
    const measuredBefore = host.measured().length;
    swapToArrived(host);

    host.scroll(arrival);

    expect(host.measured().slice(measuredBefore)).toEqual(
      expect.arrayContaining([unitSelector, "#journey-map-screen-scroll", headerSelector]),
    );
    expect(host.scrollTos()).toEqual([
      scrollToCall(arrival, true),
      scrollToCall(arrival - 30, false),
    ]);
    expect(host.scrollIntoViews()).toEqual([]);
  });

  test("AC2. 보정 뒤의 스크롤 이벤트(418 · 448)를 더 받아도 다시 옮기지 않는다(대상당 한 번)", () => {
    const { host } = mountArrived();
    swapToArrived(host);
    host.scroll(arrival);
    expect(host.scrollTos()).toHaveLength(2);
    const measuredAfterCorrection = measureCount(host);

    host.scroll(arrival - 30);
    host.scroll(arrival);

    expect(host.scrollTos()).toHaveLength(2);
    expect(measureCount(host)).toBe(measuredAfterCorrection);
  });

  test("AC3. 카드가 그대로면 도착해서 다시 재되 옮기지 않는다", () => {
    const { host } = mountArrived();
    const before = measureCount(host);
    host.rects[unitSelector] = unitRect(700 - arrival);

    host.scroll(arrival);

    expect(measureCount(host)).toBe(before + 1);
    expect(host.scrollTos()).toHaveLength(1);
  });

  test("AC3b. 카드가 작아져 대상이 정렬선보다 아래에 서면 다시 재도 아래로 밀지 않는다", () => {
    const { host } = mountArrived();
    const before = measureCount(host);
    host.rects[unitSelector] = unitRect(700 - arrival);
    host.rects[headerSelector] = { top: 60, height: 138 };

    host.scroll(arrival);

    expect(measureCount(host)).toBe(before + 1);
    expect(host.scrollTos()).toHaveLength(1);
  });

  test("AC4. 도착 전의 스크롤(248)은 다시 재지 않는다", () => {
    const { host } = mountArrived();
    const before = host.measured().length;
    swapToArrived(host);

    host.scroll(arrival - 200);

    expect(host.measured()).toHaveLength(before);
    expect(host.scrollTos()).toHaveLength(1);
  });

  test("AC5. 요청과 이벤트가 반올림만큼 다른(447.6) 도착도 도착이다", () => {
    const { host } = mountArrived();
    swapToArrived(host);

    host.scroll(arrival - 0.4);

    const calls = host.scrollTos();
    expect(calls).toHaveLength(2);
    expect(calls[1]?.params?.smooth).toBe(false);
    expect(calls[1]?.params?.offset).toBeCloseTo(arrival - 0.4 - 30, 9);
  });

  test("AC6. 옮긴 뒤 맵에 손대면 도착해도 다시 재지도 옮기지도 않는다", () => {
    const { host } = mountArrived();
    const before = host.measured().length;
    touchMap();
    swapToArrived(host);

    host.scroll(arrival);

    expect(host.measured()).toHaveLength(before);
    expect(host.scrollTos()).toHaveLength(1);
  });

  test("AC7. 다시 재는 답을 기다리는 사이에 손대면 늦게 온 답으로 옮기지 않는다", () => {
    const { host } = mountArrived();
    swapToArrived(host);
    host.defer = () => true;
    const before = measureCount(host);

    host.scroll(arrival);
    // 다시 재는 질의가 나가 있어야 아래 0회가 공허하지 않다.
    expect(measureCount(host)).toBe(before + 1);
    touchMap();
    host.flush();

    expect(host.scrollTos()).toHaveLength(1);
  });

  test("AC8. 다시 재는 답을 기다리는 사이에 스텝을 눌러 말풍선이 열리면 보정하지 않는다", () => {
    const { host } = mountArrived();
    swapToArrived(host);
    host.defer = () => true;
    const before = measureCount(host);

    host.scroll(arrival);
    expect(measureCount(host)).toBe(before + 1);
    act(() => {
      fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), { detail: { y: 750 } });
    });
    host.flush();

    expect(screen.queryByTestId("step-sheet-panel")).not.toBeNull();
    // 처음 이동 하나 + 말풍선의 것 하나뿐입니다 — 보정(418)이 끼지 않는다.
    expect(host.scrollTos()).toHaveLength(2);
    expect(host.scrollTos().map((call) => call.params?.offset)).not.toContain(arrival - 30);
  });

  test("AC9. 다시 잴 때 머리 카드 측정이 실패하면 아무것도 하지 않는다", () => {
    const { host } = mountArrived();
    const before = measureCount(host);
    delete host.rects[headerSelector];

    host.scroll(arrival);

    expect(measureCount(host)).toBe(before + 1);
    expect(host.scrollTos()).toHaveLength(1);
    expect(host.scrollIntoViews()).toEqual([]);
  });

  test("AC10. 동작 줄이기에서는 보정도 smooth 거짓이다", () => {
    const host = stubHost({ rects: asRects() });
    mount(reduced(mapScreen({ progress: twoStepsDone })));
    expect(host.scrollTos()).toEqual([scrollToCall(arrival, false)]);
    swapToArrived(host);

    host.scroll(arrival);

    expect(host.scrollTos()).toEqual([
      scrollToCall(arrival, false),
      scrollToCall(arrival - 30, false),
    ]);
  });

  test("AC11. 처음 측정이 실패해 폴백으로 가면 어떤 스크롤에도 다시 재지 않는다", () => {
    const host = stubHost({ measurable: false });
    mount(mapScreen({ progress: twoStepsDone }));
    expect(host.scrollIntoViews()).toHaveLength(1);
    const before = host.measured().length;

    host.scroll(arrival);
    host.scroll(500);

    expect(host.measured()).toHaveLength(before);
    expect(host.scrollTos()).toEqual([]);
  });

  test("AC12. 도착 전에 대상이 바뀌면 옛 목적지의 도착은 무시하고 새 목적지에서 새 대상을 잰다", () => {
    const host = stubHost({
      rects: { ...asRects(), "#journey-map-unit-appointment": unitRect(900) },
    });
    const view = mount(mapScreen({ progress: twoStepsDone }));
    rerender(view, mapScreen({ progress: threeStepsDone }));
    expect(host.scrollTos()).toEqual([scrollToCall(arrival, true), scrollToCall(648, true)]);
    const before = host.measured().length;
    host.rects[unitSelector] = unitRect(700 - arrival);
    host.rects["#journey-map-unit-appointment"] = unitRect(900 - 648);
    host.rects[headerSelector] = { top: 60, height: 198 };

    host.scroll(arrival);

    expect(host.measured()).toHaveLength(before);
    expect(host.scrollTos()).toHaveLength(2);

    host.scroll(648);

    expect(host.measured().slice(before)).toContain("#journey-map-unit-appointment");
    expect(host.measured().slice(before)).not.toContain(unitSelector);
    expect(host.scrollTos()).toEqual([
      scrollToCall(arrival, true),
      scrollToCall(648, true),
      scrollToCall(648 - 30, false),
    ]);
  });

  test("AC13. 즉시 이동의 도착이 구획 경계도 넘으면 다시 잰 시점의 머리 카드가 도착 구획의 것이다", () => {
    // 대상이 둘째 카탈로그 구획 안(목적지 2048 ≥ 2000)에 있다.
    const host = stubHost({
      rects: {
        ...asRects(),
        [unitSelector]: unitRect(2300),
        "#journey-map-screen-episode-tutorial": unitRect(100),
        [`#${catalogSectionDomId("u01-water")}`]: unitRect(1100),
        [`#${catalogSectionDomId("u02-checkin")}`]: unitRect(2100),
        [`#${catalogSectionDomId("u03-mina")}`]: unitRect(3100),
      },
    });
    // 머리 카드의 높이를 잰 순간의 화면에서 읽습니다 — 둘째 구획의 카드(Lobby)가 그려진 뒤에만 30 큽니다.
    Object.defineProperty(host.rects, headerSelector, {
      enumerable: true,
      get: (): Rect => ({ top: 60, height: screen.queryByText("Lobby") === null ? 168 : 198 }),
    });
    mount(
      reduced(
        mapScreen({
          progress: twoStepsDone,
          catalog: catalogProps({ sections: catalogReadySections }),
        }),
      ),
    );
    expect(host.scrollTos()).toEqual([scrollToCall(2300 - 252, false)]);
    host.rects[unitSelector] = unitRect(252);

    host.scroll(2300 - 252);

    expect(screen.queryByText("Lobby")).not.toBeNull();
    expect(host.scrollTos()).toEqual([
      scrollToCall(2300 - 252, false),
      scrollToCall(2300 - 252 - 30, false),
    ]);
  });
});
