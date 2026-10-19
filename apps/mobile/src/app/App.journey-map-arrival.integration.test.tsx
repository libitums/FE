import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { type AppJourneySeed } from "./journey-progress";
import { learningProgressSnapshotFrom } from "./learning-progress";
import { journeySeedBefore } from "./test-helpers/journey-seed";
import {
  flushAsync,
  frameRects,
  insets,
  offsetFor,
  scrollSelector,
  setGlobalProps,
  tapTab,
} from "./test-helpers/journey-map-host";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { catalogUnitDomId } from "../screens/journey-map/catalog-map";
import { stubHost, type HostStub } from "../screens/journey-map/JourneyMapScreen.test-support";

// `integration` 계층: 말풍선과 띠가 실제로 서는 카탈로그 레슨이 대상일 때의 도착 뒤 동작 — 보정(대상이 도착하는
// 사이 밀렸을 때)과 도착 뒤 탭(맵이 움직이지 않음). 대역은 호스트 질의와 네트워크 둘뿐입니다.

const completedIntros = ["tutorial-intro"] as const;
const unitTop = 700;

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

// 도착 뒤 한 번 바로잡기(정정 2): 도착하는 사이 대상이 목적지 자리(410)보다 30 위(380)로 밀려 있다. 씨앗은 대상이
// 카탈로그 u01의 S2가 되는 것이다. 보정은 늘 즉시 옮긴다.
const correctedTo = (offset: number) => ({
  selector: scrollSelector,
  method: "scrollTo",
  params: { offset, smooth: false },
});

const tutorialDoneSeed: AppJourneySeed = {
  completedStepCount: journeySeedBefore("tutorial-final-test").completedStepCount,
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

async function bootCatalogLesson(domId: string): Promise<void> {
  host.rects[`#${domId}`] = { top: unitTop, height: 100 };
  const body = JSON.stringify(
    learningProgressSnapshotFrom({
      ...tutorialDoneSeed,
      completedEpisodeIntroIds: ["tutorial-intro"],
      catalogProgress: { "u01-water": ["intro", "S1"] },
    }),
  );
  await renderSignedInApp(
    <App journeySeed={tutorialDoneSeed} completedEpisodeIntroIds={completedIntros} />,
    { ...learner, loadProgress: async () => ({ status: 200, body }) },
  );
  await flushAsync();
}

/** 도착 뒤의 표 — 대상이 목적지 자리(410)보다 30 위에 서 있다. */
function arrive(domId: string): void {
  host.rects[`#${domId}`] = { top: unitTop - offsetFor(unitTop) - 30, height: 100 };
  host.scroll(offsetFor(unitTop));
}

function departAgain(domId: string): void {
  host.rects[`#${domId}`] = { top: unitTop, height: 100 };
}

test("I11. 앱 세션에서 도착하는 사이 대상이 30 위로 밀리면 되돌린 목적지로 한 번 더 간다", async () => {
  const s2 = catalogUnitDomId("u01-water", "S2");
  await bootCatalogLesson(s2);
  expect(scrollsOnMap().at(-1)).toEqual(smoothTo(unitTop));
  const moves = scrollsOnMap().length;

  arrive(s2);

  expect(scrollsOnMap()).toHaveLength(moves + 1);
  expect(scrollsOnMap().at(-2)).toEqual(smoothTo(unitTop));
  expect(scrollsOnMap().at(-1)).toEqual(correctedTo(offsetFor(unitTop) - 30));
});

test("I12. 도착 뒤 탭을 바꿨다 돌아오면 새 마운트에서 다시 이동 한 번 · 보정 한 번이다", async () => {
  const s2 = catalogUnitDomId("u01-water", "S2");
  await bootCatalogLesson(s2);
  arrive(s2);
  const first = scrollsOnMap().length;
  expect(scrollsOnMap().at(-1)).toEqual(correctedTo(offsetFor(unitTop) - 30));

  tapTab("roleplay");
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  departAgain(s2);
  tapTab("journey");
  await flushAsync();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(scrollsOnMap()).toHaveLength(first + 1);
  expect(scrollsOnMap().at(-1)).toEqual(smoothTo(unitTop));

  arrive(s2);

  expect(scrollsOnMap()).toHaveLength(first + 2);
  expect(scrollsOnMap().at(-1)).toEqual(correctedTo(offsetFor(unitTop) - 30));
});

test("I13. (AC2) 카탈로그 레슨 도착 뒤 탭해도 맵이 움직이지 않는다", async () => {
  const s2 = catalogUnitDomId("u01-water", "S2");
  await bootCatalogLesson(s2);
  expect(scrollsOnMap().at(-1)).toEqual(smoothTo(unitTop));

  // 대상이 목적지 자리(410) 그대로 도착 — 보정이 없어야 한다.
  host.rects[`#${s2}`] = { top: unitTop - offsetFor(unitTop), height: 100 };
  const beforeArrival = scrollsOnMap().length;
  host.scroll(offsetFor(unitTop));
  expect(scrollsOnMap()).toHaveLength(beforeArrival);

  fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-catalog-unit-u01-water-S2`), {});
  await flushAsync();

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-episode-header")).toBeInTheDocument();
  const last = scrollsOnMap().at(-1);
  expect(
    Math.abs((last?.params as { offset: number }).offset - offsetFor(unitTop)),
  ).toBeLessThanOrEqual(1);
});
