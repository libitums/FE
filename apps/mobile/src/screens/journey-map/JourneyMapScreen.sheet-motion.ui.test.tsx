import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup } from "@lynx-js/react/testing-library";

import { asRects, atTwo, mount, screenSelector } from "./JourneyMapScreen.autoscroll-support";
import {
  advance,
  burstCount,
  expectEntrance,
  placeTarget,
  tapTarget,
} from "./JourneyMapScreen.sheet-motion-support";
import { stubHost } from "./JourneyMapScreen.test-support";

// `ui` 계층: 유닛을 누른 뒤 말풍선 · 띠 · 노드가 언제 대기에서 등장으로 넘어가는지의 순서 — 대역 호스트와 fake timer로
// 봅니다. 스크롤이 필요한지 · 조용한지 · 측정이 실패했는지 · 답이 안 오는지가 갈림길입니다. 단계마다의 클래스 값은 unit이 집니다.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("JourneyMapScreen 등장 시작 순서", () => {
  test("SQ1. 스크롤이 필요하면 도착 전까지 대기이고, 목적지에 닿으면 등장한다", () => {
    const host = stubHost({ rects: asRects() });
    placeTarget(host, 700);
    mount(atTwo());

    tapTarget();
    expectEntrance("awaiting");

    host.scroll(120);
    expectEntrance("awaiting");

    host.scroll(290);
    expectEntrance("expressive");
    expect(burstCount()).toBe(1);
  });

  test("SQ2. 스크롤이 필요 없으면 측정 답이 오는 같은 렌더에서 바로 등장한다 (타이머를 돌리지 않는다)", () => {
    const host = stubHost({ rects: asRects() });
    placeTarget(host, 700);
    mount(atTwo());
    placeTarget(host, 410);
    host.scroll(290);

    tapTarget();

    expectEntrance("expressive");
    expect(burstCount()).toBe(1);
  });

  test("SQ3. 끝에서 멈춰 목적지에 못 닿으면 마지막 스크롤 뒤 200ms 조용하면 등장한다", () => {
    const host = stubHost({ rects: asRects() });
    placeTarget(host, 5410);
    mount(atTwo());

    tapTarget();
    host.scroll(3000);
    advance(199);
    expectEntrance("awaiting");

    advance(1);
    expectEntrance("expressive");
    expect(burstCount()).toBe(1);
  });

  test("SQ4. 조용함은 스크롤 이벤트마다 다시 걸린다", () => {
    const host = stubHost({ rects: asRects() });
    placeTarget(host, 5410);
    mount(atTwo());

    tapTarget();
    host.scroll(100);
    advance(150);
    host.scroll(200);
    advance(150);
    expectEntrance("awaiting");

    advance(50);
    expectEntrance("expressive");
    expect(burstCount()).toBe(1);
  });

  test("SQ5. 측정이 실패해 scrollIntoView로 맡기면 200ms 조용한 뒤 등장한다", () => {
    const host = stubHost({ rects: asRects() });
    placeTarget(host, 700);
    mount(atTwo());
    delete host.rects[screenSelector];

    tapTarget();

    expect(host.scrollIntoViews()).toHaveLength(1);
    expectEntrance("awaiting");
    advance(199);
    expectEntrance("awaiting");
    advance(1);
    expectEntrance("expressive");
    expect(burstCount()).toBe(1);
  });

  test("SQ6. 측정 답이 오지 않아도 열린 뒤 1,000ms에는 등장하고, 늦은 답이 되돌리지 않는다", () => {
    const host = stubHost({ rects: asRects() });
    placeTarget(host, 700);
    mount(atTwo());
    host.defer = () => true;

    tapTarget();
    advance(999);
    expectEntrance("awaiting");

    advance(1);
    expectEntrance("expressive");
    host.flush();
    expectEntrance("expressive");
    expect(burstCount()).toBe(1);
  });
});
