import type { SetStateAction } from "@lynx-js/react";
import { describe, expect, test, vi } from "vitest";

import type { CatalogProgress } from "../lib/catalog-progress";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import { noLearnerProfilePort } from "../lib/learner-profile";
import { fillPlaceholders } from "../lib/placeholder-fill";
import type {
  EpisodeIntroEvent,
  EpisodeIntroEventSink,
} from "../screens/episode-intro/episode-intro.contract";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import {
  catalogCoverModelOf,
  catalogCoverWiring,
  catalogEpilogueModelOf,
  noLearnerProfile,
} from "./catalog-cover-wiring";
import type { EpisodeContent } from "./episode-content";
import type { NavAction } from "./nav-state";

// `unit` 계층: 표지 결선의 가드 · 이벤트 순서 · 진행 기록 · 이동과 route 모델 만들기의 입출력만 봅니다.

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});

function contentOf(catalog: readonly CatalogEntry[]): EpisodeContent {
  return {
    catalog,
    imageUrlOf: (path) => `https://cdn/${path}`,
    audioUrlOf: () => null,
    fillText: fillPlaceholders,
    audioTimingOf: () => null,
  };
}

type SetProgress = (value: SetStateAction<CatalogProgress>) => void;

type Harness = {
  readonly wiring: ReturnType<typeof catalogCoverWiring>;
  readonly dispatch: ReturnType<typeof vi.fn<(action: NavAction) => void>>;
  readonly setCatalogProgress: ReturnType<typeof vi.fn<SetProgress>>;
  readonly sink: ReturnType<typeof vi.fn<(event: EpisodeIntroEvent) => void>>;
};

function harness(
  options: {
    catalog?: readonly CatalogEntry[];
    legacyPassed?: boolean;
    progress?: CatalogProgress;
    sinkNull?: boolean;
  } = {},
): Harness {
  const catalog = options.catalog ?? realCatalog;
  const dispatch = vi.fn<(action: NavAction) => void>();
  const setCatalogProgress = vi.fn<SetProgress>();
  const sink = vi.fn<(event: EpisodeIntroEvent) => void>();
  const episodeIntroEventSink: EpisodeIntroEventSink = options.sinkNull === true ? null : sink;
  // 문의 입력은 옛 튜토리얼 통과 기록(`legacyTutorialPassed`)입니다.
  const args = {
    episodeContent: contentOf(catalog),
    catalogSections: catalogMapSectionsOf(catalog),
    catalogProgress: options.progress ?? {},
    setCatalogProgress,
    legacyTutorialPassed: options.legacyPassed ?? false,
    dispatch,
    episodeIntroEventSink,
    learnerFill: noLearnerProfile,
    learnerRecord: null,
    learnerSync: "none",
    learnerPort: noLearnerProfilePort,
  };
  const wiring = catalogCoverWiring(args as unknown as Parameters<typeof catalogCoverWiring>[0]);
  return { wiring, dispatch, setCatalogProgress, sink };
}

function firstOrder(...mocks: { mock: { invocationCallOrder: number[] } }[]): number[] {
  return mocks.map((mock) => mock.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY);
}

describe("onStartCatalogCover", () => {
  test("CW1. 열린 표지는 viewed 이벤트 뒤에 컷 화면을 쌓는다", () => {
    const { wiring, dispatch, sink } = harness({ legacyPassed: true });

    wiring.onStartCatalogCover("u01-water");

    expect(sink.mock.calls.map(([event]) => event)).toEqual([
      { name: "episode_intro_viewed", episodeId: "u01-water" },
    ]);
    expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
      { type: "push", screen: { name: "catalog-cover", episodeId: "u01-water" } },
    ]);
    const [sinkAt, dispatchAt] = firstOrder(sink, dispatch);
    expect(sinkAt).toBeLessThan(dispatchAt ?? 0);
  });

  test("CW2. 튜토리얼 전이면 아무 일도 없다", () => {
    const { wiring, dispatch, sink, setCatalogProgress } = harness({ legacyPassed: false });

    wiring.onStartCatalogCover("u01-water");

    expect(sink).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(setCatalogProgress).not.toHaveBeenCalled();
  });

  test("CW2. 앞 에피소드를 못 끝낸 둘째 표지와 없는 id도 아무 일이 없다", () => {
    const { wiring, dispatch, sink } = harness({ legacyPassed: true });

    wiring.onStartCatalogCover("u02-checkin");
    wiring.onStartCatalogCover("nope");

    expect(sink).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("CW2. 앞 에피소드의 완료 키를 모두 끝내면 둘째 표지가 열린다", () => {
    const { wiring, dispatch } = harness({
      legacyPassed: true,
      progress: {
        "u01-water": ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"],
      },
    });

    wiring.onStartCatalogCover("u02-checkin");

    expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
      { type: "push", screen: { name: "catalog-cover", episodeId: "u02-checkin" } },
    ]);
  });

  test("CW6. 프롤로그 컷이 없는 에피소드는 화면을 쌓지 않고 바로 완료로 기록한다", () => {
    const base = realCatalog.find((entry) => entry.id === "u01-water") as ReadyEntry;
    const empty: ReadyEntry = { ...base, episode: { ...base.episode, prologue: [] } };
    const { wiring, dispatch, sink, setCatalogProgress } = harness({
      catalog: [empty],
      legacyPassed: true,
    });

    wiring.onStartCatalogCover("u01-water");

    expect(dispatch.mock.calls.filter(([action]) => action.type === "push")).toHaveLength(0);
    expect(sink.mock.calls.map(([event]) => event)).toEqual([
      { name: "episode_intro_viewed", episodeId: "u01-water" },
      { name: "episode_prologue_completed", episodeId: "u01-water", prologueKind: "cuts" },
    ]);
    expect(setCatalogProgress).toHaveBeenCalledTimes(1);
  });
});

describe("튜토리얼(u00) 표지 이벤트", () => {
  test("EV1. u00 표지 시작 · 컷 끝 · 건너뛰기 이벤트의 episodeId는 u00-tutorial이다 — 옛 통과 없이 열린다", () => {
    const started = harness();
    started.wiring.onStartCatalogCover("u00-tutorial");
    expect(started.sink.mock.calls.map(([event]) => event)).toEqual([
      { name: "episode_intro_viewed", episodeId: "u00-tutorial" },
    ]);
    expect(started.dispatch.mock.calls.map(([action]) => action)).toEqual([
      { type: "push", screen: { name: "catalog-cover", episodeId: "u00-tutorial" } },
    ]);

    const finished = harness();
    finished.wiring.onFinishCatalogCoverCuts("u00-tutorial");
    expect(finished.sink.mock.calls.map(([event]) => event)).toEqual([
      { name: "episode_prologue_completed", episodeId: "u00-tutorial", prologueKind: "cuts" },
    ]);
    const updater = finished.setCatalogProgress.mock.calls[0]?.[0] as (
      p: CatalogProgress,
    ) => CatalogProgress;
    expect(updater({})).toEqual({ "u00-tutorial": ["intro"] });

    const skipped = harness();
    skipped.wiring.onSkipCatalogCover("u00-tutorial");
    expect(skipped.sink.mock.calls.map(([event]) => event)).toEqual([
      { name: "episode_intro_skipped", episodeId: "u00-tutorial" },
    ]);
  });

  test("EV1. 게이트 입력 legacyTutorialPassed — 옛 통과면 u00 없이 u01 표지가 열리고 u02는 닫혀 있다", () => {
    const passed = harness({ legacyPassed: true });
    passed.wiring.onStartCatalogCover("u01-water");
    passed.wiring.onStartCatalogCover("u02-checkin");
    expect(passed.dispatch.mock.calls.map(([action]) => action)).toEqual([
      { type: "push", screen: { name: "catalog-cover", episodeId: "u01-water" } },
    ]);
  });
});

describe("onFinishCatalogCoverCuts · onCloseCatalogCover", () => {
  test("CW3. 마지막 컷은 이벤트 → 진행 기록만 하고 이동하지 않으며, 배너가 닫히면 뒤로만 간다", () => {
    const { wiring, dispatch, sink, setCatalogProgress } = harness({ legacyPassed: true });

    wiring.onFinishCatalogCoverCuts("u01-water");

    expect(sink.mock.calls.map(([event]) => event)).toEqual([
      { name: "episode_prologue_completed", episodeId: "u01-water", prologueKind: "cuts" },
    ]);
    expect(setCatalogProgress).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
    const [sinkAt, setterAt] = firstOrder(sink, setCatalogProgress);
    expect(sinkAt).toBeLessThan(setterAt ?? 0);

    const updater = setCatalogProgress.mock.calls[0]?.[0] as (
      p: CatalogProgress,
    ) => CatalogProgress;
    expect(typeof updater).toBe("function");
    expect(updater({})).toEqual({ "u01-water": ["intro"] });
    const already: CatalogProgress = { "u01-water": ["intro", "S1"] };
    expect(updater(already)).toBe(already);

    wiring.onCloseCatalogCover();

    expect(dispatch.mock.calls.map(([action]) => action)).toEqual([{ type: "back" }]);
    expect(sink).toHaveBeenCalledTimes(1);
    expect(setCatalogProgress).toHaveBeenCalledTimes(1);
  });
});

describe("onExitCatalogCover", () => {
  test("CW4. 나가기는 exited 이벤트 뒤에 뒤로만 가고 진행은 기록하지 않는다", () => {
    const { wiring, dispatch, sink, setCatalogProgress } = harness({ legacyPassed: true });

    wiring.onExitCatalogCover("u01-water", "prologue");

    expect(sink.mock.calls.map(([event]) => event)).toEqual([
      { name: "episode_intro_exited", episodeId: "u01-water", stage: "prologue" },
    ]);
    expect(dispatch.mock.calls.map(([action]) => action)).toEqual([{ type: "back" }]);
    expect(setCatalogProgress).not.toHaveBeenCalled();
    const [sinkAt, dispatchAt] = firstOrder(sink, dispatch);
    expect(sinkAt).toBeLessThan(dispatchAt ?? 0);
  });

  test("CW10. 표지에서 나가면 stage intro로 내고 기록은 없다", () => {
    const { wiring, dispatch, sink, setCatalogProgress } = harness({ legacyPassed: true });

    wiring.onExitCatalogCover("u01-water", "intro");

    expect(sink.mock.calls.map(([event]) => event)).toEqual([
      { name: "episode_intro_exited", episodeId: "u01-water", stage: "intro" },
    ]);
    expect(dispatch.mock.calls.map(([action]) => action)).toEqual([{ type: "back" }]);
    expect(setCatalogProgress).not.toHaveBeenCalled();
  });
});

describe("onSkipCatalogCover", () => {
  test("CW8. 이벤트 → 진행 기록 → 뒤로 순서이고 prologue_completed는 내지 않는다", () => {
    const { wiring, dispatch, sink, setCatalogProgress } = harness({ legacyPassed: true });

    wiring.onSkipCatalogCover("u01-water");

    expect(sink.mock.calls.map(([event]) => event)).toEqual([
      { name: "episode_intro_skipped", episodeId: "u01-water" },
    ]);
    expect(setCatalogProgress).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls.map(([action]) => action)).toEqual([{ type: "back" }]);
    const [sinkAt, setterAt, dispatchAt] = firstOrder(sink, setCatalogProgress, dispatch);
    expect(sinkAt).toBeLessThan(setterAt ?? 0);
    expect(setterAt).toBeLessThan(dispatchAt ?? 0);

    const updater = setCatalogProgress.mock.calls[0]?.[0] as (
      p: CatalogProgress,
    ) => CatalogProgress;
    expect(typeof updater).toBe("function");
    expect(updater({})).toEqual({ "u01-water": ["intro"] });
  });
});

describe("이미 끝낸 표지의 건너뛰기", () => {
  test("CW12. 표지를 이미 끝냈으면 skipped 이벤트도 진행 기록도 없이 뒤로만 간다", () => {
    const { wiring, dispatch, sink, setCatalogProgress } = harness({
      legacyPassed: true,
      progress: { "u01-water": ["intro", "S1"] },
    });

    wiring.onSkipCatalogCover("u01-water");

    expect(sink).not.toHaveBeenCalled();
    expect(setCatalogProgress).not.toHaveBeenCalled();
    expect(dispatch.mock.calls.map(([action]) => action)).toEqual([{ type: "back" }]);
  });

  test("CW13. 다른 에피소드만 끝냈으면 이 에피소드의 건너뛰기는 그대로 센다", () => {
    const { wiring, sink } = harness({
      legacyPassed: true,
      progress: { "u02-checkin": ["intro"] },
    });

    wiring.onSkipCatalogCover("u01-water");

    expect(sink.mock.calls.map(([event]) => event)).toEqual([
      { name: "episode_intro_skipped", episodeId: "u01-water" },
    ]);
  });
});

describe("onContinueCatalogCover", () => {
  test("CW9. 표지의 Next는 continued 이벤트만 낸다", () => {
    const { wiring, dispatch, sink, setCatalogProgress } = harness({ legacyPassed: true });

    wiring.onContinueCatalogCover("u01-water");

    expect(sink.mock.calls.map(([event]) => event)).toEqual([
      { name: "episode_intro_continued", episodeId: "u01-water", hasPrologue: true },
    ]);
    expect(setCatalogProgress).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("없앤 길", () => {
  test("CW11. onCompleteCatalogCover는 결선에 없다", () => {
    const { wiring } = harness({ legacyPassed: true });

    expect("onCompleteCatalogCover" in wiring).toBe(false);
  });
});

describe("catalogCoverModelOf", () => {
  const sections = catalogMapSectionsOf(realCatalog);
  const content = contentOf(realCatalog);

  test("CW5. 준비된 에피소드는 자리 · 버전 · 컷을 낸다", () => {
    const model = catalogCoverModelOf(content, sections, "u01-water", {});

    expect(model?.ordinal).toBe(1);
    expect(model?.title).toBe(sections.find((item) => item.episodeId === "u01-water")?.title);
    expect(model?.title).not.toBe("");
    expect(model?.version).toBe("2026-10-16.1");
    expect(model?.cuts).toHaveLength(6);
  });

  test("CWA1. 컷에 음성 주소가 실리고 통과 뒤 컷에는 없다", () => {
    const model = catalogCoverModelOf(content, sections, "u01-water", {});
    expect(model?.cuts[2]?.audioSource).toBe("https://cdn/audio/u01-water/pre-3.m4a");
    expect(model?.cuts[5]?.audioSource).toBe("https://cdn/audio/u01-water/d-01.m4a");

    const epilogue = catalogEpilogueModelOf(content, sections, "u01-water", {});
    expect(epilogue?.cuts.map((cut) => "audioSource" in cut)).toEqual([false, false, false]);
  });

  test("CWA1. u02 표지 컷도 개정 표대로 주소가 실린다", () => {
    const model = catalogCoverModelOf(content, sections, "u02-checkin", {});
    const sources = Object.fromEntries(
      (model?.cuts ?? []).flatMap((cut) =>
        cut.audioSource === undefined ? [] : [[cut.index, cut.audioSource]],
      ),
    );
    expect(sources).toEqual({
      1: "https://cdn/audio/u02-checkin/pre-1.m4a",
      3: "https://cdn/audio/u02-checkin/pre-3.m4a",
      5: "https://cdn/audio/u02-checkin/d-01.m4a",
    });
  });

  test("CW5. 없는 id와 준비 안 된 항목은 null이다", () => {
    const withPending: readonly CatalogEntry[] = [
      ...realCatalog,
      { status: "pending", id: "u04-x", order: 4, title: "제목", version: "v1" },
    ];

    expect(catalogCoverModelOf(content, sections, "nope", {})).toBeNull();
    expect(
      catalogCoverModelOf(contentOf(withPending), catalogMapSectionsOf(withPending), "u04-x", {}),
    ).toBeNull();
  });
});

describe("catalogEpilogueModelOf", () => {
  const sections = catalogMapSectionsOf(realCatalog);
  const content = contentOf(realCatalog);

  test("CW-E1. 준비된 에피소드는 자리와 통과 뒤 컷을 낸다", () => {
    const model = catalogEpilogueModelOf(content, sections, "u01-water", {});

    expect(model?.ordinal).toBe(1);
    expect(model?.cuts).toHaveLength(3);
  });

  test("CW-E1. 통과 뒤 컷이 없는 픽스처와 준비 안 된 항목과 없는 id는 null이다", () => {
    const base = realCatalog.find((entry) => entry.id === "u01-water") as ReadyEntry;
    const empty: ReadyEntry = { ...base, episode: { ...base.episode, epilogue: [] } };
    const withPending: readonly CatalogEntry[] = [
      ...realCatalog,
      { status: "pending", id: "u04-x", order: 4, title: "제목", version: "v1" },
    ];

    expect(
      catalogEpilogueModelOf(contentOf([empty]), catalogMapSectionsOf([empty]), "u01-water", {}),
    ).toBeNull();
    expect(
      catalogEpilogueModelOf(
        contentOf(withPending),
        catalogMapSectionsOf(withPending),
        "u04-x",
        {},
      ),
    ).toBeNull();
    expect(catalogEpilogueModelOf(content, sections, "nope", {})).toBeNull();
  });
});

describe("sink가 null일 때", () => {
  test("CW7. 어느 콜백도 던지지 않는다", () => {
    const { wiring, dispatch } = harness({ legacyPassed: true, sinkNull: true });

    expect(() => wiring.onStartCatalogCover("u01-water")).not.toThrow();
    expect(dispatch).toHaveBeenCalledWith({
      type: "push",
      screen: { name: "catalog-cover", episodeId: "u01-water" },
    });
    expect(() => wiring.onExitCatalogCover("u01-water", "intro")).not.toThrow();
    expect(() => wiring.onContinueCatalogCover("u01-water")).not.toThrow();
    expect(() => wiring.onSkipCatalogCover("u01-water")).not.toThrow();
    expect(() => wiring.onFinishCatalogCoverCuts("u01-water")).not.toThrow();
    expect(() => wiring.onCloseCatalogCover()).not.toThrow();
  });
});
