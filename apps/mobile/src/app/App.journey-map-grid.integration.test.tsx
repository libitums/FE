import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { journeySeedBefore } from "./test-helpers/journey-seed";
import {
  frameRects,
  insets,
  offsetFor,
  scrollSelector,
  setGlobalProps,
} from "./test-helpers/journey-map-host";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { stubHost, type HostStub } from "../screens/journey-map/JourneyMapScreen.test-support";

// 부드러운 이동은 앱이 프레임마다 옮기지만(`animateMapScroll`), 이 파일은 「어디로 부드럽게 갔나」만 봅니다 —
// 대역이 끝 위치로 부드러운 `scrollTo` 한 번을 남깁니다. 프레임의 모양은 unit(`journey-map-scroll-animation`)이 집니다.
vi.mock("../screens/journey-map/journey-map-scroll-animation", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../screens/journey-map/journey-map-scroll-animation")>();
  const scroll = await import("../screens/journey-map/journey-map-scroll");
  return {
    ...actual,
    animateMapScroll: (_from: number, to: number) => {
      scroll.scrollMapTo(to, "smooth");
      return () => {};
    },
  };
});

// `integration` 계층: 호스트가 보낸 글자 배율 · 화면 폭(globalProps)이 App을 거쳐 맵의 줄 구조에 닿는지.
// 열 수 판정 · 줄 나누기 자체는 unit · ui가 진다 — 여기서는 공급 경로만 봅니다.

let host: HostStub;

beforeEach(() => {
  host = stubHost();
  Object.assign(host.rects, frameRects, {
    "#journey-map-unit-ordering": { top: 700, height: 100 },
  });
});

afterEach(() => {
  cleanup();
  setGlobalProps(undefined);
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const kindsIn = (selector: string): string[] =>
  [...document.querySelectorAll(selector)].flatMap((section) =>
    [...section.querySelectorAll("[data-row-kind]")].map(
      (row) => row.getAttribute("data-row-kind") ?? "",
    ),
  );

const tutorialKinds = () => kindsIn("#journey-map-screen-episode-tutorial");
const catalogKinds = () => kindsIn('[data-testid^="catalog-section-"]');

async function boot(globalProps: Record<string, unknown>): Promise<void> {
  setGlobalProps({ safeAreaInsets: insets, ...globalProps });
  await renderSignedInApp(
    <App
      journeySeed={journeySeedBefore("ordering")}
      completedEpisodeIntroIds={["tutorial-intro"]}
    />,
  );
}

const allSolo = (kinds: readonly string[]) => kinds.every((kind) => kind === "solo");

test("I9. (AC9) 글자 배율 2.5가 오면 튜토리얼 · 카탈로그 줄이 전부 한 칸이고 자동 스크롤은 그대로 한 번이다", async () => {
  await boot({ fontScale: 2.5, viewportWidth: 402 });

  expect(tutorialKinds().length).toBeGreaterThan(0);
  expect(catalogKinds().length).toBeGreaterThan(0);
  expect(allSolo([...tutorialKinds(), ...catalogKinds()])).toBe(true);
  expect(host.scrollTos().filter((call) => call.selector === scrollSelector)).toEqual([
    {
      selector: scrollSelector,
      method: "scrollTo",
      params: { offset: offsetFor(700), smooth: true },
    },
  ]);
});

test("I9 대조. 배율 1 · 폭 402면 같은 앱이 두 열 줄을 낸다", async () => {
  await boot({ fontScale: 1, viewportWidth: 402 });

  expect(tutorialKinds()).toContain("pair");
  expect(catalogKinds()).toContain("pair");
});

test("I9 폭. 화면 폭 300(배율 1)이어도 한 열이다", async () => {
  await boot({ fontScale: 1, viewportWidth: 300 });

  expect(tutorialKinds().length).toBeGreaterThan(0);
  expect(allSolo(tutorialKinds())).toBe(true);
  expect(allSolo(catalogKinds())).toBe(true);
});

test("I9 기본. globalProps에 두 값이 없으면 두 열이다", async () => {
  await boot({});

  expect(tutorialKinds()).toContain("pair");
});
