import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { contentPathOf } from "./test-helpers/content-requests";
import {
  bootContentApp,
  manifestOf,
  minimalEpisodeText,
} from "./test-helpers/episode-content-boot";
import { contentAssetsKey } from "../lib/episode-asset-sync";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { episodeAssetPaths } from "../lib/episode-assets";
import {
  CONTENT_MANIFEST_KEY,
  CONTENT_RECEIVED_MANIFEST_KEY,
  contentEpisodeKey,
} from "../lib/episode-cache";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { contentStagedAssetsKey, contentStagedEpisodeKey } from "../lib/episode-staging";
import { sha256Hex, utf8Bytes } from "../lib/sha256";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";

// `integration` 계층: 앱 루트 훅 → 실제 받기 · 스테이징 · 교체 · 로더 → 스플래시 포트 → 맵까지 한 트리에서
// 봅니다. 대역은 경계뿐입니다 — 가짜 전송(`fetch`) · `StorageModule` · `ContentFileModule` · 가짜 시계.
// 「다음 시작」은 `cleanup()` 뒤 같은 저장소 내용으로 `App`을 다시 그려 만듭니다. 버전은 맵에서 보이는
// 것으로 가릅니다 — v2에만 레슨 노드 `S2`가 더 있습니다.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const idOfEpisode = "u04-x";
const closedEventName = "episode_update_splash_closed";
const v1Version = "2026-10-13.1";
const v2Version = "2026-10-14.1";

type Version = "v1" | "v2";

function textOf(version: Version, extra: Record<string, unknown> = {}): string {
  const base = JSON.parse(
    minimalEpisodeText(idOfEpisode, {
      title: `제목 ${version}`,
      cover: { image_url: `content/images/${idOfEpisode}/${version}.jpg` },
      ...extra,
    }),
  ) as { steps: { id: string; order: number; items: { id: string }[] }[] };
  if (version === "v2") {
    const first = base.steps[0];
    if (first === undefined) throw new Error("fixture step is missing");
    const second = {
      ...first,
      id: "S2",
      order: 2,
      items: first.items.map((item) => ({ ...item, id: "S2-01" })),
    };
    base.steps = [first, second, { id: "RP", order: 3, items: base.steps[1]?.items ?? [] }];
  }
  return JSON.stringify(base);
}

const v1Text = textOf("v1");
const v2Text = textOf("v2");

function manifestFor(
  episodes: readonly { id: string; order: number; text: string; version: string }[],
): string {
  return manifestOf(
    episodes.map((entry) => ({ ...entry, title: `제목 ${entry.id} ${entry.version}` })),
  );
}

const v1Entry = { id: idOfEpisode, order: 4, text: v1Text, version: v1Version };
const v2Entry = { id: idOfEpisode, order: 4, text: v2Text, version: v2Version };

// 지난 실행에서 v1을 다 갖춰 둔 기기(활성 매니페스트 · 본문 · 자산 표시).
const seedV1 = {
  [CONTENT_MANIFEST_KEY]: manifestFor([v1Entry]),
  [contentEpisodeKey(idOfEpisode)]: v1Text,
  [contentAssetsKey(idOfEpisode)]: JSON.stringify({
    sha256: sha256Hex(utf8Bytes(v1Text)),
    missing: [],
  }),
};
const bucketV2 = {
  "manifest.json": manifestFor([v2Entry]),
  [`episodes/${idOfEpisode}.json`]: v2Text,
};

const bundledPaths = bundledCatalogInput.manifest.episodes.flatMap((entry) =>
  episodeAssetPaths(bundledCatalogInput.episodes[entry.id]),
);

// 받기를 붙잡는 파일 모듈 대역입니다 — 손으로 풀 때까지 `download`가 끝나지 않습니다.
function fileModule() {
  const saved = new Set<string>([...bundledPaths, ...episodeAssetPaths(JSON.parse(v1Text))]);
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
      remove: vi.fn<(path: string) => void>(),
    },
    download,
    releaseOne: () => held.shift()?.(),
    releaseAll: () => held.splice(0).forEach((finish) => finish()),
  };
}

function collector() {
  const events: EpisodeIntroEvent[] = [];
  return {
    events,
    onEvent: (event: EpisodeIntroEvent) => void events.push(event),
    closed: () => events.filter((event) => event.name === closedEventName),
  };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 6; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  }
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  await flush();
}

async function endLogo(): Promise<void> {
  fireEvent(
    screen.getByTestId("splash-screen-logo"),
    new window.Event("bindEvent:finalloopcomplete"),
  );
  await flush();
}

const splashUp = (): boolean => screen.queryByTestId("splash-screen-logo") !== null;
const gauge = (): HTMLElement | null => screen.queryByTestId("splash-update");
const percentOf = (): number => Number(gauge()?.getAttribute("data-percent") ?? "NaN");
const section = () => screen.queryByTestId(`catalog-section-${idOfEpisode}`);
const lessonS2 = () => screen.queryByTestId(`journey-map-cell-catalog-${idOfEpisode}-S2`);

test("[EUI1] 바뀐 에피소드를 로고 안에 다 받으면 게이지가 100까지 찬 뒤 새 버전이 열린다", async () => {
  const files = fileModule();
  const sink = collector();
  const { store } = await bootContentApp({
    content: bucketV2,
    contentFiles: files.module,
    preStore: seedV1,
    splash: "hold",
    onEvent: sink.onEvent,
  });
  await flush();

  expect(splashUp()).toBe(true);
  expect(gauge()).not.toBeNull();
  expect(percentOf()).toBeLessThan(100);
  expect(files.download).toHaveBeenCalledTimes(1);

  await act(async () => {
    files.releaseAll();
  });
  await flush();
  expect(percentOf()).toBe(100);

  await endLogo();

  expect(splashUp()).toBe(false);
  expect(section()).toBeInTheDocument();
  expect(lessonS2()).toBeInTheDocument();
  expect(store.get(contentEpisodeKey(idOfEpisode))).toBe(v2Text);
  expect(sink.closed()).toHaveLength(1);
  expect(sink.closed()[0]).toMatchObject({
    name: closedEventName,
    outcome: "complete",
    replacedCount: "1",
    episodeCount: "1",
  });
});

// 시간 제한 없이 기다리는지 보는 긴 시간입니다(10분).
const LONG_MS = 10 * 60 * 1000;

test("[EUI2] 받는 동안은 시간이 아무리 지나도 스플래시가 기다리고, 다 받으면 나가면서 새 버전이 맵에 바로 선다", async () => {
  const files = fileModule();
  const sink = collector();
  const { store } = await bootContentApp({
    content: bucketV2,
    contentFiles: files.module,
    preStore: seedV1,
    splash: "hold",
    onEvent: sink.onEvent,
  });
  await flush();
  expect(gauge()).not.toBeNull();

  await endLogo();
  await advance(LONG_MS);
  expect(splashUp()).toBe(true);

  await act(async () => {
    files.releaseAll();
  });
  await flush();

  expect(splashUp()).toBe(false);
  expect(lessonS2()).toBeInTheDocument();
  expect(store.get(contentEpisodeKey(idOfEpisode))).toBe(v2Text);
  expect(store.has(contentStagedEpisodeKey(idOfEpisode))).toBe(false);
  expect(sink.closed()).toHaveLength(1);
  expect(sink.closed()[0]).toMatchObject({ outcome: "complete", replacedCount: "1" });
});

test("[EUI3] 받는 도중 앱이 꺼져도 준비된 새 버전은 다음 시작에 오프라인이어도 올라가 게이지 없이 열린다", async () => {
  const files = fileModule();
  const first = await bootContentApp({
    content: bucketV2,
    contentFiles: files.module,
    preStore: seedV1,
    splash: "hold",
  });
  await flush();
  await endLogo();
  // 스플래시가 기다리는 중에 앱이 꺼집니다 — 받기는 뒤에서 끝나 스테이징에 남습니다.
  cleanup();
  await act(async () => {
    files.releaseAll();
  });
  await flush();
  expect(first.store.has(contentStagedAssetsKey(idOfEpisode))).toBe(true);
  expect(first.store.has(CONTENT_RECEIVED_MANIFEST_KEY)).toBe(true);

  vi.useRealTimers();
  const sink = collector();
  const second = await bootContentApp({
    content: {},
    offline: true,
    contentFiles: fileModule().module,
    preStore: Object.fromEntries(first.store),
    splash: "hold",
    onEvent: sink.onEvent,
  });
  await flush();

  expect(gauge()).toBeNull();
  await endLogo();

  expect(splashUp()).toBe(false);
  expect(lessonS2()).toBeInTheDocument();
  expect(second.store.get(contentEpisodeKey(idOfEpisode))).toBe(v2Text);
  expect(sink.closed()).toHaveLength(1);
  expect(sink.closed()[0]).toMatchObject({ outcome: "unchecked", replacedCount: "1" });
});

test("[EUI4] 새 에피소드도 스플래시가 다 받을 때까지 기다려 첫 맵에 바로 선다", async () => {
  const files = fileModule();
  const fresh = {
    id: "u05-x",
    order: 5,
    text: minimalEpisodeText("u05-x", { cover: { image_url: "content/images/u05-x/c.jpg" } }),
    version: v1Version,
  };
  await bootContentApp({
    content: {
      "manifest.json": manifestFor([v1Entry, fresh]),
      [`episodes/${idOfEpisode}.json`]: v1Text,
      "episodes/u05-x.json": fresh.text,
    },
    contentFiles: files.module,
    preStore: seedV1,
    splash: "hold",
  });
  await flush();
  expect(gauge()).not.toBeNull();

  await endLogo();
  await advance(LONG_MS);
  expect(splashUp()).toBe(true);

  await act(async () => {
    files.releaseAll();
  });
  await flush();

  expect(splashUp()).toBe(false);
  expect(screen.getByTestId("catalog-section-u05-x")).toBeInTheDocument();
});

test("[EUI9] 스플래시에서 못 받은 새 버전도 앱 사용 중 받아지면 여정맵 루트에서 바로 바뀐다", async () => {
  // 첫 받기 차례는 연결이 끊겨 실패하고(스플래시는 옛 버전으로 넘어감), 신호 뒤 둘째 차례는 성공합니다.
  let failing = true;
  const saved = new Set<string>([...bundledPaths, ...episodeAssetPaths(JSON.parse(v1Text))]);
  const contentFiles = {
    download: (_url: string, path: string, callback: (p: unknown) => void) => {
      if (failing) {
        callback({ status: "network" });
        return;
      }
      saved.add(path);
      callback({ status: "saved", bytes: "10" });
    },
    fileUrl: (path: string) => (saved.has(path) ? `file:///files/${path}` : ""),
    remove: vi.fn<(path: string) => void>(),
  };
  const { store } = await bootContentApp({
    content: bucketV2,
    contentFiles,
    preStore: seedV1,
    splash: "hold",
  });
  await flush();
  await endLogo();
  await flush();

  expect(splashUp()).toBe(false);
  expect(section()).toBeInTheDocument();
  expect(lessonS2()).toBeNull();

  failing = false;
  await act(async () => {
    lynx.getJSModule("GlobalEventEmitter").emit("contentSyncOpportunity", []);
  });
  await flush();

  expect(lessonS2()).toBeInTheDocument();
  expect(store.get(contentEpisodeKey(idOfEpisode))).toBe(v2Text);
});

test("[EUI5a] 받을 것이 없으면 게이지 없이 로고 끝에 바로 맵이 서고 nothing이 나간다", async () => {
  const sink = collector();
  await bootContentApp({
    content: {
      "manifest.json": manifestFor([v1Entry]),
      [`episodes/${idOfEpisode}.json`]: v1Text,
    },
    contentFiles: fileModule().module,
    preStore: seedV1,
    splash: "hold",
    onEvent: sink.onEvent,
  });
  await flush();

  expect(gauge()).toBeNull();
  await endLogo();

  expect(splashUp()).toBe(false);
  expect(section()).toBeInTheDocument();
  expect(sink.closed()).toHaveLength(1);
  expect(sink.closed()[0]).toMatchObject({
    outcome: "nothing",
    episodeCount: "0",
    replacedCount: "0",
  });
});

test("[EUI5b] 매니페스트가 404여도 게이지 없이 바로 열리고 닫힘 이벤트는 없다", async () => {
  const sink = collector();
  await bootContentApp({
    content: {},
    contentFiles: fileModule().module,
    preStore: seedV1,
    splash: "hold",
    onEvent: sink.onEvent,
  });
  await flush();

  expect(gauge()).toBeNull();
  await endLogo();

  expect(splashUp()).toBe(false);
  expect(section()).toBeInTheDocument();
  expect(sink.closed()).toHaveLength(0);
});

test("[EUI5c] 파일 모듈이 없으면 바뀐 매니페스트가 와도 게이지 없이 바로 열린다", async () => {
  await bootContentApp({ content: bucketV2, preStore: seedV1, splash: "hold" });
  await flush();

  expect(gauge()).toBeNull();
  await endLogo();

  expect(splashUp()).toBe(false);
  expect(section()).toBeInTheDocument();
});

test("[EUI6] 새 본문이 매니페스트와 맞지 않으면 게이지가 풀려 바로 열리고 옛 버전이 그대로다", async () => {
  const files = fileModule();
  const sink = collector();
  const { store } = await bootContentApp({
    content: { ...bucketV2, [`episodes/${idOfEpisode}.json`]: `${v2Text} ` },
    contentFiles: files.module,
    preStore: seedV1,
    splash: "hold",
    onEvent: sink.onEvent,
  });
  await flush();

  await endLogo();

  expect(splashUp()).toBe(false);
  expect(section()).toBeInTheDocument();
  expect(lessonS2()).toBeNull();
  expect(store.get(CONTENT_MANIFEST_KEY)).toBe(seedV1[CONTENT_MANIFEST_KEY]);
  expect(store.get(contentEpisodeKey(idOfEpisode))).toBe(v1Text);
  expect(store.get(contentAssetsKey(idOfEpisode))).toBe(seedV1[contentAssetsKey(idOfEpisode)]);
  expect(sink.closed()).toHaveLength(1);
  expect(sink.closed()[0]).toMatchObject({ outcome: "failed" });
});

test("[EUI7] 한 에피소드의 자산은 넷씩 함께 받고 게이지는 받은 파일 수만큼 오른다", async () => {
  const files = fileModule();
  const cut = (n: number) => ({
    index: n,
    kind: "pre",
    cut_kind: "narration",
    narration: { ko: "지문", roman: "r-지문", en: "e-지문" },
    image_brief: "brief",
    image_url: `content/images/${idOfEpisode}/p${n}.jpg`,
  });
  const richV2 = textOf("v2", {
    cover: {
      image_url: `content/images/${idOfEpisode}/v2.jpg`,
      audio_url: `${idOfEpisode}/l1`,
    },
    pre_cuts: [cut(1), cut(2), cut(3)],
  });
  expect(episodeAssetPaths(JSON.parse(richV2))).toHaveLength(5);

  await bootContentApp({
    content: {
      "manifest.json": manifestFor([{ ...v2Entry, text: richV2 }]),
      [`episodes/${idOfEpisode}.json`]: richV2,
    },
    contentFiles: files.module,
    preStore: seedV1,
    splash: "hold",
  });
  await flush();

  expect(files.download).toHaveBeenCalledTimes(4);
  expect(percentOf()).toBe(Math.floor(100 * (1 / 6)));

  await act(async () => {
    files.releaseOne();
  });
  await flush();

  expect(files.download).toHaveBeenCalledTimes(5);
  expect(percentOf()).toBe(Math.floor(100 * (2 / 6)));

  for (let round = 0; round < 3; round += 1) {
    await act(async () => {
      files.releaseAll();
    });
    await flush();
  }
  expect(percentOf()).toBe(100);
});

test("[EUI8] 콘텐츠 JSON 요청에는 주소 키가 붙고 그림 · 음성 파일 주소에는 붙지 않는다", async () => {
  const files = fileModule();
  const { urls } = await bootContentApp({
    content: bucketV2,
    contentFiles: files.module,
    preStore: seedV1,
    splash: "hold",
  });
  await flush();
  await act(async () => {
    files.releaseAll();
  });
  await flush();

  const withPath = (path: string) => urls.filter((url) => contentPathOf(url) === path);
  const v2Prefix = sha256Hex(utf8Bytes(v2Text)).slice(0, 16);

  const manifests = withPath("manifest.json");
  expect(manifests).toHaveLength(1);
  expect(manifests[0]).toMatch(/\/manifest\.json\?m=\d+$/);

  const bodies = withPath(`episodes/${idOfEpisode}.json`);
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toMatch(new RegExp(`/episodes/${idOfEpisode}\\.json\\?v=${v2Prefix}$`));

  const audioManifests = withPath("audio/manifest.json");
  expect(audioManifests).toHaveLength(1);
  expect(audioManifests[0]).toMatch(/\/audio\/manifest\.json\?m=\d+$/);

  expect(files.download).toHaveBeenCalled();
  for (const [url] of files.download.mock.calls) expect(url).not.toContain("?");
});
