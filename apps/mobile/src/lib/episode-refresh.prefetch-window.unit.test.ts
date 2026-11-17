import { describe, expect, test } from "vitest";

import { BASE_MANIFEST_PATH } from "./content-manifest-path";
import type { AssetDecision, AssetTarget } from "./download-policy";
import { contentAssetsKey, type AssetDeps } from "./episode-asset-sync";
import { episodeAssetPaths } from "./episode-assets";
import { bundledCatalogInput } from "./episode-bundled";
import { refreshEpisodeCatalog } from "./episode-refresh";
import {
  fakeFetch,
  fakeStore,
  manifestText,
  minimalEpisode,
  ok,
  remote,
  type Remote,
} from "./episode-refresh.test-support";

// `unit` 계층(PR1 ~ PR3, ADR-0157): 받기 정책이 창 밖이라 `skip`한 편은 본문은 받되 그림 · 음성은 받지 않고
// `skipped`로 남는다 — `deferred`가 아니므로 연결 재확인(60초)을 깨우지 않는다. 이미 받아 둔 편은 그대로 둔다.

function coverEpisode(id: string, order: number): Remote {
  const wire = minimalEpisode(id) as Record<string, unknown>;
  return remote(
    id,
    order,
    {},
    JSON.stringify({ ...wire, cover: { image_url: `content/images/${id}/c.jpg` } }),
  );
}

const A = coverEpisode("u06-a", 4);
const B = coverEpisode("u07-b", 5);
const C = coverEpisode("u08-c", 6);

const bundledPaths = bundledCatalogInput.manifest.episodes.flatMap((entry) =>
  episodeAssetPaths(bundledCatalogInput.episodes[entry.id]),
);

function setup(already: readonly string[] = []) {
  const remotes = [A, B, C];
  const replies = {
    "manifest.json": ok(manifestText(remotes)),
    ...Object.fromEntries(remotes.map((r) => [r.entry.url as string, ok(r.text)])),
  };
  const { fetchText } = fakeFetch(replies);
  const saved = new Set([...bundledPaths, ...already]);
  const log: string[] = [];
  const assets: AssetDeps = {
    has: (path) => saved.has(path),
    download: async (_url, path) => {
      log.push(path);
      saved.add(path);
      return { status: "saved" };
    },
    remoteUrlOf: (path) => `https://cdn.example/content/${path}`,
  };
  return { fetchText, assets, log };
}

const windowPolicy =
  (inside: readonly string[]) =>
  (id: string, _target: AssetTarget): AssetDecision =>
    inside.includes(id) ? "allow" : "skip";

describe("refreshEpisodeCatalog — 배경 미리 받기 창", () => {
  test("[PR1] 창 밖 편은 본문만 받고 그림은 받지 않으며 skipped — deferred는 비어 재확인을 깨우지 않는다", async () => {
    const { store, data } = fakeStore();
    const { fetchText, assets, log } = setup();
    const summary = await refreshEpisodeCatalog({
      fetchText,
      store,
      bundled: bundledCatalogInput,
      manifestPaths: [BASE_MANIFEST_PATH],
      assets,
      assetPolicy: windowPolicy(["u06-a"]),
    });
    expect(summary.fetched).toEqual(expect.arrayContaining(["u06-a", "u07-b", "u08-c"]));
    expect(log).toContain("images/u06-a/c.jpg");
    expect(log).not.toContain("images/u07-b/c.jpg");
    expect(log).not.toContain("images/u08-c/c.jpg");
    expect(summary.skipped).toEqual(["u07-b", "u08-c"]);
    expect(summary.deferred).toEqual([]);
    expect(data.has(contentAssetsKey("u06-a"))).toBe(true);
    expect(data.has(contentAssetsKey("u07-b"))).toBe(false);
  });

  test("[PR2] 창이 밀리면(다음 차례) 새로 창에 든 편의 그림을 받는다", async () => {
    const { store } = fakeStore();
    const { fetchText, assets, log } = setup();
    const base = {
      fetchText,
      store,
      bundled: bundledCatalogInput,
      manifestPaths: [BASE_MANIFEST_PATH],
      assets,
    };
    await refreshEpisodeCatalog({ ...base, assetPolicy: windowPolicy(["u06-a"]) });
    const second = await refreshEpisodeCatalog({ ...base, assetPolicy: windowPolicy(["u07-b"]) });
    expect(log).toContain("images/u07-b/c.jpg");
    expect(log).not.toContain("images/u08-c/c.jpg");
    expect(second.skipped).toContain("u08-c");
  });

  test("[PR3] 이미 다 받아 둔 편은 창 밖이어도 skipped가 아니다(지우지도 다시 받지도 않음)", async () => {
    const { store, data } = fakeStore();
    const { fetchText, assets, log } = setup(["images/u07-b/c.jpg"]);
    const summary = await refreshEpisodeCatalog({
      fetchText,
      store,
      bundled: bundledCatalogInput,
      manifestPaths: [BASE_MANIFEST_PATH],
      assets,
      assetPolicy: windowPolicy(["u06-a"]),
    });
    expect(log).not.toContain("images/u07-b/c.jpg");
    expect(summary.skipped).toEqual(["u08-c"]);
    expect(data.has(contentAssetsKey("u07-b"))).toBe(true);
  });
});
