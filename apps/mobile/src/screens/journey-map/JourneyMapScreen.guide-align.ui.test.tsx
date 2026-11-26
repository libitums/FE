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
/** 지도 내용의 레이아웃이 잡혔다는 호스트 소식입니다(높이 0이면 아직 비어 있음). */
const laidOut = (height = 3000) =>
  act(() => {
    fireEvent.layoutchange(screen.getByTestId("journey-map-screen-map"), { detail: { height } });
  });
const guided = (enabled: boolean) => (
  <FirstUnitGuideProvider enabled={enabled}>{u00Screen(u00Catalog())}</FirstUnitGuideProvider>
);

describe("첫 유닛 가이드와 지도 위치", () => {
  test("GA1. 지도가 내려가 있는 채 가이드가 서면 먼저 맨 위로 즉시 옮기고, 맨 위에 닿은 뒤에야 스크림을 보인다", () => {
    const host = stubHost({ rects: asRects() });
    const view = mount(guided(false));
    laidOut();
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
    laidOut();

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

  // DURU-ANDROID-F(1.2.0) · G(1.3.0) — 처음 놓인 지도에 보내던 `scrollTo(0)`이 신규 설치마다 오류였다(실기에서는 내용의
  // 레이아웃 소식 뒤에도 네이티브 스크롤 범위가 아직 「0 − 화면 높이」인 순간이 있다). 처음 놓인 지도는 이미 맨 위라 할 일이
  // 없으므로 보내지 않는다.
  test("GA4. 처음 열린 지도가 맨 위면 레이아웃 뒤에도 옮기지 않고 가이드는 바로 선다", () => {
    const host = stubHost({ rects: asRects() });
    mount(guided(true));
    laidOut();

    expect(scrimShown()).toBe(true);
    expect(host.scrollTos()).toEqual([]);
  });

  test("GA4b. 이미 놓인 지도에 나중에 가이드가 서면, 알던 위치가 맨 위여도 한 번 옮긴다(소식 없이 밀렸을 수 있음)", () => {
    const host = stubHost({ rects: asRects() });
    const view = mount(guided(false));
    laidOut();

    rerender(view, guided(true));

    expect(scrimShown()).toBe(true);
    expect(host.scrollTos()).toEqual([scrollToCall(0, false)]);
  });

  test("GA6. 처음 열린 지도는 레이아웃 전 · 높이 0 · 높이가 생긴 뒤 모두 옮기지 않는다", () => {
    const host = stubHost({ rects: asRects() });
    mount(guided(true));

    expect(host.scrollTos()).toEqual([]);
    expect(scrimShown()).toBe(true);

    laidOut(0);
    laidOut(3000);
    laidOut(3200);
    expect(host.scrollTos()).toEqual([]);
  });

  test("GA6b. 복원 위치에서 열린 지도는 레이아웃되기 전에는 옮기지 않고, 높이가 생긴 첫 소식에 한 번 옮긴다", () => {
    rememberMapScroll(1200);
    const host = stubHost({ rects: asRects() });
    mount(guided(true));

    expect(host.scrollTos()).toEqual([]);

    laidOut(0);
    expect(host.scrollTos()).toEqual([]);

    laidOut(3000);
    laidOut(3200);
    expect(host.scrollTos()).toEqual([scrollToCall(0, false)]);
  });
});

test("GA7. 가이드 동안 표지 그림까지 들리고, 그림 자리를 눌러도 안내만 닫히고 원래대로 돌아간다", () => {
  stubHost({ rects: asRects() });
  const base = u00Catalog();
  const onStartCover = vi.fn<(episodeId: string) => void>();
  const catalog = {
    ...base,
    onStartCover,
    sections: base.sections.map((section) =>
      section.kind === "catalog-ready"
        ? { ...section, cover: `images/covers/${section.episodeId}.webp` }
        : section,
    ),
    coverImageUrlOf: (path: string) => `/static/fixture/${path}`,
  };
  mount(<FirstUnitGuideProvider enabled>{u00Screen(catalog)}</FirstUnitGuideProvider>);

  const lifted = () => screen.getByTestId("catalog-cover-illustrated-u00-tutorial");
  expect(lifted().classList.contains("catalog-cover-illustrated-guided")).toBe(true);
  expect(
    screen
      .getByTestId("catalog-cover-illustrated-u01-water")
      .classList.contains("catalog-cover-illustrated-guided"),
  ).toBe(false);

  act(() => {
    fireEvent.tap(lifted(), {});
  });

  expect(scrimShown()).toBe(false);
  expect(onStartCover).not.toHaveBeenCalled();
  expect(lifted().classList.contains("catalog-cover-illustrated-guided")).toBe(false);
});

// 기기에서 안내 글 탭이 죽어 있었습니다(GL5t) — `event-through`는 터치를 Lynx에 보내지 않고 자손에 상속돼, 글을 감싼
// 바깥의 탭에도 가림막에도 닿지 않았습니다. jsdom은 그 속성을 흉내 내지 않으므로 속성 자체가 없는 것을 봅니다.
test("GA9. 안내 글은 터치를 통과시키지 않고, 누르면 들린 그림이 있어도 안내가 닫히고 시작은 한 번이다", () => {
  stubHost({ rects: asRects() });
  const base = u00Catalog();
  const onStartCover = vi.fn<(episodeId: string) => void>();
  const catalog = {
    ...base,
    onStartCover,
    sections: base.sections.map((section) =>
      section.kind === "catalog-ready"
        ? { ...section, cover: `images/covers/${section.episodeId}.webp` }
        : section,
    ),
    coverImageUrlOf: (path: string) => `/static/fixture/${path}`,
  };
  mount(<FirstUnitGuideProvider enabled>{u00Screen(catalog)}</FirstUnitGuideProvider>);

  const words = screen.getByTestId("first-unit-map-tooltip");
  expect(words.querySelector('[event-through="true"]') === null).toBe(true);
  expect(words.getAttribute("event-through")).not.toBe("true");

  act(() => {
    fireEvent.tap(words, {});
  });

  expect(scrimShown()).toBe(false);
  expect(onStartCover).toHaveBeenCalledTimes(1);
});

// Android TalkBack은 `accessibility-enable-tap`이 있는 네이티브 View만 두 번 탭으로 누릅니다(`AccessibilityTapBridge`).
test("GA10. 안내 글은 낭독 요소 하나인 단추이고 두 번 탭으로 눌린다", () => {
  stubHost({ rects: asRects() });
  mount(guided(true));

  const words = screen.getByTestId("first-unit-map-tooltip");
  expect(words.getAttribute("accessibility-element")).toBe("true");
  expect(words.getAttribute("accessibility-label")).toBe("Tap to start your lesson!");
  expect(words.getAttribute("accessibility-traits")).toBe("button");
  expect(words.getAttribute("accessibility-enable-tap")).toBe("true");
  expect(words.getAttribute("flatten")).toBe("false");
  expect(words.querySelectorAll('[accessibility-element="true"]').length).toBe(0);
});

// 그림은 노드보다 낮고 가림막보다 높아야 합니다: 래퍼가 대화 층에 서고, 그 안에서는 그림 → 노드(안내 겹) 순입니다.
test("GA8. 들린 표지 래퍼는 가림막(시트 층) 위 대화 층이고 그림에는 따로 z-index가 없다", async () => {
  const { readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const read = (path: string) =>
    readFileSync(resolve(process.cwd(), path), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const guide = read("src/components/first-unit-guide.css");
  expect(guide).toMatch(
    /\.catalog-cover-illustrated-guided\s*\{[^}]*z-index: var\(--libitum-elevation-z-dialog\)/,
  );
  expect(guide).toMatch(
    /\.first-unit-map-scrim\s*\{[^}]*z-index: var\(--libitum-elevation-z-sheet\)/,
  );
  expect(read("src/screens/journey-map/catalog-cover-illustration.css")).not.toMatch(/z-index/);
});

test("GA5. 오버레이 위 가이드 문구(말풍선 메시지)는 흰색이다", async () => {
  const { readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const css = readFileSync(resolve(process.cwd(), "src/components/first-unit-guide.css"), "utf8");
  expect(css).toMatch(
    /\.first-unit-map-tooltip-message \{[^}]*color: var\(--libitum-color-white\)/,
  );
});
