import { describe, expect, test } from "vitest";

import { BASE_MANIFEST_PATH } from "./content-manifest-path";
import type { AssetTarget } from "./download-policy";
import { contentAssetsKey, type AssetDeps } from "./episode-asset-sync";
import { contentCommonAssetsKey, contentUnitAssetsKey } from "./episode-asset-groups-sync";
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
import { TUTORIAL_EPISODE_ID } from "./tutorial-episode";
import { observerLog } from "./episode-update.test-support";

// `unit` 계층: 한 편 안에서 공통 → 유닛 순으로 받고 유닛마다 받음 표시가 서는지, 유닛 하나만 막혔을 때와
// 진행 수가 겹친 경로에서 넘치지 않는지 봅니다. 전송 · 저장소 · 파일은 대역입니다.

const LEVEL_1_PATHS = [BASE_MANIFEST_PATH];

const COVER = "images/u06-c/cover.jpg";
const S1_ONLY = "images/u06-c/s1.jpg";
const RP_ONLY = "audio/u06-c/rp.m4a";
const SHARED = "images/u06-c/shared.jpg";

// 스텝 S1 · RP 두 유닛이 SHARED를 함께 쓰는 편입니다 — 스텝 바깥(표지)은 공통입니다.
function twoUnitEpisode(id: string, order: number): Remote {
  const wire = minimalEpisode(id) as Record<string, unknown>;
  const [first, second] = wire.steps as Record<string, unknown>[];
  const steps = [
    {
      ...first,
      image_url: "content/images/u06-c/s1.jpg",
      extra: { image_url: "content/images/u06-c/shared.jpg" },
    },
    { ...second, audio_url: "u06-c/rp", extra: { image_url: "content/images/u06-c/shared.jpg" } },
  ];
  const cover = { image_url: "content/images/u06-c/cover.jpg" };
  // version을 내장보다 높여 내장 편(튜토리얼)도 바뀐 편으로 받게 합니다.
  return remote(id, order, { version: "2099-01-01.1" }, JSON.stringify({ ...wire, cover, steps }));
}

function coverOnlyEpisode(id: string, order: number): Remote {
  const wire = minimalEpisode(id) as Record<string, unknown>;
  return remote(
    id,
    order,
    {},
    JSON.stringify({ ...wire, cover: { image_url: `content/images/${id}/c.jpg` } }),
  );
}

const C = twoUnitEpisode("u06-c", 4);
const D = coverOnlyEpisode("u07-d", 5);

const bundledPaths = bundledCatalogInput.manifest.episodes.flatMap((entry) =>
  episodeAssetPaths(bundledCatalogInput.episodes[entry.id]),
);

function setup(onAsset: (path: string) => void = () => undefined, remotes: Remote[] = [C, D]) {
  const replies = {
    "manifest.json": ok(manifestText(remotes)),
    ...Object.fromEntries(remotes.map((r) => [r.entry.url as string, ok(r.text)])),
  };
  const { fetchText } = fakeFetch(replies);
  const saved = new Set(bundledPaths);
  const log: string[] = [];
  const assets: AssetDeps = {
    has: (path) => saved.has(path),
    download: async (_url, path) => {
      log.push(path);
      onAsset(path);
      saved.add(path);
      return { status: "saved" };
    },
    remoteUrlOf: (path) => `https://cdn.example/content/${path}`,
  };
  return { fetchText, assets, log };
}

// `assetPolicy`는 (id, target) 모양이 계약입니다 — 뼈대 타입이 옛 시그니처라 캐스트로 넘깁니다.
const targetPolicy = (fn: (id: string, target: AssetTarget) => boolean) =>
  fn as unknown as (id: string) => boolean;

describe("refreshEpisodeCatalog — 유닛 단위 받기", () => {
  test("[U-RA9] 한 편 안에서 공통 → S1 → RP 순으로 받고, 유닛 표시가 다음 유닛을 받기 전에 선다", async () => {
    const { store, data } = fakeStore();
    let s1MarkedBeforeRp: boolean | null = null;
    const { fetchText, assets, log } = setup((path) => {
      if (path === RP_ONLY) s1MarkedBeforeRp = data.has(contentUnitAssetsKey("u06-c", "S1"));
    });

    await refreshEpisodeCatalog({
      fetchText,
      store,
      bundled: bundledCatalogInput,
      manifestPaths: LEVEL_1_PATHS,
      assets,
    });

    const own = log.filter((path) => path.includes("u06-c"));
    expect(own[0]).toBe(COVER);
    expect(own.indexOf(S1_ONLY)).toBeGreaterThan(0);
    expect(own.indexOf(S1_ONLY)).toBeLessThan(own.indexOf(RP_ONLY));
    expect(own.filter((path) => path === SHARED)).toHaveLength(1);
    expect(s1MarkedBeforeRp).toBe(true);
    expect(data.has(contentCommonAssetsKey("u06-c"))).toBe(true);
    expect(data.has(contentUnitAssetsKey("u06-c", "RP"))).toBe(true);
    expect(data.has(contentAssetsKey("u06-c"))).toBe(true);
  });

  test("[U-RA10] 유닛 하나만 막히면 공통 · 다른 유닛은 받고 그 편은 deferred(준비 알림 없음), 다음 편은 끝까지 받는다", async () => {
    const { store, data } = fakeStore();
    const ready: string[] = [];
    const { fetchText, assets, log } = setup();

    const summary = await refreshEpisodeCatalog({
      fetchText,
      store,
      bundled: bundledCatalogInput,
      manifestPaths: LEVEL_1_PATHS,
      assets,
      assetPolicy: targetPolicy(
        (id, target) => !(id === "u06-c" && target.kind === "unit" && target.unitKey === "RP"),
      ),
      onEpisodeReady: (id) => ready.push(id),
    });

    expect(log).toContain(COVER);
    expect(log).toContain(S1_ONLY);
    expect(log).not.toContain(RP_ONLY);
    expect(data.has(contentCommonAssetsKey("u06-c"))).toBe(true);
    expect(data.has(contentUnitAssetsKey("u06-c", "S1"))).toBe(true);
    expect(data.has(contentUnitAssetsKey("u06-c", "RP"))).toBe(false);
    expect(data.has(contentAssetsKey("u06-c"))).toBe(false);
    expect(summary.deferred).toEqual(["u06-c"]);
    expect(ready).toEqual(["u07-d"]);
    expect(data.has(contentAssetsKey("u07-d"))).toBe(true);
  });

  test("[U-RA10] 스플래시가 기다리는 편(튜토리얼)도 유닛 하나가 막히면 observer.ready 없이 deferred다", async () => {
    const { store } = fakeStore();
    const watch = observerLog();
    const tutorial = twoUnitEpisode(TUTORIAL_EPISODE_ID, 0);
    const { fetchText, assets } = setup(() => undefined, [tutorial]);

    const summary = await refreshEpisodeCatalog({
      fetchText,
      store,
      bundled: bundledCatalogInput,
      manifestPaths: LEVEL_1_PATHS,
      assets,
      observer: watch.observer,
      assetPolicy: targetPolicy(
        (_id, target) => !(target.kind === "unit" && target.unitKey === "RP"),
      ),
    });

    expect(watch.events[0]).toBe(`planned:${TUTORIAL_EPISODE_ID}`);
    expect(watch.events).not.toContain(`ready:${TUTORIAL_EPISODE_ID}`);
    expect(summary.deferred).toEqual([TUTORIAL_EPISODE_ID]);
  });

  test("[U-RA11] observer.progressed — 겹친 경로가 있어도 done은 total(고유 경로 + 1) 이하이고 줄지 않으며 마지막은 total/total이다", async () => {
    const { store } = fakeStore();
    const watch = observerLog();
    // 관찰자는 스플래시가 기다리는 편(튜토리얼)만 지켜봅니다 — 두 유닛 편을 튜토리얼 id로 받습니다.
    const tutorial = twoUnitEpisode(TUTORIAL_EPISODE_ID, 0);
    const { fetchText, assets } = setup(() => undefined, [tutorial]);

    await refreshEpisodeCatalog({
      fetchText,
      store,
      bundled: bundledCatalogInput,
      manifestPaths: LEVEL_1_PATHS,
      assets,
      observer: watch.observer,
    });

    const own = watch.events
      .filter((event) => event.startsWith(`progressed:${TUTORIAL_EPISODE_ID}:`))
      .map((event) => event.split(":")[2]?.split("/").map(Number) ?? []);
    const uniquePaths = new Set([COVER, S1_ONLY, RP_ONLY, SHARED]).size;

    expect(own.length).toBeGreaterThan(1);
    expect(own.every(([, total]) => total === uniquePaths + 1)).toBe(true);
    expect(own.every(([done, total]) => (done ?? 0) > 0 && (done ?? 0) <= (total ?? 0))).toBe(true);
    const dones = own.map(([done]) => done ?? 0);
    expect(dones).toEqual([...dones].sort((a, b) => a - b));
    expect(own[own.length - 1]).toEqual([uniquePaths + 1, uniquePaths + 1]);
  });
});
