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
