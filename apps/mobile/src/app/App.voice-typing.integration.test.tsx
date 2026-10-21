import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { AppJourneySeed } from "./journey-progress";
import { resetPushWiringForTests } from "./push-wiring";
import {
  contentNotFoundResponse,
  contentPathOf,
  isContentRequest,
} from "./test-helpers/content-requests";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { audioSyncLengthMs } from "../lib/audio-manifest";
import { manifestTextOf, ABSENT_BODY } from "../lib/audio-manifest.test-support";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { CONTENT_AUDIO_MANIFEST_KEY } from "../lib/episode-cache";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { EPISODE_BANNER_HOLD_MS } from "../screens/catalog-cover/episode-banner";
import { voiceRevealIntervalMs } from "../screens/catalog-cover/voice-reveal";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { journeySteps } from "../screens/journey-map/journey-map";
import {
  bootContentApp,
  manifestOf,
  minimalEpisodeText,
  settle,
} from "./test-helpers/episode-content-boot";
import { episodeAssetPaths } from "../lib/episode-assets";

// `integration` 계층: 실행기 한 차례(에피소드 받기 -> 음성 정보 파일 받기)가 전송 대역 -> 기기 저장소 -> 로더 ->
// 컷 모델 -> 화면 -> 타자기까지 닿는지 한 트리에서 봅니다. 대역은 경계뿐입니다 - `NativeModules`
// (저장소 · 오디오 · 선택 파일 모듈) · `fetch` · env.

const supabaseUrl = "https://test.supabase.co";
const u01 = "u01-water";
const audioUrl = (id: string): string =>
  `${supabaseUrl}/storage/v1/object/public/content/audio/${id}.m4a`;

const PRE_3 = { duration_ms: 2299, speech_end_ms: 1763 };
const MANIFEST_TEXT = manifestTextOf({ "u01-water/pre-3": PRE_3 });
const OTHER_TEXT = manifestTextOf({ "u01-water/pre-3": { duration_ms: 1000, speech_end_ms: 900 } });

const refreshedBody = JSON.stringify({
  access_token: `e30.${btoa(JSON.stringify({ sub: "u" })).replace(/=+$/, "")}.sig`,
  refresh_token: "refreshed-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "u" },
});

const tutorialDoneSeed: AppJourneySeed = {
  completedStepCount: journeySteps.length,
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};
const tutorialDoneSnapshot = {
  version: 1,
  completedStepCount: journeySteps.length,
  completedEpisodeIntroIds: ["tutorial-intro"],
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovel: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

// 표지 컷 3(「어서 오세요.」)의 원문 ko - 기대 간격을 같은 순수 함수로 만들 때 씁니다.
const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const preThreeKo = ((): string => {
  const entry = realCatalog.find((candidate) => candidate.id === u01);
  if (entry === undefined || entry.status !== "ready") throw new Error("u01 not ready");
  const cut = entry.episode.prologue.find((candidate) => candidate.audioUrl === "u01-water/pre-3");
  if (cut === undefined) throw new Error("pre-3 cut");
  return cut.kind === "narration" ? cut.narration.ko : cut.line.ko;
})();

type Reply = { readonly status: number; readonly text: string };
type BootOptions = {
  /** `audio/manifest.json` 요청에 줄 응답. 없으면 404, `"reject"`면 연결 실패. */
  readonly audioManifest?: Reply | "reject";
  /** 기기 저장소에 미리 둘 음성 정보 파일 원문. */
  readonly seed?: string;
  /** 콘텐츠 요청 전부를 연결 실패로 만듭니다(오프라인). */
  readonly offline?: boolean;
};

type Booted = {
  readonly store: Map<string, string>;
  readonly events: EpisodeIntroEvent[];
  readonly play: ReturnType<
    typeof vi.fn<(source: string, done: (result: unknown) => void) => void>
  >;
};

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function boot(options: BootOptions = {}): Promise<Booted> {
  const store = new Map<string, string>();
  store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  if (options.seed !== undefined) store.set(CONTENT_AUDIO_MANIFEST_KEY, options.seed);
  const play = vi.fn<(source: string, done: (result: unknown) => void) => void>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    AudioPlaybackModule: { play, stop: vi.fn<() => void>() },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", supabaseUrl);
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

  const snapshot = { ...tutorialDoneSnapshot, catalogProgress: {} };
  vi.stubGlobal("fetch", (target: string) => {
    if (target.includes("grant_type=refresh_token")) {
      return Promise.resolve({ status: 200, text: async () => refreshedBody });
    }
    if (isContentRequest(target)) {
      if (options.offline === true) return Promise.reject(new Error("offline"));
      if (contentPathOf(target) === "audio/manifest.json") {
        const reply = options.audioManifest;
        if (reply === "reject") return Promise.reject(new Error("offline"));
        if (reply !== undefined) {
          return Promise.resolve({ status: reply.status, text: async () => reply.text });
        }
      }
      return Promise.resolve(contentNotFoundResponse());
    }
    const name = target.split("/rest/v1/rpc/")[1] ?? target;
    const body =
      name === "load_learning_progress"
        ? { status: 200, body: JSON.stringify(snapshot) }
        : name === "learning_streak" || name === "record_learning_days"
          ? { status: 200, body: "1" }
          : { status: 204, body: "" };
    return Promise.resolve({ status: body.status, text: async () => body.body });
  });

  const events: EpisodeIntroEvent[] = [];
  vi.useFakeTimers();
  render(
    <App
      journeySeed={tutorialDoneSeed}
      completedEpisodeIntroIds={["tutorial-intro"]}
      episodeIntroEventSink={(event) => events.push(event)}
    />,
  );
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  await flush();
  await flush();
  return { store, events, play };
}

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const tapButtonIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});
const cover = () => screen.getByTestId(`ui-lynx-special-unit-catalog-cover-${u01}`);
const tapNext = () => tapButtonIn("catalog-cover-screen-next");
const cutIndex = (): string | null =>
  screen.getByTestId("catalog-cover-screen").getAttribute("data-cut-index");
const shown = (): string =>
  (screen.getByTestId("ui-lynx-visual-novel-dialog-line").textContent ?? "").replaceAll(
    "\u200b",
    "",
  );
const glyphs = (): number => Array.from(shown()).length;
function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** 컷 하나를 넘깁니다 - 타자기가 쓰는 중이면 먼저 대사를 완성합니다. */
function advanceCut(): void {
  const dialog = screen.queryByTestId("ui-lynx-visual-novel-dialog");
  if (dialog?.getAttribute("data-status") === "revealing") tapNext();
  tapNext();
}

/** 가짜 타이머로 u01 표지를 엽니다(타자기를 흘려 보기 위해). */
function openCoverWithFakeTimers(): void {
  vi.useFakeTimers();
  fireEvent.tap(cover(), {});
  tapButtonIn("episode-intro-screen-next");
  expect(cutIndex()).toBe("0");
}

/** 표지 컷 1 · 2는 소리가 없어 35ms에 첫 글자가 나오고, 컷 3 앞에서 멈춥니다. */
function reachCutThree(): void {
  for (let cut = 0; cut < 2; cut += 1) {
    advance(34);
    expect(shown()).toBe("");
    advance(1);
    expect(glyphs()).toBe(1);
    advanceCut();
  }
  expect(cutIndex()).toBe("2");
}

/** 컷 3이 `interval`ms 간격으로 쓰이는지 봅니다. */
function expectCutThreeInterval(interval: number): void {
  advance(interval - 1);
  expect(shown()).toBe("");
  advance(1);
  expect(glyphs()).toBe(1);
}

/** 지금 컷부터 `count`개를 끝까지 읽고 배너 -> 맵까지 갑니다. */
async function readCoverToMap(
  play: Booted["play"],
  count: number,
): Promise<{ indexes: string[]; playsAt: number[] }> {
  const indexes: string[] = [];
  const playsAt: number[] = [];
  for (let i = 0; i < count; i += 1) {
    indexes.push(cutIndex() ?? "");
    playsAt.push(play.mock.calls.length);
    advanceCut();
  }
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.getByTestId("episode-banner-screen")).toHaveAttribute("data-kind", "start");
  act(() => {
    vi.advanceTimersByTime(EPISODE_BANNER_HOLD_MS);
  });
  vi.useRealTimers();
  await flush();
  return { indexes, playsAt };
}

const startEventNames = [
  "episode_intro_viewed",
  "episode_intro_continued",
  "episode_prologue_completed",
];
const names = (events: readonly EpisodeIntroEvent[]) => events.map((event) => event.name);

test("VTI1. 서버가 정보 파일을 주면 저장되고, 컷 3은 251ms 간격으로 쓰이며 앞 두 컷은 35ms다", async () => {
  const { store, play } = await boot({ audioManifest: { status: 200, text: MANIFEST_TEXT } });
  await vi.waitFor(() => expect(store.get(CONTENT_AUDIO_MANIFEST_KEY)).toBe(MANIFEST_TEXT));
  await flush();

  // 기대 간격은 같은 순수 함수로 만들되, 식이 비어 있지 않은지 실측 값(251)으로 먼저 못 박습니다.
  const expected = voiceRevealIntervalMs(
    audioSyncLengthMs({ durationMs: 2299, speechEndMs: 1763 }),
    preThreeKo,
  );
  expect(expected).toBe(251);

  openCoverWithFakeTimers();
  reachCutThree();
  expect(play.mock.calls.map((call) => call[0])).toEqual([audioUrl("u01-water/pre-3")]);
  expectCutThreeInterval(expected);
});

test("VTI2. 오프라인에서도 저장본으로 컷 3이 251ms 간격이고 저장본은 그대로다", async () => {
  const { store } = await boot({ seed: MANIFEST_TEXT, offline: true });

  expect(store.get(CONTENT_AUDIO_MANIFEST_KEY)).toBe(MANIFEST_TEXT);
  openCoverWithFakeTimers();
  reachCutThree();
  expectCutThreeInterval(251);
});

test("VTI3. 정보 파일이 없으면(400) 저장본이 지워지고 컷 3은 35ms이며 표지 흐름은 같다", async () => {
  const { store, play, events } = await boot({
    seed: MANIFEST_TEXT,
    audioManifest: { status: 400, text: ABSENT_BODY },
  });
  await vi.waitFor(() => expect(store.has(CONTENT_AUDIO_MANIFEST_KEY)).toBe(false));
  await flush();

  openCoverWithFakeTimers();
  reachCutThree();
  expectCutThreeInterval(35);
  const { indexes, playsAt } = await readCoverToMap(play, 4);
  expect(indexes).toEqual(["2", "3", "4", "5"]);
  expect(playsAt).toEqual([1, 1, 1, 2]);
  expect(play.mock.calls.map((call) => call[0])).toEqual([
    audioUrl("u01-water/pre-3"),
    audioUrl("u01-water/d-01"),
  ]);
  expect(names(events)).toEqual(startEventNames);
});

test("VTI3. 형식이 틀린 파일(200)이면 저장본이 그대로이고 컷 3은 251ms이며 표지 흐름은 같다", async () => {
  const bad = JSON.stringify({ schema: "audio-manifest-2", audio: {} });
  const { store, play, events } = await boot({
    seed: MANIFEST_TEXT,
    audioManifest: { status: 200, text: bad },
  });
  await flush();

  expect(store.get(CONTENT_AUDIO_MANIFEST_KEY)).toBe(MANIFEST_TEXT);
  openCoverWithFakeTimers();
  reachCutThree();
  expectCutThreeInterval(251);
  const { playsAt } = await readCoverToMap(play, 4);
  expect(playsAt).toEqual([1, 1, 1, 2]);
  expect(names(events)).toEqual(startEventNames);
});

test("VTI3c. 정보 파일 받기가 실패해도(500) 표지는 끝까지 읽히고 재생 열 · 이벤트 열이 같다", async () => {
  const { store, play, events } = await boot({ audioManifest: { status: 500, text: "" } });
  await flush();

  expect(store.has(CONTENT_AUDIO_MANIFEST_KEY)).toBe(false);
  openCoverWithFakeTimers();
  const { indexes, playsAt } = await readCoverToMap(play, 6);
  expect(indexes).toEqual(["0", "1", "2", "3", "4", "5"]);
  expect(playsAt).toEqual([0, 0, 1, 1, 1, 2]);
  expect(play.mock.calls.map((call) => call[0])).toEqual([
    audioUrl("u01-water/pre-3"),
    audioUrl("u01-water/d-01"),
  ]);
  expect(names(events)).toEqual(startEventNames);
});

test("VTI3. 다른 원문이 오면 저장본이 바뀌고 다시 읽은 뒤의 컷 3이 새 간격을 따른다", async () => {
  const { store } = await boot({
    seed: MANIFEST_TEXT,
    audioManifest: { status: 200, text: OTHER_TEXT },
  });
  await vi.waitFor(() => expect(store.get(CONTENT_AUDIO_MANIFEST_KEY)).toBe(OTHER_TEXT));
  await flush();

  openCoverWithFakeTimers();
  reachCutThree();
  expectCutThreeInterval(voiceRevealIntervalMs(900, preThreeKo));
  expect(voiceRevealIntervalMs(900, preThreeKo)).toBe(128);
});

// ---- 실행기 순서 · 독립(원격 에피소드 + 파일 모듈 대역) -------------------------------------------------

const syncEvent = "contentSyncOpportunity";
const emitSync = () =>
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(syncEvent, []);
  });
const episode = minimalEpisodeText("u04-x", { cover: { image_url: "content/images/u04-x/c.jpg" } });
const remoteContent = {
  "manifest.json": manifestOf([{ id: "u04-x", order: 4, text: episode }]),
  "episodes/u04-x.json": episode,
  "audio/manifest.json": MANIFEST_TEXT,
};
const paths = (urls: readonly string[]) => urls.map((url) => contentPathOf(url));
const audioRequests = (urls: readonly string[]) =>
  urls.filter((url) => contentPathOf(url) === "audio/manifest.json");
const bundledPaths = bundledCatalogInput.manifest.episodes.flatMap((entry) =>
  episodeAssetPaths(bundledCatalogInput.episodes[entry.id]),
);

function heldFiles() {
  const saved = new Set<string>(bundledPaths);
  const held: (() => void)[] = [];
  const download = vi.fn<(url: string, path: string, callback: (p: unknown) => void) => void>(
    (_url, path, callback) => {
      held.push(() => {
        saved.add(path);
        callback({ status: "saved", bytes: "10" });
      });
    },
  );
  return {
    module: {
      download,
      fileUrl: (path: string) => (saved.has(path) ? `file:///files/${path}` : ""),
      remove: vi.fn<() => void>(),
    },
    download,
    releaseAll: () => held.splice(0).forEach((finish) => finish()),
  };
}

test("VTI4. 정보 파일은 그 차례의 에피소드 받기(본문 · 자산) 뒤에 한 번 나오고, 신호마다 한 번 더 나온다", async () => {
  const files = heldFiles();
  const { urls, store } = await bootContentApp({
    content: remoteContent,
    contentFiles: files.module,
  });
  await vi.waitFor(() => expect(files.download).toHaveBeenCalledTimes(1));
  await settle();

  // 자산 받기가 끝나지 않았으므로 정보 파일은 아직 요청되지 않는다.
  expect(paths(urls)).toContain("episodes/u04-x.json");
  expect(audioRequests(urls)).toHaveLength(0);

  await act(async () => {
    files.releaseAll();
  });
  await settle();
  expect(audioRequests(urls)).toHaveLength(1);
  expect(paths(urls).indexOf("audio/manifest.json")).toBeGreaterThan(
    paths(urls).indexOf("episodes/u04-x.json"),
  );
  expect(store.get(CONTENT_AUDIO_MANIFEST_KEY)).toBe(MANIFEST_TEXT);

  await emitSync();
  await settle();
  expect(audioRequests(urls)).toHaveLength(2);
  await emitSync();
  await settle();
  expect(audioRequests(urls)).toHaveLength(3);
});

test("VTI4. 정보 파일이 500이어도 원격 에피소드는 같은 실행 안에서 열린다", async () => {
  const files = heldFiles();
  const { urls, store } = await bootContentApp({
    content: remoteContent,
    contentFiles: files.module,
    status: { "audio/manifest.json": 500 },
  });
  await vi.waitFor(() => expect(files.download).toHaveBeenCalledTimes(1));
  await act(async () => {
    files.releaseAll();
  });
  await settle();

  expect(audioRequests(urls)).toHaveLength(1);
  expect(store.has(CONTENT_AUDIO_MANIFEST_KEY)).toBe(false);
  expect(screen.getByTestId("catalog-section-u04-x")).toBeInTheDocument();
});
