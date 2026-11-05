import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { FirstUnitGuideProvider } from "../../components/first-unit-guide";
import { asRects, mount, rerender, scrollToCall } from "./JourneyMapScreen.autoscroll-support";
import { forgetMapScroll, rememberMapScroll } from "./journey-map-scroll-memory";
import { stubHost } from "./JourneyMapScreen.test-support";
import { u00Catalog, u00Screen } from "./JourneyMapScreen.tutorial-u00.test-support";

// `ui` 계층 — 버그 재현: 지도가 맨 위가 아닌 채(복원 · 사용자 스크롤) 첫 유닛 가이드가 뜨면, 스크림 위로 들어 올린
// 튜토리얼 표지가 지도와 어긋나 「노드가 하나 더 있는 것처럼」 보였다(Android 실기). 가이드가 서기 전에 지도를 맨 위
// (표지)로 즉시 옮기고, 맨 위에 닿았음을 확인한 뒤에야 스크림 · 강조를 보인다.

vi.mock("./use-map-glide", async () => {
  const scroll = await import("./journey-map-scroll");
  const react = await import("@lynx-js/react");
  return {
    useMapGlide: () => ({
      scrollRef: react.useMainThreadRef(null),
      glide: (_from: number, to: number, durationMs: number) =>
        scroll.scrollMapTo(to, durationMs > 0 ? "smooth" : "instant"),
      stop: () => {},
    }),
  };
});

afterEach(() => {
  cleanup();
  forgetMapScroll();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// 요소를 그대로 단언하면 실패 메시지가 Lynx 요소를 출력하다 깨집니다 — 참 · 거짓으로 봅니다.
const scrimShown = () => screen.queryByTestId("first-unit-guide-map") !== null;
// `<scroll-view>`는 jsdom이 아는 태그라 요소를 그대로 넘기면 fireEvent가 거부합니다 — NodesRef를 거칩니다.
// 호스트 대역(`stubHost`)이 질의를 바꾸기 전의 진짜 질의로 만듭니다(`JourneyMapScreen.anchor.ui.test.tsx`와 같은 근거).
const realQuery = lynx.createSelectorQuery.bind(lynx);
const scrollTo = (scrollTop: number) =>
  act(() => {
    const scrollRef = realQuery().select("#journey-map-screen-scroll");
    fireEvent.scroll(scrollRef as unknown as Element, { detail: { scrollTop } });
  });
const guided = (enabled: boolean) => (
  <FirstUnitGuideProvider enabled={enabled}>{u00Screen(u00Catalog())}</FirstUnitGuideProvider>
);

describe("첫 유닛 가이드와 지도 위치", () => {
  test("GA1. 지도가 내려가 있는 채 가이드가 서면 먼저 맨 위로 즉시 옮기고, 맨 위에 닿은 뒤에야 스크림을 보인다", () => {
    const host = stubHost({ rects: asRects() });
    const view = mount(guided(false));
    scrollTo(900);

    rerender(view, guided(true));

    expect(scrimShown()).toBe(false);
    expect(host.scrollTos()).toContainEqual(scrollToCall(0, false));

    scrollTo(0);

    expect(scrimShown()).toBe(true);
  });

  test("GA2. 복원된 스크롤 자리에서 열릴 때도 같다", () => {
    rememberMapScroll(1200);
    const host = stubHost({ rects: asRects() });
    mount(guided(true));

    expect(scrimShown()).toBe(false);
    expect(host.scrollTos()).toContainEqual(scrollToCall(0, false));

    scrollTo(0);
    expect(scrimShown()).toBe(true);
  });

  test("GA3. 맨 위에 닿았다는 소식이 오지 않아도 잠시 뒤에는 가이드를 보인다(멈춰 버리지 않음)", () => {
    vi.useFakeTimers();
    stubHost({ rects: asRects() });
    const view = mount(guided(false));
    scrollTo(900);
    rerender(view, guided(true));
    expect(scrimShown()).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(scrimShown()).toBe(true);
  });

  test("GA4. 알던 위치가 맨 위여도 맨 위로 즉시 한 번 옮기고(소식 없이 밀렸을 수 있음) 바로 보인다", () => {
    const host = stubHost({ rects: asRects() });
    mount(guided(true));

    expect(scrimShown()).toBe(true);
    expect(host.scrollTos()).toEqual([scrollToCall(0, false)]);
  });
});

test("GA5. 오버레이 위 가이드 문구(말풍선 메시지)는 흰색이다", async () => {
  const { readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const css = readFileSync(resolve(process.cwd(), "src/components/first-unit-guide.css"), "utf8");
  expect(css).toMatch(
    /\.first-unit-map-tooltip \.ui-lynx-tooltip-message \{[^}]*color: var\(--libitum-color-white\)/,
  );
});
