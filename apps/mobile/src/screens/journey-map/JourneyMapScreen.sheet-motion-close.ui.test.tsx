import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { asRects, mount, reduced, scrollToCall } from "./JourneyMapScreen.autoscroll-support";
import {
  advance,
  burstCount,
  expectEntrance,
  expectNothingEntering,
  nodePop,
  placeOrdering,
  sheetPop,
  tapOrdering,
  bandWrapper,
} from "./JourneyMapScreen.sheet-motion-support";
import {
  catalogProps,
  mapScreen,
  stubHost,
  tutorialAllDone,
  twoStepsDone,
} from "./JourneyMapScreen.test-support";
import { catalogUnitDomId } from "./catalog-map";
import { sheetEntranceClasses } from "./journey-map-sheet-motion";

// `ui` 계층: 줄이기 모드의 즉시 표시, 대기 · 등장 중 닫기와 다시 열기, 카탈로그 레슨 · 최종의 연결을 봅니다.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const closeSheet = (): void => {
  act(() => {
    fireEvent.tap(screen.getByTestId("step-sheet-close"), {});
  });
};
const percent = (): string | null => screen.getByTestId("step-sheet-progress-percent").textContent;

describe("JourneyMapScreen 줄이기", () => {
  test("SQ7. 줄이기: 탭 직후 페이드 표식만 서고 대기 · 튕김 · 반짝임 · 빛이 없으며 값은 최종이고 스크롤은 즉시다", () => {
    const host = stubHost({ rects: asRects() });
    placeOrdering(host, 700);
    mount(reduced(mapScreen({ progress: tutorialAllDone })));

    tapOrdering();

    const fade = sheetEntranceClasses("fade");
    expect(sheetPop().getAttribute("class")).toBe(fade.bubble);
    expect(sheetPop()).toHaveAttribute("data-motion", "reduced");
    expect(sheetPop()).not.toHaveAttribute("user-interaction-enabled");
    expect(bandWrapper()?.getAttribute("class")).toBe(fade.band);
    expect(bandWrapper()).toHaveAttribute("data-motion", "reduced");
    expect(nodePop()?.getAttribute("class")).toBe("journey-step-node-pop");
    expect(burstCount()).toBe(0);
    expect(screen.queryByTestId("step-sheet-start-glow")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ui-lynx-episode-header-fill-sheen")).not.toBeInTheDocument();
    expect(percent()).toBe("100%");
    const last = host.scrollTos().at(-1);
    expect(last).toEqual(scrollToCall(290, false));
  });
});

const rendererCleanupTimers = 1;

describe("JourneyMapScreen 닫기와 다시 열기", () => {
  test("SQ8. 대기 중 가림막을 누르면 말풍선 · 띠 · 튕김이 즉시 걷히고, 타이머가 남지 않으며 뒤의 도착에도 서지 않는다", () => {
    const host = stubHost({ rects: asRects() });
    placeOrdering(host, 700);
    mount(mapScreen({ progress: twoStepsDone }));
    const idle = vi.getTimerCount();
    tapOrdering();
    expectEntrance("awaiting");

    closeSheet();

    expectNothingEntering();
    // 걷힌 노드 몫으로 렌더러가 남기는 10초 정리 타이머 하나(`@lynx-js/react` commit)만 더 있을 수 있습니다.
    expect(vi.getTimerCount()).toBeLessThanOrEqual(idle + rendererCleanupTimers);
    host.scroll(290);
    advance(1000);
    expectNothingEntering();
  });

  test("SQ9. 등장 중(카운트업 도중) 닫으면 즉시 걷히고, 같은 스텝을 다시 누르면 대기부터 새로 시작한다", () => {
    const host = stubHost({ rects: asRects() });
    placeOrdering(host, 700);
    mount(mapScreen({ progress: tutorialAllDone }));
    const idle = vi.getTimerCount();
    tapOrdering();
    host.scroll(290);
    expectEntrance("expressive");
    advance(400);
    const firstPop = sheetPop();

    closeSheet();

    expectNothingEntering();
    // 걷힌 노드 몫으로 렌더러가 남기는 10초 정리 타이머 하나(`@lynx-js/react` commit)만 더 있을 수 있습니다.
    expect(vi.getTimerCount()).toBeLessThanOrEqual(idle + rendererCleanupTimers);

    tapOrdering();
    expectEntrance("awaiting");
    expect(sheetPop()).not.toBe(firstPop);
    expect(percent()).toBe("100%");
  });
});

describe("JourneyMapScreen 카탈로그", () => {
  const coverDone = { "u01-water": ["intro"] };
  const allLessons = { "u01-water": ["intro", "S1", "S3", "S4", "S5", "S6", "S7", "S8", "S9"] };
  const lessonSelector = `#${catalogUnitDomId("u01-water", "S1")}`;
  const finalSelector = `#${catalogUnitDomId("u01-water", "RP")}`;

  test("SQ10. 레슨: 누르면 그 카탈로그 노드가 튕기고, 도착하면 반짝임이 퍼지며 말풍선이 등장으로 넘어간다", () => {
    const host = stubHost({ rects: asRects() });
    host.rects[lessonSelector] = { top: 700, height: 100 };
    mount(mapScreen({ progress: tutorialAllDone, catalog: catalogProps({ progress: coverDone }) }));

    act(() => {
      fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-catalog-unit-u01-water-S1"), {
        detail: { y: 300 },
      });
    });
    const pop = screen.getByTestId("ui-lynx-learning-unit-catalog-unit-u01-water-S1").parentElement;
    expect(pop?.getAttribute("class")).toBe("journey-step-node-pop journey-step-node-pop-enter");
    expect(sheetPop().getAttribute("class")).toBe(sheetEntranceClasses("awaiting").bubble);
    expect(burstCount()).toBe(0);

    host.scroll(Number(host.scrollTos().at(-1)?.params?.offset));

    expect(sheetPop().getAttribute("class")).toBe(sheetEntranceClasses("expressive").bubble);
    expect(burstCount()).toBe(1);
    expect(pop?.parentElement?.querySelector(".journey-step-node-burst")).not.toBeNull();
  });

  test("SQ10. 최종(스페셜): 누르면 최종 배지를 감싼 튕김 래퍼에 등장 클래스가 붙는다", () => {
    const host = stubHost({ rects: asRects() });
    host.rects[finalSelector] = { top: 700, height: 100 };
    mount(
      mapScreen({ progress: tutorialAllDone, catalog: catalogProps({ progress: allLessons }) }),
    );

    act(() => {
      fireEvent.tap(screen.getByTestId("ui-lynx-special-unit-catalog-unit-u01-water-RP"), {
        detail: { y: 300 },
      });
    });

    const pop = screen.getByTestId("ui-lynx-special-unit-catalog-unit-u01-water-RP").parentElement;
    expect(pop?.getAttribute("class")).toBe("journey-step-node-pop journey-step-node-pop-enter");
    expect(sheetPop().getAttribute("class")).toBe(sheetEntranceClasses("awaiting").bubble);
  });
});
