import type { ReactElement } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import {
  asRects,
  atThree,
  atTwo,
  headerSelector,
  mount,
  nextUnitSelector,
  reduced,
  rerender,
  scrollToCall,
  screenSelector,
  tapTarget,
  unitRect,
  unitSelector,
} from "./JourneyMapScreen.autoscroll-support";
import { stubHost, touchMap, type HostStub } from "./JourneyMapScreen.test-support";

// 부드러운 이동(본 이동 · 보정)은 대역이 끝 위치로 부드러운 `scrollTo` 한 번을 남깁니다.
vi.mock("./use-map-glide", async () => {
  const scroll = await import("./journey-map-scroll");
  const react = await import("@lynx-js/react");
  return {
    useMapGlide: () => ({
      scrollRef: react.useMainThreadRef(null),
      glide: (_from: number, to: number) => scroll.scrollMapTo(to, "smooth"),
      stop: () => {},
    }),
  };
});

// `ui` 계층: 도착 뒤 한 번 바로잡기. 도착 전 · 후의 rect 표를 테스트가 갈아 끼웁니다.
// 목적지 290으로 간 뒤 대상이 정렬 자리 410보다 30 위(380)에 서 있으면, 같은 규칙의 목적지는
// 290 + (380 + 50 − 460) = 260입니다(양방향: 30 아래면 320). 판정 식은 unit이 지고, 여기서는 호출만 봅니다.
// 보정은 본 이동이 끝난 뒤 짧게 이어 옮깁니다(사용자 결정 2026-10-22, ADR-0022 — 「늘 즉시」를 대체). 동작 줄이기에서만
// 즉시입니다.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const arrival = 290;

const measureCount = (host: HostStub): number =>
  host.measured().filter((selector) => selector === unitSelector).length;

/** 도착 뒤의 표 — 대상이 `top`에 서 있다(정렬 자리는 410). */
function swapToArrived(host: HostStub, targetTop = 380): void {
  host.rects[unitSelector] = unitRect(targetTop);
}

function mountArrived(element: ReactElement = atTwo()) {
  const host = stubHost({ rects: asRects() });
  const view = mount(element);
  expect(host.scrollTos()).toEqual([scrollToCall(arrival, true)]);
  return { host, view };
}

describe("JourneyMapScreen 도착 뒤 보정", () => {
  test("AC1. 도착하면 대상 · 스크롤 · 화면 · 띠 손잡이를 다시 재고, 30 위에 선 대상을 같은 자리로 되돌리는 목적지(260)로 한 번 더 짧게 이어 간다", () => {
    const { host } = mountArrived();
    const measuredBefore = host.measured().length;
    swapToArrived(host);

    host.scroll(arrival);

    expect(host.measured().slice(measuredBefore)).toEqual(
      expect.arrayContaining([
        unitSelector,
        "#journey-map-screen-scroll",
        screenSelector,
        headerSelector,
      ]),
    );
    expect(host.scrollTos()).toEqual([scrollToCall(arrival, true), scrollToCall(260, true)]);
    expect(host.scrollIntoViews()).toEqual([]);
  });

  test("AC2. 보정 뒤의 스크롤 이벤트(260 · 290)를 더 받아도 다시 옮기지 않는다(대상당 한 번)", () => {
    const { host } = mountArrived();
    swapToArrived(host);
    host.scroll(arrival);
    expect(host.scrollTos()).toHaveLength(2);
    const measuredAfterCorrection = measureCount(host);

    host.scroll(260);
    host.scroll(arrival);

    expect(host.scrollTos()).toHaveLength(2);
    expect(measureCount(host)).toBe(measuredAfterCorrection);
  });

  test("AC3. 대상이 제자리(410)면 도착해서 다시 재되 옮기지 않는다", () => {
    const { host } = mountArrived();
    const before = measureCount(host);
    swapToArrived(host, 410);

    host.scroll(arrival);

    expect(measureCount(host)).toBe(before + 1);
    expect(host.scrollTos()).toHaveLength(1);
  });

  test("AC3b. 대상이 30 아래(440)에 서면 양방향으로 바로잡아 320으로 한 번 더 간다", () => {
    const { host } = mountArrived();
    const before = measureCount(host);
    swapToArrived(host, 440);

    host.scroll(arrival);

    expect(measureCount(host)).toBe(before + 1);
    expect(host.scrollTos()).toEqual([scrollToCall(arrival, true), scrollToCall(320, true)]);
  });

  test("AC4. 도착 전의 스크롤(90)은 다시 재지 않는다", () => {
    const { host } = mountArrived();
    const before = host.measured().length;
    swapToArrived(host);

    host.scroll(90);

    expect(host.measured()).toHaveLength(before);
    expect(host.scrollTos()).toHaveLength(1);
  });

  test("AC5. 요청과 이벤트가 반올림만큼 다른(289.6) 도착도 도착이다", () => {
    const { host } = mountArrived();
    swapToArrived(host);

    host.scroll(arrival - 0.4);

    const calls = host.scrollTos();
    expect(calls).toHaveLength(2);
    expect(calls[1]?.params?.smooth).toBe(true);
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

  test("AC8. 다시 재는 답을 기다리는 사이에 유닛을 눌러 말풍선이 열리면 보정하지 않는다", () => {
    const { host } = mountArrived();
    swapToArrived(host);
    host.defer = () => true;
    const before = measureCount(host);

    host.scroll(arrival);
    expect(measureCount(host)).toBe(before + 1);
    tapTarget();
    host.flush();

    expect(screen.queryByTestId("step-sheet-panel")).not.toBeNull();
    // 처음 이동 하나 + 말풍선의 것 하나뿐입니다 — 보정이 끼지 않는다. 말풍선과 보정이 같은 셀을 같은 규칙으로
    // 재므로 목적지(260)는 같고, 셋째 호출이 없는 것이 보정이 막혔다는 증거입니다.
    expect(host.scrollTos()).toEqual([scrollToCall(arrival, true), scrollToCall(260, true)]);
  });

  test("AC9. 다시 잴 때 띠 손잡이만 못 재면 띠 없이 같은 규칙으로 판정한다 — 대상이 제자리(410)면 옮기지 않는다", () => {
    const { host } = mountArrived();
    const before = measureCount(host);
    swapToArrived(host, 410);
    delete host.rects[headerSelector];

    host.scroll(arrival);

    expect(measureCount(host)).toBe(before + 1);
    expect(host.scrollTos()).toHaveLength(1);
    expect(host.scrollIntoViews()).toEqual([]);
  });

  test("AC9b. 다시 잴 때 화면 상자를 못 재면 아무것도 하지 않는다(폴백 없음)", () => {
    const { host } = mountArrived();
    const before = measureCount(host);
    swapToArrived(host);
    delete host.rects[screenSelector];

    host.scroll(arrival);

    expect(measureCount(host)).toBe(before + 1);
    expect(host.scrollTos()).toHaveLength(1);
    expect(host.scrollIntoViews()).toEqual([]);
  });

  test("AC10. 동작 줄이기에서는 보정도 smooth 거짓이다", () => {
    const host = stubHost({ rects: asRects() });
    mount(reduced(atTwo()));
    expect(host.scrollTos()).toEqual([scrollToCall(arrival, false)]);
    swapToArrived(host);

    host.scroll(arrival);

    expect(host.scrollTos()).toEqual([scrollToCall(arrival, false), scrollToCall(260, false)]);
  });

  test("AC11. 처음 측정이 실패해 폴백으로 가면 어떤 스크롤에도 다시 재지 않는다", () => {
    const host = stubHost({ measurable: false });
    mount(atTwo());
    expect(host.scrollIntoViews()).toHaveLength(1);
    const before = host.measured().length;

    host.scroll(arrival);
    host.scroll(500);

    expect(host.measured()).toHaveLength(before);
    expect(host.scrollTos()).toEqual([]);
  });

  test("AC12. 도착 전에 대상이 바뀌면 옛 목적지의 도착은 무시하고 새 목적지에서 새 대상을 잰다", () => {
    const host = stubHost({
      rects: { ...asRects(), [nextUnitSelector]: unitRect(900) },
    });
    const view = mount(atTwo());
    rerender(view, atThree());
    expect(host.scrollTos()).toEqual([scrollToCall(arrival, true), scrollToCall(490, true)]);
    const before = host.measured().length;
    host.rects[unitSelector] = unitRect(410);
    host.rects[nextUnitSelector] = unitRect(380);

    host.scroll(arrival);

    expect(host.measured()).toHaveLength(before);
    expect(host.scrollTos()).toHaveLength(2);

    host.scroll(490);

    expect(host.measured().slice(before)).toContain(nextUnitSelector);
    expect(host.measured().slice(before)).not.toContain(unitSelector);
    expect(host.scrollTos()).toEqual([
      scrollToCall(arrival, true),
      scrollToCall(490, true),
      scrollToCall(460, true),
    ]);
  });
});
