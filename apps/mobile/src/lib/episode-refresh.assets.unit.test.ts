import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "./episode-bundled";
import type { AssetTarget } from "./download-policy";
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
import { BASE_MANIFEST_PATH } from "./content-manifest-path";

// 이 파일은 수준 1 경로(`manifest.json`) 하나로 고정합니다 — 수준별 고르기는 `episode-refresh.level.unit.test.ts`가 봅니다.
const LEVEL_1_PATHS = [BASE_MANIFEST_PATH];

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

// `assetPolicy`는 (id, target) 모양이 계약입니다 — 뼈대 타입이 옛 시그니처라 캐스트로 넘깁니다(런타임은 같은 함수).
const targetPolicy = (fn: (id: string, target: AssetTarget) => boolean) =>
  fn as unknown as (id: string) => boolean;

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
      manifestPaths: LEVEL_1_PATHS,
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
      manifestPaths: LEVEL_1_PATHS,
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
      manifestPaths: LEVEL_1_PATHS,
      assets: first.assets,
    });

    const second = recorder({}, [...bundledPaths, "images/u04-a/c.jpg"]);
    const ready: string[] = [];
    await refreshEpisodeCatalog({
      fetchText: second.fetchText,
      store,
      bundled: bundledCatalogInput,
      manifestPaths: LEVEL_1_PATHS,
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
      manifestPaths: LEVEL_1_PATHS,
      assets,
      onEpisodeReady: (id) => ready.push(id),
    });

    expect(ready).toEqual(["u04-a", "u05-b"]);
    expect(JSON.parse(data.get(contentAssetsKey("u04-a")) ?? "").missing).toEqual([
      "images/u04-a/c.jpg",
    ]);
  });

  // ⟨2026-11-03⟩ 「서버에 없음」 재확인(ADR-0095 D2) — 받기 차례 전체에서: 같은 매니페스트 · 하루 안이면 다시 묻지
  // 않고, 확인 시각이 없는 옛 표시(지금 기기들)면 다음 차례에 다시 받아 missing을 비웁니다.
  test("RA4b. 서버에 없던 자산이 나중에 올라오면 옛 표시는 다음 차례에 다시 받고, 새 표시는 하루 안에 다시 묻지 않는다", async () => {
    const answers: Record<string, DownloadResult> = {
      "images/u04-a/c.jpg": { status: "http", code: 404 },
    };
    const { fetchText, assets, log } = recorder(answers, bundledPaths);
    const { store, data } = fakeStore();
    const run = () =>
      refreshEpisodeCatalog({
        fetchText,
        store,
        bundled: bundledCatalogInput,
        manifestPaths: LEVEL_1_PATHS,
        assets,
      });
    const markerOf = () =>
      JSON.parse(data.get(contentAssetsKey("u04-a")) ?? "{}") as {
        missing?: string[];
        checkedAt?: number;
      };
    const asked = () => log.filter((line) => line === "asset images/u04-a/c.jpg").length;

    await run();
    expect(markerOf().missing).toEqual(["images/u04-a/c.jpg"]);
    expect(typeof markerOf().checkedAt).toBe("number");
    expect(asked()).toBe(1);

    delete answers["images/u04-a/c.jpg"];
    await run();
    expect(asked()).toBe(1);
    expect(markerOf().missing).toEqual(["images/u04-a/c.jpg"]);

    const { checkedAt: _dropped, ...legacy } = markerOf();
    data.set(contentAssetsKey("u04-a"), JSON.stringify(legacy));
    await run();
    expect(asked()).toBe(2);
    expect(markerOf().missing).toEqual([]);
  });

  // ⟨2026-11-04⟩ 받기 정책(ADR-0095 D5) — 정책이 막은 편은 본문만 받고 자산은 건너뛰며, 받기를 멈추지 않고 다음 편으로 갑니다.
  test("RA7. assetPolicy(id, target)이 편을 전부 막으면 자산을 받지 않고 deferred에 적으며, 다음 편은 끝까지 받는다", async () => {
    const { log, fetchText, assets } = recorder({}, bundledPaths);
    const { store, data } = fakeStore();
    const ready: string[] = [];
    const asked: string[] = [];

    const summary = await refreshEpisodeCatalog({
      fetchText,
      store,
      bundled: bundledCatalogInput,
      manifestPaths: LEVEL_1_PATHS,
      assets,
      assetPolicy: targetPolicy((id, target) => {
        asked.push(`${id}:${target?.kind}`);
        return id !== "u04-a";
      }),
      onEpisodeReady: (id) => ready.push(id),
    });

    expect(log).toEqual([
      "fetch manifest.json",
      "fetch episodes/u04-a.json",
      "fetch episodes/u05-b.json",
      "asset images/u05-b/c.jpg",
    ]);
    expect(asked).toEqual(expect.arrayContaining(["u04-a:common", "u05-b:common"]));
    expect(summary.deferred).toEqual(["u04-a"]);
    expect(ready).toEqual(["u05-b"]);
    expect(data.has(contentEpisodeKey("u04-a"))).toBe(true);
    expect(data.has(contentAssetsKey("u04-a"))).toBe(false);
  });

  test("RA8. assetPolicy가 없거나 다 허락하면 deferred는 비고 지금처럼 받는다", async () => {
    const { fetchText, assets } = recorder({}, bundledPaths);
    const { store } = fakeStore();
    const summary = await refreshEpisodeCatalog({
      fetchText,
      store,
      bundled: bundledCatalogInput,
      manifestPaths: LEVEL_1_PATHS,
      assets,
      assetPolicy: () => true,
    });
    expect(summary.deferred).toEqual([]);
    expect(summary.fetched).toEqual(["u04-a", "u05-b"]);
  });

  test("RA5. 내장 에피소드의 자산도 받는다(준비 알림은 없다 — 내장은 늘 열려 있음)", async () => {
    const { log, fetchText, assets } = recorder();
    const { store } = fakeStore();
    const ready: string[] = [];

    await refreshEpisodeCatalog({
      fetchText,
      store,
      bundled: bundledCatalogInput,
      manifestPaths: LEVEL_1_PATHS,
      assets,
      onEpisodeReady: (id) => ready.push(id),
    });

    expect(log).toContain(`asset ${bundledPaths[0]}`);
    expect(ready).toEqual(["u04-a", "u05-b"]);
  });

  test("RA6. 자산 대역이 없으면 지금처럼 본문만 받는다(자산 받기 · 준비 알림 없음)", async () => {
    const { log, fetchText } = recorder();
    const { store, data } = fakeStore();

    const summary = await refreshEpisodeCatalog({
      fetchText,
      store,
      bundled: bundledCatalogInput,
      manifestPaths: LEVEL_1_PATHS,
    });

    expect(log.filter((line) => line.startsWith("asset"))).toEqual([]);
    expect(summary.fetched).toEqual(["u04-a", "u05-b"]);
    expect(data.has(contentAssetsKey("u04-a"))).toBe(false);
  });
});
