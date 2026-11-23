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
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";

// `integration` 계층(PW-I1 ~ PW-I3, ADR-0157 · ADR-0165): 배경 미리 받기 창은 진행 중인 편 + 다음 1편이다. 창 밖의 원격 편도
// 본문이 맞으면 보통 편으로 선다(진도로 잠기면 잠긴 편 그대로, 「준비 중」이 아니다). 사용자 차례가 된 편은 받는 동안 표지에
// 고리와 「Getting ready · n%」, 저절로 받지 않는 연결(요금 연결)에서는 「Tap to download」가 서고 누르면 받기 시트가 오른다.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const imagePath = "images/u04-x/c.jpg";
const episode = minimalEpisodeText("u04-x", { cover: { image_url: `content/${imagePath}` } });
const content = {
  "manifest.json": manifestOf([{ id: "u04-x", order: 4, text: episode }]),
  "episodes/u04-x.json": episode,
};
const titleOf = () => screen.getByTestId("journey-special-unit-title-catalog-cover-u04-x");

// 내장 에피소드의 자산은 이미 받아 둔 것으로 둡니다 — 원격 에피소드 하나의 흐름을 봅니다.
const bundledPaths = bundledCatalogInput.manifest.episodes.flatMap((entry) =>
  episodeAssetPaths(bundledCatalogInput.episodes[entry.id]),
);

// 내장 넷(u00 ~ u03)을 모두 끝낸 진행 — u04-x가 사용자 차례가 됩니다.
const bundledSections = catalogMapSectionsOf(
  buildEpisodeCatalog({ bundled: bundledCatalogInput, cache: { manifest: null, episodes: {} } }),
);
const bundledDone = {
  catalogProgress: Object.fromEntries(
    bundledSections.map((section) => [
      section.episodeId,
      section.kind === "catalog-ready" ? [...section.completionKeys] : ["RP"],
    ]),
  ),
};

/** `hold`면 u04-x 그림 받기를 끝내지 않고 붙들어 둡니다 — `release()`로 끝냅니다. */
function fileModule(options: { readonly hold?: boolean } = {}) {
  const saved = new Set<string>(bundledPaths);
  const held: (() => void)[] = [];
  const download = vi.fn((_url: string, path: string, callback: (p: unknown) => void) => {
    const finish = () => {
      saved.add(path);
      callback({ status: "saved", bytes: "10" });
    };
    if (options.hold === true && path === imagePath) held.push(finish);
    else finish();
  });
  return {
    module: {
      download,
      fileUrl: (path: string) => (saved.has(path) ? `file:///files/${path}` : ""),
      remove: vi.fn(),
    },
    download,
    release: () => held.splice(0).forEach((finish) => finish()),
  };
}

test("[PW-I1] 새 사용자: 창 밖 원격 편은 그림을 받지 않아도 「준비 중」이 아니라 진도로 잠긴 보통 편으로 선다", async () => {
  const files = fileModule();
  const { urls, store } = await bootContentApp({ content, contentFiles: files.module });
  await settle();

  expect(urls.map(contentPathOf)).toContain("episodes/u04-x.json");
  expect(files.download).not.toHaveBeenCalledWith(
    `${contentBase}${imagePath}`,
    imagePath,
    expect.any(Function),
  );
  expect(store.has(contentAssetsKey("u04-x"))).toBe(false);
  expect(screen.queryByTestId("catalog-pending-u04-x")).toBeNull();
  expect(screen.getByTestId("catalog-section-u04-x")).toBeInTheDocument();
  // 잠긴 편에는 받기 표시가 서지 않습니다.
  expect(titleOf()).toHaveTextContent("Intro");
  expect(screen.queryByTestId("catalog-cover-ring-u04-x")).toBeNull();
});

// 서버 진행을 불러오기 전이라(이 대역의 RPC는 null) 창은 새 사용자 창에 머뭅니다 — 받을 차례는 허락 목록으로 세웁니다.
// 창이 「준비 중」 편까지 세는 것(ADR-0157 D1)은 unit CD9가 봅니다.
test("[PW-I2] 차례가 된 편을 받는 동안 표지에 고리와 「Getting ready · n%」가 서고, 다 받으면 「Intro」로 돌아온다", async () => {
  const files = fileModule({ hold: true });
  const { store } = await bootContentApp({
    content,
    contentFiles: files.module,
    progressSeed: bundledDone,
    allowEpisodes: ["u04-x"],
  });
  await settle();

  expect(files.download).toHaveBeenCalledWith(
    `${contentBase}${imagePath}`,
    imagePath,
    expect.any(Function),
  );
  expect(titleOf()).toHaveTextContent(/^Getting ready · \d+%$/);
  expect(screen.getByTestId("catalog-cover-ring-u04-x")).toBeInTheDocument();

  await act(async () => {
    files.release();
  });
  await settle();

  expect(store.has(contentAssetsKey("u04-x"))).toBe(true);
  expect(titleOf()).toHaveTextContent("Intro");
  expect(screen.queryByTestId("catalog-cover-ring-u04-x")).toBeNull();
});

test("[PW-I3] 요금 연결에서는 차례가 된 편을 저절로 받지 않고 「Tap to download」, 누르면 받기 시트가 오른다", async () => {
  const files = fileModule();
  await bootContentApp({
    content,
    contentFiles: files.module,
    progressSeed: bundledDone,
    network: "cellular:metered",
  });
  await settle();

  expect(files.download).not.toHaveBeenCalledWith(
    `${contentBase}${imagePath}`,
    imagePath,
    expect.any(Function),
  );
  expect(titleOf()).toHaveTextContent("Tap to download");

  await act(async () => {
    fireEvent.tap(screen.getByTestId("ui-lynx-special-unit-catalog-cover-u04-x"));
  });
  await settle();

  expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toBeInTheDocument();
});
