import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

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

// `integration` 계층(PW-I1 · PW-I2, ADR-0157): 배경 미리 받기 창은 진행 중인 편 + 다음 1편이다. 새 사용자에게 창 밖의
// 원격 편은 본문만 받고 그림 · 음성은 받지 않는다(맵에서는 「준비 중」). 사용자가 그 편을 누르면 그때 받아 연다.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const episode = minimalEpisodeText("u04-x", {
  cover: { image_url: "content/images/u04-x/c.jpg" },
});
const content = {
  "manifest.json": manifestOf([{ id: "u04-x", order: 4, text: episode }]),
  "episodes/u04-x.json": episode,
};

// 내장 에피소드의 자산은 이미 받아 둔 것으로 둡니다 — 원격 에피소드 하나의 흐름을 봅니다.
const bundledPaths = bundledCatalogInput.manifest.episodes.flatMap((entry) =>
  episodeAssetPaths(bundledCatalogInput.episodes[entry.id]),
);

function fileModule() {
  const saved = new Set<string>(bundledPaths);
  const download = vi.fn((_url: string, path: string, callback: (p: unknown) => void) => {
    saved.add(path);
    callback({ status: "saved", bytes: "10" });
  });
  return {
    module: {
      download,
      fileUrl: (path: string) => (saved.has(path) ? `file:///files/${path}` : ""),
      remove: vi.fn(),
    },
    download,
  };
}

test("[PW-I1] 새 사용자: 창 밖 원격 편은 본문만 받고 그림은 받지 않아 「준비 중」으로 선다", async () => {
  const files = fileModule();
  const { urls, store } = await bootContentApp({ content, contentFiles: files.module });
  await settle();

  expect(urls.map(contentPathOf)).toContain("episodes/u04-x.json");
  expect(files.download).not.toHaveBeenCalledWith(
    `${contentBase}images/u04-x/c.jpg`,
    "images/u04-x/c.jpg",
    expect.any(Function),
  );
  expect(store.has(contentAssetsKey("u04-x"))).toBe(false);
  expect(screen.getByTestId("catalog-pending-u04-x")).toBeInTheDocument();
});

test("[PW-I2] 창 밖 편을 누르면 그 편을 받아 같은 실행 안에서 연다", async () => {
  const files = fileModule();
  const { store } = await bootContentApp({ content, contentFiles: files.module });
  await settle();

  await act(async () => {
    fireEvent.tap(screen.getByTestId("catalog-pending-u04-x"));
  });
  await settle();

  expect(files.download).toHaveBeenCalledWith(
    `${contentBase}images/u04-x/c.jpg`,
    "images/u04-x/c.jpg",
    expect.any(Function),
  );
  expect(store.has(contentAssetsKey("u04-x"))).toBe(true);
  expect(screen.getByTestId("catalog-section-u04-x")).toBeInTheDocument();
});
