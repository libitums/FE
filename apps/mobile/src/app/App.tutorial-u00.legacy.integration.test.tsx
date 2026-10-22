import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { screen } from "@lynx-js/react/testing-library";

import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { catalogUnitDomId } from "../screens/journey-map/catalog-map";
import { stubHost } from "../screens/journey-map/JourneyMapScreen.test-support";
import type { HostStub } from "../screens/journey-map/JourneyMapScreen.test-support";
import { emptyLegacyTutorialRecord } from "./legacy-tutorial-progress";
import { cover, resetApp, status, trophyCount } from "./test-helpers/episode-format-harness";
import {
  frameRects,
  insets,
  offsetFor,
  scrollSelector,
  setGlobalProps,
} from "./test-helpers/journey-map-host";
import { legacyPassedRecord } from "./test-helpers/progress-seed";
import {
  bootTutorialApp,
  cachedProgressStorageKey,
  flushAsync,
  passBanner,
  readAllCuts,
  settleFake,
  tapCover,
  tapIntroNext,
  useBannerClock,
} from "./test-helpers/tutorial-boot";

// 부드러운 이동은 main thread가 프레임마다 옮기지만(`useMapGlide`), 이 파일은 「어디로 갔나」만 봅니다 —
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

// `integration` 계층: 옛 앱 사용자 — 서버 스냅숏의 옛 튜토리얼 기록이 새 앱의 문 · 안내 · 스크롤 · 트로피를 정하고,
// 저장 본문에 그대로 실리며, 기기 캐시와 섞여도 줄지 않는지 봅니다. 대역은 경계뿐입니다(공용 헬퍼 참고).

const U00 = TUTORIAL_EPISODE_ID;
const U01 = "u01-water";
const unitTop = 700;
let host: HostStub;

beforeEach(() => {
  host = stubHost();
  Object.assign(host.rects, frameRects);
  setGlobalProps({ safeAreaInsets: insets });
});

afterEach(() => {
  setGlobalProps(undefined);
  resetApp();
  vi.restoreAllMocks();
});

const legacyKeys = [
  "completedStepCount",
  "completedEpisodeIntroIds",
  "completedMessengerUnitIds",
  "completedPhoneCallUnitIds",
  "visualNovel",
  "completedEpisodeFinalIds",
] as const;
const legacyFields = (snapshot: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(legacyKeys.map((key) => [key, snapshot[key]]));

/** 옛 앱이 서버에 쓰던 스냅숏입니다. */
const wire = (
  legacy: object,
  catalogProgress: Record<string, readonly string[]> = {},
): Record<string, unknown> => ({
  version: 1,
  ...legacy,
  ...(Object.keys(catalogProgress).length === 0 ? {} : { catalogProgress }),
});

const scrollsOnMap = () => host.scrollTos().filter((call) => call.selector === scrollSelector);
const measuredUnits = () => host.measured().filter((s) => s.startsWith("#journey-map-unit-"));
const smoothTo = (top: number) => ({
  selector: scrollSelector,
  method: "scrollTo",
  params: { offset: offsetFor(top), smooth: true },
});
const savedBodies = (rpcs: readonly { name: string; body: Record<string, unknown> }[]) =>
  rpcs
    .filter((rpc) => rpc.name === "save_learning_progress")
    .map((rpc) => rpc.body["p_progress"] as Record<string, unknown>);

describe("TU3 옛 사용자", () => {
  test("TU3. 옛 튜토리얼을 끝내고 u01 표지를 연 사용자: u01은 열려 있고 u00은 처음이며 안내가 없고 맵이 u01 S1로 선다", async () => {
    const s1 = catalogUnitDomId(U01, "S1");
    host.rects[`#${s1}`] = { top: unitTop, height: 100 };
    const { rpcs } = await bootTutorialApp({
      load: wire(legacyPassedRecord, { [U01]: ["intro"] }),
    });
    await flushAsync();

    expect(cover(U01)).toHaveAttribute("data-status", "clear");
    expect(status(U01, "S1")).toBe("available");
    expect(cover(U00)).toHaveAttribute("data-status", "available");
    expect(status(U00, "S1")).toBe("default");
    expect(screen.queryAllByTestId("first-unit-guide-map").length).toBe(0);
    expect(measuredUnits().at(-1)).toBe(`#${s1}`);
    expect(measuredUnits()).not.toContain(`#${catalogUnitDomId(U00, "S1")}`);
    expect(scrollsOnMap().at(-1)).toEqual(smoothTo(unitTop));

    // 다음 저장 본문의 옛 필드 여섯은 받은 값 그대로다 — u00 표지를 끝내 저장을 일으킨다.
    useBannerClock();
    tapCover(U00);
    tapIntroNext();
    readAllCuts(6);
    await settleFake();
    passBanner();
    await flushAsync();
    await vi.waitFor(() => {
      const last = savedBodies(rpcs).at(-1);
      expect(last).toBeDefined();
      expect((last?.["catalogProgress"] as Record<string, string[]>)[U00]).toContain("intro");
    });
    expect(legacyFields(savedBodies(rpcs).at(-1) as Record<string, unknown>)).toEqual(
      legacyFields(wire(legacyPassedRecord)),
    );
  });

  test("TU3b. 옛 통과만 있는 사용자(카탈로그 0): u01 표지가 열리고 맵이 u01 표지로 서며 트로피 칩이 1이다", async () => {
    const intro = catalogUnitDomId(U01, "intro");
    host.rects[`#${intro}`] = { top: unitTop, height: 100 };
    await bootTutorialApp({ load: wire(legacyPassedRecord) });
    await flushAsync();

    expect(cover(U01)).toHaveAttribute("data-status", "available");
    expect(status(U00, "S1")).toBe("default");
    expect(measuredUnits().at(-1)).toBe(`#${intro}`);
    expect(scrollsOnMap().at(-1)).toEqual(smoothTo(unitTop));
    expect(trophyCount()).toBe(1);
    expect(screen.queryAllByTestId("first-unit-guide-map").length).toBe(0);
  });
});

describe("TU4 섞임", () => {
  const newAppCache = JSON.stringify(wire(emptyLegacyTutorialRecord, { [U00]: ["intro"] }));

  test("TU4. 기기 캐시(새 앱의 u00 진행)와 서버(옛 앱이 늘린 옛 기록)를 합쳐 저장하면 본문에 둘 다 있다", async () => {
    const { rpcs } = await bootTutorialApp({
      preStore: { [cachedProgressStorageKey]: newAppCache },
      load: wire(legacyPassedRecord),
    });
    await flushAsync();

    await vi.waitFor(() => expect(savedBodies(rpcs).length).toBeGreaterThan(0));
    const saved = savedBodies(rpcs).at(-1) as Record<string, unknown>;
    expect((saved["catalogProgress"] as Record<string, string[]>)[U00]).toContain("intro");
    expect(legacyFields(saved)).toEqual(legacyFields(wire(legacyPassedRecord)));
    expect(cover(U01)).toHaveAttribute("data-status", "available");
  });

  test("TU4. 서버가 옛 필드 없는 망가진 스냅숏을 주면 저장하지 않고 기기 진행이 그대로다", async () => {
    const { rpcs } = await bootTutorialApp({
      preStore: { [cachedProgressStorageKey]: newAppCache },
      load: { version: 1, catalogProgress: { [U01]: ["intro"] } },
    });
    await flushAsync();
    await flushAsync();

    expect(savedBodies(rpcs)).toEqual([]);
    expect(cover(U00)).toHaveAttribute("data-status", "clear");
    expect(cover(U01)).toHaveAttribute("data-status", "default");
  });
});
