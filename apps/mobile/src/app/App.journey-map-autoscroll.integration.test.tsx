import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { productJourneySeed, type AppJourneySeed } from "./journey-progress";
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
import { answerMessengerReplies } from "../screens/messenger/messenger.test-support";
import { catalogUnitDomId } from "../screens/journey-map/catalog-map";
import { mapUnitDomId } from "../screens/journey-map/journey-map-scroll";
import { stubHost, type HostStub } from "../screens/journey-map/JourneyMapScreen.test-support";

// `integration` 계층: 앱 세션에서만 생기는 자동 스크롤의 연결 — 진행 상태 → 다음 유닛 → 호스트 `scrollTo`,
// 화면 전환으로 다시 마운트될 때의 재실행, 늦게 닿는 서버 진행, 호스트가 보낸 동작 줄이기. 대역은 경계 둘뿐입니다 —
// 호스트 질의(`createSelectorQuery`)와 네트워크(`fetch` · 저장소). 목적지 식 · 전이 규칙은 unit · ui가 지고,
// 여기서는 그 결과가 앱 트리를 거쳐 호스트에 닿는지만 봅니다.

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

const emptySnapshot = learningProgressSnapshotFrom({
  ...productJourneySeed,
  completedEpisodeIntroIds: [],
  catalogProgress: {},
});

// 서버 진행 조회는 사용자를 식별할 수 있는(JWT 모양) 토큰이 있을 때만 일어난다.
const learner = {
  refreshedAccessToken: `e30.${btoa(JSON.stringify({ sub: "returning-learner" }))}.sig`,
};

const twoStepsSnapshotBody = JSON.stringify({
  ...emptySnapshot,
  completedStepCount: 2,
  completedEpisodeIntroIds: ["tutorial-intro"],
});

function deferredReply() {
  let resolve!: (reply: { status: number; body: string }) => void;
  const promise = new Promise<{ status: number; body: string }>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function bootWithSeed(seed: AppJourneySeed) {
  await renderSignedInApp(<App journeySeed={seed} completedEpisodeIntroIds={completedIntros} />);
}

test("I1. (AC4) 진행 없는 앱의 맵은 스크롤하지 않고 대상도 재지 않는다", async () => {
  await renderSignedInApp(<App journeySeed={{ ...productJourneySeed, completedStepCount: 0 }} />);

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(host.actions()).toEqual([]);
  expect(measuredUnits()).toEqual([]);
});

test("I2. 진행 씨앗 → 다음 유닛 → 맵 스크롤 상자의 scrollTo 한 번", async () => {
  unitRect(mapUnitDomId("ordering"));
  await bootWithSeed(journeySeedBefore("ordering"));

  expect(measuredUnits()).toEqual(["#journey-map-unit-ordering"]);
  expect(scrollsOnMap()).toEqual([smoothTo(unitTop)]);
});

test("I3. (AC5) 다음 유닛을 끝내고 맵으로 돌아오면 새 대상으로 한 번 더 움직인다", async () => {
  unitRect(mapUnitDomId("appointment-confirmation"));
  unitRect(mapUnitDomId("appointment-confirmation-phone-call"), 900);
  await bootWithSeed(journeySeedBefore("appointment-confirmation"));
  expect(measuredUnits()).toEqual(["#journey-map-unit-appointment-confirmation"]);
  expect(scrollsOnMap()).toHaveLength(1);

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  vi.useFakeTimers();
  answerMessengerReplies();
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
  vi.useRealTimers();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(measuredUnits()).toEqual([
    "#journey-map-unit-appointment-confirmation",
    "#journey-map-unit-appointment-confirmation-phone-call",
  ]);
  expect(scrollsOnMap()).toEqual([smoothTo(unitTop), smoothTo(900)]);
});

test("I4. (AC6) 호스트의 reducedMotion: true는 App의 MotionProvider를 거쳐 smooth: false로 닿는다", async () => {
  setGlobalProps({ safeAreaInsets: insets, reducedMotion: true });
  unitRect(mapUnitDomId("ordering"));
  await bootWithSeed(journeySeedBefore("ordering"));

  expect(scrollsOnMap()).toEqual([smoothTo(unitTop, false)]);
});

test("I5. 탭을 롤플레이로 갔다가 여정으로 돌아오면 다시 마운트되어 한 번 더 움직인다", async () => {
  unitRect(mapUnitDomId("ordering"));
  await bootWithSeed(journeySeedBefore("ordering"));
  expect(scrollsOnMap()).toHaveLength(1);

  tapTab("roleplay");
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  tapTab("journey");

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(scrollsOnMap()).toEqual([smoothTo(unitTop), smoothTo(unitTop)]);
});

test("I6. 씨앗 0으로 선 맵에 서버 진행이 늦게 닿으면 닿은 뒤 한 번 움직인다", async () => {
  const reply = deferredReply();
  unitRect(mapUnitDomId("ordering"));
  await renderSignedInApp(<App />, {
    ...learner,
    keepFakeTimers: true,
    loadProgress: () => reply.promise,
  });
  expect(scrollsOnMap()).toHaveLength(0);

  await act(async () => {
    reply.resolve({ status: 200, body: twoStepsSnapshotBody });
    await vi.advanceTimersByTimeAsync(0);
  });

  expect(measuredUnits()).toContain("#journey-map-unit-ordering");
  expect(scrollsOnMap()).toEqual([smoothTo(unitTop)]);
});

test("I7. (AC7) 진행이 닿기 전에 사용자가 맵을 스크롤하면 닿은 뒤에도 따라가지 않는다", async () => {
  const reply = deferredReply();
  unitRect(mapUnitDomId("ordering"));
  await renderSignedInApp(<App />, {
    ...learner,
    keepFakeTimers: true,
    loadProgress: () => reply.promise,
  });

  host.scroll(80);
  await act(async () => {
    reply.resolve({ status: 200, body: twoStepsSnapshotBody });
    await vi.advanceTimersByTimeAsync(0);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(50);
  });

  // 진행이 실제로 닿았음을 먼저 확인합니다 — 안 닿았다면 0회는 공허합니다.
  expect(screen.getByTestId("ui-lynx-learning-unit-ordering")).toHaveAttribute(
    "data-status",
    "active",
  );
  expect(scrollsOnMap()).toHaveLength(0);
});

test("I8. 튜토리얼 통과 + 카탈로그 진행이면 대상이 카탈로그의 다음 레슨으로 넘어간다", async () => {
  const s3 = catalogUnitDomId("u01-water", "S3");
  unitRect(s3, 1234);
  const tutorialDone: AppJourneySeed = {
    completedStepCount: journeySeedBefore("tutorial-final-test").completedStepCount,
    completedMessengerUnitIds: ["appointment-confirmation"],
    completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
    visualNovelProgress: { status: "completed", beatIndex: 2 },
    completedEpisodeFinalIds: ["tutorial-final-test"],
  };
  const body = JSON.stringify(
    learningProgressSnapshotFrom({
      ...tutorialDone,
      completedEpisodeIntroIds: ["tutorial-intro"],
      catalogProgress: { "u01-water": ["intro", "S1"] },
    }),
  );
  await renderSignedInApp(
    <App journeySeed={tutorialDone} completedEpisodeIntroIds={completedIntros} />,
    { ...learner, loadProgress: async () => ({ status: 200, body }) },
  );
  await flushAsync();

  // u01의 레슨 순서는 S1 → S3입니다 — 표지와 S1이 끝났으니 대상은 S3이고, 튜토리얼 안의 유닛이 아니다.
  expect(measuredUnits().at(-1)).toBe(`#${s3}`);
  expect(scrollsOnMap().at(-1)).toEqual(smoothTo(1234));
});
