import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { learningProgressSnapshotFrom } from "./learning-progress";
import {
  flushAsync,
  frameRects,
  insets,
  offsetFor,
  scrollSelector,
  setGlobalProps,
  tapTab,
} from "./test-helpers/journey-map-host";
import { legacyPassedRecord } from "./test-helpers/progress-seed";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { catalogUnitDomId } from "../screens/journey-map/catalog-map";
import { stubHost, type HostStub } from "../screens/journey-map/JourneyMapScreen.test-support";

// 부드러운 이동(본 이동 · 보정)은 main thread가 프레임마다 옮기지만(`useMapGlide`), 이 파일은 「어디로 부드럽게 갔나」만
// 봅니다 — 대역이 끝 위치로 부드러운 `scrollTo` 한 번을 남깁니다.
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

// `integration` 계층: 말풍선과 띠가 실제로 서는 카탈로그 레슨이 대상일 때의 도착 뒤 동작 — 보정(대상이 도착하는
// 사이 밀렸을 때)과 도착 뒤 탭(맵이 움직이지 않음). 대역은 호스트 질의와 네트워크 둘뿐입니다.

const unitTop = 700;
const u01 = "u01-water";

let host: HostStub;

beforeEach(() => {
  host = stubHost();
  Object.assign(host.rects, frameRects);
  setGlobalProps({ safeAreaInsets: insets });
});

afterEach(() => {
  cleanup();
  setGlobalProps(undefined);
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const scrollsOnMap = () => host.scrollTos().filter((call) => call.selector === scrollSelector);

const smoothTo = (top: number, smooth = true) => ({
  selector: scrollSelector,
  method: "scrollTo",
  params: { offset: offsetFor(top), smooth },
});

const learner = {
  refreshedAccessToken: `e30.${btoa(JSON.stringify({ sub: "returning-learner" }))}.sig`,
};

// 도착 뒤 한 번 바로잡기(정정 2): 도착하는 사이 대상이 목적지 자리(410)보다 30 위(380)로 밀려 있다. 씨앗은 옛
// 튜토리얼을 통과하고 u01의 표지 · S1을 끝낸 진행이라 대상이 u01의 S2다. 보정은 본 이동이 끝난 뒤 짧게 이어
// 옮긴다(사용자 결정 2026-10-22, ADR-0022).
const correctedTo = (offset: number) => ({
  selector: scrollSelector,
  method: "scrollTo",
  params: { offset, smooth: true },
});

async function bootCatalogLesson(domId: string): Promise<void> {
  host.rects[`#${domId}`] = { top: unitTop, height: 100 };
  const seed = { legacyTutorial: legacyPassedRecord, catalogProgress: { [u01]: ["intro", "S1"] } };
  const body = JSON.stringify(learningProgressSnapshotFrom(seed));
  await renderSignedInApp(<App progressSeed={seed} />, {
    ...learner,
    loadProgress: async () => ({ status: 200, body }),
  });
  await flushAsync();
}

/** 도착 뒤의 표 — 대상이 목적지 자리(410)보다 30 위에 서 있다. */
function arrive(domId: string): void {
  host.rects[`#${domId}`] = { top: unitTop - offsetFor(unitTop) - 30, height: 100 };
  host.scroll(offsetFor(unitTop));
}

test("I11. 앱 세션에서 도착하는 사이 대상이 30 위로 밀리면 되돌린 목적지로 한 번 더 짧게 이어 간다", async () => {
  const s2 = catalogUnitDomId(u01, "S2");
  await bootCatalogLesson(s2);
  expect(scrollsOnMap().at(-1)).toEqual(smoothTo(unitTop));
  const moves = scrollsOnMap().length;

  arrive(s2);

  expect(scrollsOnMap()).toHaveLength(moves + 1);
  expect(scrollsOnMap().at(-2)).toEqual(smoothTo(unitTop));
  expect(scrollsOnMap().at(-1)).toEqual(correctedTo(offsetFor(unitTop) - 30));
});

test("I12. 도착 뒤 탭을 바꿨다 돌아오면 마지막 스크롤 자리에서 곧바로 열리고 움직이지 않는다", async () => {
  const s2 = catalogUnitDomId(u01, "S2");
  await bootCatalogLesson(s2);
  arrive(s2);
  const first = scrollsOnMap().length;
  expect(scrollsOnMap().at(-1)).toEqual(correctedTo(offsetFor(unitTop) - 30));
  host.scroll(offsetFor(unitTop) - 30);

  tapTab("roleplay");
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  host.rects[`#${s2}`] = { top: unitTop, height: 100 };
  tapTab("journey");
  await flushAsync();

  expect(screen.getByTestId("journey-map-screen-scroll")).toHaveAttribute(
    "initial-scroll-offset",
    String(offsetFor(unitTop) - 30),
  );
  expect(scrollsOnMap()).toHaveLength(first);
});

test("I13. (AC2) 카탈로그 레슨 도착 뒤 탭해도 맵이 움직이지 않는다", async () => {
  const s2 = catalogUnitDomId(u01, "S2");
  await bootCatalogLesson(s2);
  expect(scrollsOnMap().at(-1)).toEqual(smoothTo(unitTop));

  // 대상이 목적지 자리(410) 그대로 도착 — 보정이 없어야 한다.
  host.rects[`#${s2}`] = { top: unitTop - offsetFor(unitTop), height: 100 };
  const beforeArrival = scrollsOnMap().length;
  host.scroll(offsetFor(unitTop));
  expect(scrollsOnMap()).toHaveLength(beforeArrival);

  fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-catalog-unit-${u01}-S2`), {});
  await flushAsync();

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-episode-header")).toBeInTheDocument();
  const last = scrollsOnMap().at(-1);
  expect(
    Math.abs((last?.params as { offset: number }).offset - offsetFor(unitTop)),
  ).toBeLessThanOrEqual(1);
});
