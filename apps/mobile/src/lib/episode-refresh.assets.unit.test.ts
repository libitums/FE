import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "./episode-bundled";
import { contentAssetsKey, type AssetDeps, type DownloadResult } from "./episode-asset-sync";
import { episodeAssetPaths } from "./episode-assets";
import { contentEpisodeKey } from "./episode-cache";
import { refreshEpisodeCatalog } from "./episode-refresh";
import {
  fakeFetch,
  fakeStore,
  manifestText,
  minimalEpisode,
  ok,
  remote,
  type Remote,
  type Reply,
} from "./episode-refresh.test-support";

// `unit` 계층: 갱신이 에피소드를 **하나씩**(본문 → 그 에피소드의 자산) 받고, 다 받은 에피소드만 준비됐다고
// 알리는지 봅니다. 전송 · 저장소 · 파일은 대역입니다.

function withAssets(id: string, order: number, assets: Record<string, string>): Remote {
  const wire = minimalEpisode(id) as Record<string, unknown>;
  return remote(id, order, {}, JSON.stringify({ ...wire, cover: assets }));
}

const A = withAssets("u04-a", 4, {
  image_url: "content/images/u04-a/c.jpg",
  audio_url: "u04-a/l1",
});
const B = withAssets("u05-b", 5, { image_url: "content/images/u05-b/c.jpg" });

const replyFor = (remotes: Remote[]): Record<string, Reply> => ({
  "manifest.json": ok(manifestText(remotes)),
  ...Object.fromEntries(remotes.map((r) => [r.entry.url as string, ok(r.text)])),
});

/** 호출 순서를 하나의 줄에 적는 대역입니다 — 본문 받기(fetch)와 자산 받기(asset)가 섞여 기록됩니다. */
function recorder(answers: Record<string, DownloadResult> = {}, present: string[] = []) {
  const log: string[] = [];
  const saved = new Set(present);
  const replies = replyFor([A, B]);
  const fetch = fakeFetch(replies);
  const fetchText = async (relative: string) => {
    log.push(`fetch ${relative}`);
    return fetch.fetchText(relative);
  };
  const assets: AssetDeps = {
    has: (path) => saved.has(path),
    download: async (_url, path) => {
      log.push(`asset ${path}`);
      const answer = answers[path] ?? { status: "saved" };
      if (answer.status === "saved") saved.add(path);
      return answer;
    },
    remoteUrlOf: (path) => `https://cdn.example/content/${path}`,
  };
  return { log, fetchText, assets };
}

const bundledPaths = bundledCatalogInput.manifest.episodes.flatMap((entry) =>
  episodeAssetPaths(bundledCatalogInput.episodes[entry.id]),
);

describe("refreshEpisodeCatalog — 자산", () => {
  test("RA1. 새 에피소드를 하나씩: A 본문 → A 자산 → B 본문 → B 자산, 다 받은 것마다 준비 알림 한 번", async () => {
    // 내장 에피소드의 자산은 이미 받아 둔 것으로 둡니다 — 이 테스트는 원격 둘의 순서를 봅니다.
    const { log, fetchText, assets } = recorder({}, bundledPaths);
    const { store, data } = fakeStore();
    const ready: string[] = [];

    const summary = await refreshEpisodeCatalog({
      fetchText,
      store,
      bundled: bundledCatalogInput,
      assets,
      onEpisodeReady: (id) => ready.push(id),
    });

    expect(log).toEqual([
      "fetch manifest.json",
      "fetch episodes/u04-a.json",
      "asset images/u04-a/c.jpg",
      "asset audio/u04-a/l1.m4a",
      "fetch episodes/u05-b.json",
      "asset images/u05-b/c.jpg",
    ]);
    expect(ready).toEqual(["u04-a", "u05-b"]);
    expect(summary.fetched).toEqual(["u04-a", "u05-b"]);
    expect(JSON.parse(data.get(contentAssetsKey("u04-a")) ?? "")).toEqual({
      sha256: A.entry.sha256,
      missing: [],
    });
  });

  test("RA2. 자산 하나가 연결 실패면 그 에피소드는 준비되지 않고 다음 에피소드로 넘어가지 않는다 — 본문은 남는다", async () => {
    const { log, fetchText, assets } = recorder(
      { "audio/u04-a/l1.m4a": { status: "network" } },
      bundledPaths,
    );
    const { store, data } = fakeStore();
    const ready: string[] = [];

    await refreshEpisodeCatalog({
      fetchText,
      store,
      bundled: bundledCatalogInput,
      assets,
      onEpisodeReady: (id) => ready.push(id),
    });

    expect(ready).toEqual([]);
    expect(log).not.toContain("fetch episodes/u05-b.json");
    expect(data.has(contentEpisodeKey("u04-a"))).toBe(true);
    expect(data.has(contentAssetsKey("u04-a"))).toBe(false);
  });

  test("RA3. 다음 기회에는 본문을 다시 받지 않고 남은 자산부터 이어 받는다", async () => {
    const { store, data } = fakeStore();
    const first = recorder({ "audio/u04-a/l1.m4a": { status: "network" } }, bundledPaths);
    await refreshEpisodeCatalog({
      fetchText: first.fetchText,
      store,
      bundled: bundledCatalogInput,
      assets: first.assets,
    });

    const second = recorder({}, [...bundledPaths, "images/u04-a/c.jpg"]);
    const ready: string[] = [];
    await refreshEpisodeCatalog({
      fetchText: second.fetchText,
      store,
      bundled: bundledCatalogInput,
      assets: second.assets,
      onEpisodeReady: (id) => ready.push(id),
    });

    expect(second.log.slice(0, 2)).toEqual(["fetch manifest.json", "asset audio/u04-a/l1.m4a"]);
    expect(ready).toEqual(["u04-a", "u05-b"]);
    expect(data.has(contentAssetsKey("u04-a"))).toBe(true);
  });

  test("RA4. 404 자산은 서버에 없는 것으로 적고 준비를 막지 않는다", async () => {
    const { fetchText, assets } = recorder(
      { "images/u04-a/c.jpg": { status: "http", code: 404 } },
      bundledPaths,
    );
    const { store, data } = fakeStore();
    const ready: string[] = [];

    await refreshEpisodeCatalog({
      fetchText,
      store,
      bundled: bundledCatalogInput,
      assets,
      onEpisodeReady: (id) => ready.push(id),
    });

    expect(ready).toEqual(["u04-a", "u05-b"]);
    expect(JSON.parse(data.get(contentAssetsKey("u04-a")) ?? "").missing).toEqual([
      "images/u04-a/c.jpg",
    ]);
  });

  test("RA5. 내장 에피소드의 자산도 받는다(준비 알림은 없다 — 내장은 늘 열려 있음)", async () => {
    const { log, fetchText, assets } = recorder();
    const { store } = fakeStore();
    const ready: string[] = [];

    await refreshEpisodeCatalog({
      fetchText,
      store,
      bundled: bundledCatalogInput,
      assets,
      onEpisodeReady: (id) => ready.push(id),
    });

    expect(log).toContain(`asset ${bundledPaths[0]}`);
    expect(ready).toEqual(["u04-a", "u05-b"]);
  });

  test("RA6. 자산 대역이 없으면 지금처럼 본문만 받는다(자산 받기 · 준비 알림 없음)", async () => {
    const { log, fetchText } = recorder();
    const { store, data } = fakeStore();

    const summary = await refreshEpisodeCatalog({ fetchText, store, bundled: bundledCatalogInput });

    expect(log.filter((line) => line.startsWith("asset"))).toEqual([]);
    expect(summary.fetched).toEqual(["u04-a", "u05-b"]);
    expect(data.has(contentAssetsKey("u04-a"))).toBe(false);
  });
});
