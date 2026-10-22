import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, screen } from "@lynx-js/react/testing-library";

import {
  bootContentApp,
  contentBase,
  manifestOf,
  minimalEpisodeText,
  settle,
} from "./test-helpers/episode-content-boot";
import { contentPathOf } from "./test-helpers/content-requests";
import { contentAssetsKey } from "../lib/episode-asset-sync";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { episodeAssetPaths } from "../lib/episode-assets";

// `integration` 계층: 받기가 실행 시작과 호스트 신호(`contentSyncOpportunity`)마다 돌고, 원격 에피소드가 자산까지
// 갖춘 뒤에만 맵에 열리는지 봅니다(ADR-0071). 갱신 · 원격 · 캐시 · 자산 모듈은 실물이고 대역은 경계뿐입니다.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const syncEvent = "contentSyncOpportunity";
const emitSync = () =>
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(syncEvent, []);
  });

const episode = minimalEpisodeText("u04-x", {
  cover: { image_url: "content/images/u04-x/c.jpg" },
});
const content = {
  "manifest.json": manifestOf([{ id: "u04-x", order: 4, text: episode }]),
  "episodes/u04-x.json": episode,
};
const manifestCount = (urls: readonly string[]) =>
  urls.filter((url) => contentPathOf(url) === "manifest.json").length;

// 내장 에피소드의 자산은 이미 받아 둔 것으로 둡니다 — 원격 에피소드 하나의 흐름을 봅니다.
const bundledPaths = bundledCatalogInput.manifest.episodes.flatMap((entry) =>
  episodeAssetPaths(bundledCatalogInput.episodes[entry.id]),
);

function fileModule(options: { hold?: boolean } = {}) {
  const saved = new Set<string>(bundledPaths);
  const held: (() => void)[] = [];
  const download = vi.fn((_url: string, path: string, callback: (p: unknown) => void) => {
    const finish = () => {
      saved.add(path);
      callback({ status: "saved", bytes: "10" });
    };
    if (options.hold === true) held.push(finish);
    else finish();
  });
  return {
    module: {
      download,
      fileUrl: (path: string) => (saved.has(path) ? `file:///files/${path}` : ""),
      remove: vi.fn(),
    },
    download,
    releaseAll: () => held.splice(0).forEach((finish) => finish()),
  };
}

test("[I5] 실행 시작에 한 번, 호스트 신호마다 한 번 더 받기가 돈다", async () => {
  const { urls } = await bootContentApp({ content });
  await vi.waitFor(() => expect(manifestCount(urls)).toBe(1));
  await settle();

  await emitSync();
  await settle();
  expect(manifestCount(urls)).toBe(2);

  await emitSync();
  await settle();
  expect(manifestCount(urls)).toBe(3);
});

test("[I6] 원격 에피소드는 자산을 다 받기 전에는 준비 중이고, 다 받은 순간 같은 실행 안에서 열린다", async () => {
  const files = fileModule({ hold: true });
  const { store } = await bootContentApp({ content, contentFiles: files.module });
  await vi.waitFor(() => expect(files.download).toHaveBeenCalledTimes(1));
  await settle();

  expect(files.download).toHaveBeenCalledWith(
    `${contentBase}images/u04-x/c.jpg`,
    "images/u04-x/c.jpg",
    expect.any(Function),
  );
  expect(screen.queryByTestId("catalog-section-u04-x")).toBeNull();
  expect(store.has(contentAssetsKey("u04-x"))).toBe(false);

  await act(async () => {
    files.releaseAll();
  });
  await settle();

  expect(store.has(contentAssetsKey("u04-x"))).toBe(true);
  expect(screen.getByTestId("catalog-section-u04-x")).toBeInTheDocument();
});

test("[I7] 받는 도중에 신호가 여러 번 와도 끝난 뒤 한 번만 더 돈다", async () => {
  const files = fileModule({ hold: true });
  const { urls } = await bootContentApp({ content, contentFiles: files.module });
  await vi.waitFor(() => expect(files.download).toHaveBeenCalledTimes(1));

  await emitSync();
  await emitSync();
  await emitSync();
  await settle();
  expect(manifestCount(urls)).toBe(1);

  await act(async () => {
    files.releaseAll();
  });
  await settle();
  expect(manifestCount(urls)).toBe(2);
});
