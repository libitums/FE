import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { learningProgressSnapshotFrom } from "./learning-progress";
import {
  flushAsync,
  frameRects,
  insets,
  offsetFor,
  scrollSelector,
  setGlobalProps,
} from "./test-helpers/journey-map-host";
import { legacyPassedRecord } from "./test-helpers/progress-seed";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { catalogUnitDomId } from "../screens/journey-map/catalog-map";
import { sheetEntranceClasses } from "../screens/journey-map/journey-map-sheet-motion";
import { stubHost, type HostStub } from "../screens/journey-map/JourneyMapScreen.test-support";

// 부드러운 이동은 대역이 끝 위치로 부드러운 `scrollTo` 한 번을 남깁니다(`useMapGlide`의 main thread 프레임은 기기 몫).
vi.mock("../screens/journey-map/use-map-glide", async () => {
  const scroll = await import("../screens/journey-map/journey-map-scroll");
  const react = await import("@lynx-js/react");
  return {
    useMapGlide: () => ({
      scrollRef: react.useMainThreadRef(null),
      glide: (_from: number, to: number) => scroll.scrollMapTo(to, "smooth"),
      stop: () => {},
    }),
  };
});

// `integration` 계층: 호스트 globalProps의 reducedMotion이 App의 MotionProvider를 거쳐 말풍선 · 띠 · 노드 세 소비자에
// 한 값으로 닿는지 봅니다. 대역은 호스트 질의와 네트워크 둘뿐이고, 클래스 묶음의 값 자체는 unit이 집니다.

const unitTop = 700;
const s2 = catalogUnitDomId("u01-water", "S2");
const s2TestId = "ui-lynx-learning-unit-catalog-unit-u01-water-S2";
const nodePopEnter = "journey-step-node-pop journey-step-node-pop-enter";

let host: HostStub;

beforeEach(() => {
  host = stubHost();
  Object.assign(host.rects, frameRects);
});

afterEach(() => {
  cleanup();
  setGlobalProps(undefined);
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const learner = {
  refreshedAccessToken: `e30.${btoa(JSON.stringify({ sub: "returning-learner" }))}.sig`,
};

// 옛 튜토리얼을 통과하고 u01의 표지 · S1을 끝낸 진행입니다 — 누를 유닛은 u01의 S2입니다.
const seed = {
  legacyTutorial: legacyPassedRecord,
  catalogProgress: { "u01-water": ["intro", "S1"] },
};

async function bootCatalogLesson(reducedMotion: boolean): Promise<void> {
  setGlobalProps({ safeAreaInsets: insets, reducedMotion });
  host.rects[`#${s2}`] = { top: unitTop, height: 100 };
  const body = JSON.stringify(learningProgressSnapshotFrom(seed));
  await renderSignedInApp(<App progressSeed={seed} />, {
    ...learner,
    loadProgress: async () => ({ status: 200, body }),
  });
  await flushAsync();
}

const scrollsOnMap = () => host.scrollTos().filter((call) => call.selector === scrollSelector);

function tapS2(): void {
  act(() => {
    fireEvent.tap(screen.getByTestId(s2TestId), { detail: { y: 300 } });
  });
}

const classOf = (element: Element | null): string | null => element?.getAttribute("class") ?? null;
const sheetPop = (): HTMLElement => screen.getByTestId("step-sheet-pop");
const bandWrapper = (): Element | null =>
  screen.getByTestId("ui-lynx-episode-header").closest(".journey-map-screen-episode-header");
const nodePop = (): Element | null =>
  screen.getByTestId(s2TestId).closest(".journey-step-node-pop");
const countOf = (selector: string): number => document.querySelectorAll(selector).length;

test("IM-S1. standard: 탭 직후 셋 다 대기, 목적지에 닿으면 셋 다 등장 · 폭죽 한 번 · 0%는 그대로", async () => {
  await bootCatalogLesson(false);
  vi.useFakeTimers();
  const waiting = sheetEntranceClasses("awaiting");
  const entering = sheetEntranceClasses("expressive");

  tapS2();

  expect(classOf(sheetPop())).toBe(waiting.bubble);
  expect(classOf(bandWrapper())).toBe(waiting.band);
  expect(classOf(nodePop())).toBe(nodePopEnter);
  expect(countOf(".journey-step-node-burst")).toBe(0);

  host.scroll(offsetFor(unitTop));

  expect(classOf(sheetPop())).toBe(entering.bubble);
  expect(classOf(bandWrapper())).toBe(entering.band);
  expect(classOf(nodePop())).toBe(nodePopEnter);
  expect(countOf(".journey-step-node-burst")).toBe(1);
  expect(countOf(".step-sheet-start-glow")).toBe(1);
  expect(countOf(".ui-lynx-episode-header-fill-sheen")).toBe(1);

  act(() => {
    vi.advanceTimersByTime(900);
  });

  expect(screen.getByTestId("step-sheet-progress-percent")).toHaveTextContent("0%");
  expect(classOf(screen.getByTestId("step-sheet-progress-percent-pop"))).toBe(
    "step-sheet-progress-percent-pop",
  );
});

test("IM-S2. (AC4) reducedMotion: true는 세 소비자에 줄이기 표식으로 닿고 움직임 층은 0이다", async () => {
  await bootCatalogLesson(true);
  vi.useFakeTimers();
  const reduced = sheetEntranceClasses("fade");

  tapS2();

  expect(classOf(sheetPop())).toBe(reduced.bubble);
  expect(sheetPop()).toHaveAttribute("data-motion", "reduced");
  expect(classOf(bandWrapper())).toBe(reduced.band);
  expect(bandWrapper()).toHaveAttribute("data-motion", "reduced");
  expect(countOf(".journey-step-node-burst")).toBe(0);
  expect(countOf(".step-sheet-start-glow")).toBe(0);
  expect(countOf(".ui-lynx-episode-header-fill-sheen")).toBe(0);
  expect(classOf(nodePop())).not.toContain("journey-step-node-pop-enter");
  expect(scrollsOnMap().length).toBeGreaterThan(0);
  expect(scrollsOnMap().every((call) => call.params?.smooth === false)).toBe(true);
});
