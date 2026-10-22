import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { AppProgressSeed } from "./app-props";
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
import { exitResult, flush, lessonPlan, tapNode } from "./test-helpers/episode-format-harness";
import { solveLesson } from "./test-helpers/episode-format-solvers";
import { legacyPassedRecord, tutorialDoneProgress } from "./test-helpers/progress-seed";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { catalogUnitDomId } from "../screens/journey-map/catalog-map";
import { stubHost, type HostStub } from "../screens/journey-map/JourneyMapScreen.test-support";

// 부드러운 이동은 main thread가 프레임마다 옮기지만(`useMapGlide`), 이 파일은 「어디로 부드럽게 갔나」만 봅니다 —
// 대역이 끝 위치로 부드러운 `scrollTo` 한 번을 남깁니다.
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

// `integration` 계층: 앱 세션에서만 생기는 자동 스크롤의 연결 — 진행 상태 → 다음 유닛 → 호스트 `scrollTo`,
// 화면 전환으로 다시 마운트될 때의 재실행, 늦게 닿는 서버 진행, 호스트가 보낸 동작 줄이기. 대역은 경계 둘뿐입니다 —
// 호스트 질의(`createSelectorQuery`)와 네트워크(`fetch` · 저장소). 목적지 식 · 전이 규칙은 unit · ui가 지고,
// 여기서는 그 결과가 앱 트리를 거쳐 호스트에 닿는지만 봅니다.

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

const unitRect = (domId: string, top = unitTop): void => {
  host.rects[`#${domId}`] = { top, height: 100 };
};

const scrollsOnMap = () => host.scrollTos().filter((call) => call.selector === scrollSelector);

const measuredUnits = () => host.measured().filter((s) => s.startsWith("#journey-map-unit-"));

const smoothTo = (top: number, smooth = true) => ({
  selector: scrollSelector,
  method: "scrollTo",
  params: { offset: offsetFor(top), smooth },
});

/** 옛 튜토리얼을 통과한 학습자의 진행입니다 — 맵의 다음 유닛이 u00이 아니라 u01 쪽에서 정해집니다. */
const legacyWith = (catalogProgress: Record<string, readonly string[]>): AppProgressSeed => ({
  legacyTutorial: legacyPassedRecord,
  catalogProgress,
});

/** u00을 끝낸 새 앱 학습자의 진행입니다. */
const tutorialDoneWith = (catalogProgress: Record<string, readonly string[]>): AppProgressSeed => ({
  catalogProgress: { ...tutorialDoneProgress(), ...catalogProgress },
});

// 서버 진행 조회는 사용자를 식별할 수 있는(JWT 모양) 토큰이 있을 때만 일어난다.
const learner = {
  refreshedAccessToken: `e30.${btoa(JSON.stringify({ sub: "returning-learner" }))}.sig`,
};

const bodyOf = (seed: AppProgressSeed): string =>
  JSON.stringify(
    learningProgressSnapshotFrom({
      legacyTutorial: seed.legacyTutorial ?? legacyPassedRecord,
      catalogProgress: seed.catalogProgress ?? {},
    }),
  );

function deferredReply() {
  let resolve!: (reply: { status: number; body: string }) => void;
  const promise = new Promise<{ status: number; body: string }>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function bootWithSeed(seed: AppProgressSeed) {
  await renderSignedInApp(<App progressSeed={seed} />);
}

test("I1. (AC4) 진행 없는 앱의 맵은 스크롤하지 않고 대상도 재지 않는다", async () => {
  await renderSignedInApp(<App />);

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(host.actions()).toEqual([]);
  expect(measuredUnits()).toEqual([]);
});

test("I2. 진행 씨앗 → 다음 유닛 → 맵 스크롤 상자의 scrollTo 한 번", async () => {
  const s2 = catalogUnitDomId(u01, "S2");
  unitRect(s2);
  await bootWithSeed(tutorialDoneWith({ [u01]: ["intro", "S1"] }));

  expect(measuredUnits()).toEqual([`#${s2}`]);
  expect(scrollsOnMap()).toEqual([smoothTo(unitTop)]);
});

test("I3. (AC5) 다음 유닛을 끝내고 맵으로 돌아오면 새 대상으로 한 번 더 움직인다", async () => {
  const s1 = catalogUnitDomId(u01, "S1");
  const s2 = catalogUnitDomId(u01, "S2");
  unitRect(s1);
  unitRect(s2, 900);
  await bootWithSeed(tutorialDoneWith({ [u01]: ["intro"] }));
  expect(measuredUnits()).toEqual([`#${s1}`]);
  expect(scrollsOnMap()).toHaveLength(1);

  tapNode(u01, "S1");
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  solveLesson(lessonPlan(u01, "S1"), true);
  exitResult();
  await flush();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  // 말풍선을 여는 사이 도착 보정이 첫 대상을 한 번 더 재므로, 잰 유닛은 중복을 걷고 이동은 처음과 마지막을 견줍니다.
  expect([...new Set(measuredUnits())]).toEqual([`#${s1}`, `#${s2}`]);
  expect(scrollsOnMap()[0]).toEqual(smoothTo(unitTop));
  expect(scrollsOnMap().at(-1)).toEqual(smoothTo(900));
});

test("I4. (AC6) 호스트의 reducedMotion: true는 App의 MotionProvider를 거쳐 smooth: false로 닿는다", async () => {
  setGlobalProps({ safeAreaInsets: insets, reducedMotion: true });
  unitRect(catalogUnitDomId(u01, "S2"));
  await bootWithSeed(tutorialDoneWith({ [u01]: ["intro", "S1"] }));

  expect(scrollsOnMap()).toEqual([smoothTo(unitTop, false)]);
});

test("I5. 탭을 롤플레이로 갔다가 여정으로 돌아오면 다시 마운트되어 한 번 더 움직인다", async () => {
  unitRect(catalogUnitDomId(u01, "S2"));
  await bootWithSeed(tutorialDoneWith({ [u01]: ["intro", "S1"] }));
  expect(scrollsOnMap()).toHaveLength(1);

  tapTab("roleplay");
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  tapTab("journey");

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(scrollsOnMap()).toEqual([smoothTo(unitTop), smoothTo(unitTop)]);
});

test("I6. 씨앗 0으로 선 맵에 서버 진행이 늦게 닿으면 닿은 뒤 한 번 움직인다", async () => {
  const reply = deferredReply();
  const s2 = catalogUnitDomId(u01, "S2");
  unitRect(s2);
  await renderSignedInApp(<App />, {
    ...learner,
    keepFakeTimers: true,
    loadProgress: () => reply.promise,
  });
  expect(scrollsOnMap()).toHaveLength(0);

  await act(async () => {
    reply.resolve({ status: 200, body: bodyOf(legacyWith({ [u01]: ["intro", "S1"] })) });
    await vi.advanceTimersByTimeAsync(0);
  });

  expect(measuredUnits()).toContain(`#${s2}`);
  expect(scrollsOnMap()).toEqual([smoothTo(unitTop)]);
});

test("I7. (AC7) 진행이 닿기 전에 사용자가 맵을 스크롤하면 닿은 뒤에도 따라가지 않는다", async () => {
  const reply = deferredReply();
  unitRect(catalogUnitDomId(u01, "S2"));
  await renderSignedInApp(<App />, {
    ...learner,
    keepFakeTimers: true,
    loadProgress: () => reply.promise,
  });

  host.scroll(80);
  await act(async () => {
    reply.resolve({ status: 200, body: bodyOf(legacyWith({ [u01]: ["intro", "S1"] })) });
    await vi.advanceTimersByTimeAsync(0);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(50);
  });

  // 진행이 실제로 닿았음을 먼저 확인합니다 — 안 닿았다면 0회는 공허합니다.
  expect(screen.getByTestId(`ui-lynx-learning-unit-catalog-unit-${u01}-S2`)).toHaveAttribute(
    "data-status",
    "available",
  );
  expect(scrollsOnMap()).toHaveLength(0);
});

test("I8. 옛 튜토리얼 통과 + 카탈로그 진행이면 대상이 u00이 아니라 카탈로그의 다음 레슨이다", async () => {
  const s2 = catalogUnitDomId(u01, "S2");
  unitRect(s2, 1234);
  const seed = legacyWith({ [u01]: ["intro", "S1"] });
  await renderSignedInApp(<App progressSeed={seed} />, {
    ...learner,
    loadProgress: async () => ({ status: 200, body: bodyOf(seed) }),
  });
  await flushAsync();

  // u01의 레슨 순서는 S1 → S2입니다 — 표지와 S1이 끝났으니 대상은 S2이고, 열려 있는 u00의 유닛이 아니다.
  expect(measuredUnits().at(-1)).toBe(`#${s2}`);
  expect(scrollsOnMap().at(-1)).toEqual(smoothTo(1234));
});

// 도착 뒤 보정 · 도착 뒤 탭은 `App.journey-map-arrival.integration.test.tsx`가 봅니다.
