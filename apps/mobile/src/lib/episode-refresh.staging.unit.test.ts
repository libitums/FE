import { describe, expect, test } from "vitest";

import { contentAssetsKey, type AssetDeps, type DownloadResult } from "./episode-asset-sync";
import { bundledCatalogInput } from "./episode-bundled";
import {
  CONTENT_MANIFEST_KEY,
  CONTENT_RECEIVED_MANIFEST_KEY,
  contentEpisodeKey,
  type ContentStore,
} from "./episode-cache";
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
import {
  contentStagedAssetsKey,
  contentStagedEntryKey,
  contentStagedEpisodeKey,
  promoteStagedEpisodes,
} from "./episode-staging";
import {
  activeBytes,
  activeSeed,
  bundledPaths,
  catalogOf,
  entryOf,
  flush,
  manifestEntryIn,
  markerText,
  observerLog,
  pathsOf,
  recorder,
  repliesFor,
  stagedKeys,
  versioned,
} from "./episode-update.test-support";

// `unit` 계층: 지금 열리는 에피소드의 새 버전은 활성 셋을 건드리지 않고 스테이징에 받고, 새 에피소드는 지금처럼
// 활성에 받는지 봅니다. 전송 · 저장소 · 파일은 대역이고 저장소 상태는 값으로 봅니다.

const V1 = versioned("u04-x", 4, "2026-10-13.1", "옛 제목");
const V2 = versioned("u04-x", 4, "2026-10-14.1", "새 제목");
const ID = "u04-x";

function setup(remotes = [V2], answers: Record<string, DownloadResult> = {}) {
  const rec = recorder(remotes, answers);
  const { store, data, sets, removes } = fakeStore(activeSeed(V1));
  const watch = observerLog();
  const ready: string[] = [];
  const run = () =>
    refreshEpisodeCatalog({
      fetchText: rec.fetchText,
      store,
      bundled: bundledCatalogInput,
      assets: rec.assets,
      onEpisodeReady: (id) => ready.push(id),
      observer: watch.observer,
    });
  return { rec, store, data, sets, removes, watch, ready, run };
}

describe("refreshEpisodeCatalog — 바뀐 에피소드는 스테이징", () => {
  test("RS1. 활성 본문 · 표시 · 항목은 옛 버전 그대로이고 받은 키와 스테이징 셋에 새 버전이 있으며 준비 알림이 없다", async () => {
    const { store, data, ready, run } = setup();
    const before = activeBytes(data, ID);

    const summary = await run();

    expect(summary.fetched).toEqual([ID]);
    expect(data.get(contentEpisodeKey(ID))).toBe(V1.text);
    expect(data.get(contentAssetsKey(ID))).toBe(markerText(V1));
    expect(manifestEntryIn(data.get(CONTENT_MANIFEST_KEY), ID)).toEqual(entryOf(V1));
    expect(activeBytes(data, ID).slice(1)).toEqual(before.slice(1));
    expect(data.get(CONTENT_RECEIVED_MANIFEST_KEY)).toBe(manifestText([V2]));
    expect(data.get(contentStagedEpisodeKey(ID))).toBe(V2.text);
    expect(JSON.parse(data.get(contentStagedEntryKey(ID)) ?? "null")).toEqual(V2.entry);
    expect(data.get(contentStagedAssetsKey(ID))).toBe(markerText(V2));
    expect(ready).toEqual([]);
    expect(catalogOf(store).find((entry) => entry.id === ID)).toMatchObject({
      status: "ready",
      version: "2026-10-13.1",
    });
  });

  test("RS2. 관찰자는 planned 한 번 → 줄지 않는 progressed → ready 순으로 받는다", async () => {
    const { watch, run } = setup();

    await run();

    expect(watch.events).toEqual([
      "planned:u04-x",
      "progressed:u04-x:1/3",
      "progressed:u04-x:2/3",
      "progressed:u04-x:3/3",
      "ready:u04-x",
    ]);
  });

  test("RS3. 받은 뒤 교체하면 카탈로그가 새 버전을 연다", async () => {
    const { store, run } = setup();
    await run();

    expect(promoteStagedEpisodes(store)).toEqual({ promoted: [ID], persisted: true });

    expect(catalogOf(store).find((entry) => entry.id === ID)).toMatchObject({
      status: "ready",
      version: "2026-10-14.1",
    });
  });

  test("RS4. 새 본문이 sha와 다르면 locked로 보고하고 스테이징 없이 활성 옛 버전을 지키며 ready를 알리지 않는다", async () => {
    const bad = { ...V2, entry: { ...V2.entry, sha256: "0".repeat(64) } };
    const { data, watch, run } = setup([bad]);
    const before = activeBytes(data, ID);

    const summary = await run();

    expect(summary.locked).toEqual([{ id: ID, reason: "integrity-mismatch" }]);
    expect(watch.events[0]).toBe("planned:u04-x");
    expect(data.get(CONTENT_RECEIVED_MANIFEST_KEY)).toBe(manifestText([bad]));
    expect(stagedKeys(ID).some((key) => data.has(key))).toBe(false);
    expect(activeBytes(data, ID).slice(1)).toEqual(before.slice(1));
    expect(watch.events.filter((event) => event.startsWith("ready"))).toEqual([]);
  });

  test("RS5. 자산 하나가 연결 실패면 스테이징 본문 · 항목만 남고 뒤 에피소드로 넘어가지 않으며 다음에는 남은 자산부터 이어 받는다", async () => {
    const next = versioned("u05-n", 5, "2026-10-14.1", "뒤 에피소드");
    const saved = new Set(bundledPaths);
    const answers: Record<string, DownloadResult> = {
      [pathsOf(ID)[1] ?? ""]: { status: "network" },
    };
    const first = recorder([V2, next], answers, saved);
    const { store, data } = fakeStore(activeSeed(V1));
    const deps = { store, bundled: bundledCatalogInput };

    await refreshEpisodeCatalog({
      ...deps,
      fetchText: first.fetchText,
      assets: first.assets,
    });

    expect(data.get(contentStagedEpisodeKey(ID))).toBe(V2.text);
    expect(data.has(contentStagedEntryKey(ID))).toBe(true);
    expect(data.has(contentStagedAssetsKey(ID))).toBe(false);
    expect(data.get(contentEpisodeKey(ID))).toBe(V1.text);
    expect(first.log).not.toContain("fetch episodes/u05-n.json");

    const second = recorder([V2, next], {}, saved);
    await refreshEpisodeCatalog({ ...deps, fetchText: second.fetchText, assets: second.assets });

    expect(second.log).not.toContain("fetch episodes/u04-x.json");
    expect(second.log).toContain(`asset ${pathsOf(ID)[1]}`);
    expect(data.get(contentStagedAssetsKey(ID))).toBe(markerText(V2));
  });

  test("RS6. 스테이징 키 쓰기가 실패하면 persisted false이고 활성 옛 버전이 그대로이며 활성 매니페스트는 합성본이다", async () => {
    const rec = recorder([V2]);
    const { store, data } = fakeStore(activeSeed(V1), {
      throwOnSetKeyPrefix: "libitum.content.staged.",
    });

    const summary = await refreshEpisodeCatalog({
      fetchText: rec.fetchText,
      store,
      bundled: bundledCatalogInput,
      assets: rec.assets,
    });

    expect(summary.persisted).toBe(false);
    expect(data.get(contentEpisodeKey(ID))).toBe(V1.text);
    expect(data.get(contentAssetsKey(ID))).toBe(markerText(V1));
    expect(manifestEntryIn(data.get(CONTENT_MANIFEST_KEY), ID)).toEqual(entryOf(V1));
    expect(data.get(CONTENT_RECEIVED_MANIFEST_KEY)).toBe(manifestText([V2]));
  });

  test("RS7. 같은 매니페스트로 다시 돌리면 unchanged이고 매니페스트 키를 쓰지 않으며 받기 · 자산 다운로드가 없다", async () => {
    const { rec, data, sets, run } = setup();
    await run();
    expect(data.has(contentStagedAssetsKey(ID))).toBe(true);
    rec.log.length = 0;
    sets.length = 0;

    const summary = await run();

    expect(summary.manifest).toBe("unchanged");
    expect(sets.filter((key) => key.startsWith("libitum.content.manifest"))).toEqual([]);
    expect(rec.log).toEqual(["fetch manifest.json"]);
  });

  test("RS8. 서버가 옛 버전으로 되돌리면 활성 매니페스트는 받은 원문이 되고 받은 키 · 스테이징 셋이 사라진다", async () => {
    const { rec, data, run } = setup();
    await run();
    expect(data.has(contentStagedEpisodeKey(ID))).toBe(true);
    const reverted = recorder([V1], {}, rec.saved);

    const summary = await refreshEpisodeCatalog({
      fetchText: reverted.fetchText,
      store: storeOver(data),
      bundled: bundledCatalogInput,
      assets: reverted.assets,
    });

    expect(summary.fetched).toEqual([]);
    expect(data.get(CONTENT_MANIFEST_KEY)).toBe(manifestText([V1]));
    expect(data.has(CONTENT_RECEIVED_MANIFEST_KEY)).toBe(false);
    for (const key of stagedKeys(ID)) expect(data.has(key)).toBe(false);
    expect(data.get(contentEpisodeKey(ID))).toBe(V1.text);
    expect(reverted.log.filter((line) => line.startsWith("asset"))).toEqual([]);
  });

  test("RS9. 스테이징 중에 id가 매니페스트에서 사라지면 removed에 내고 활성 본문 · 스테이징 셋을 지운다", async () => {
    const { rec, data, run } = setup();
    await run();
    expect(data.get(CONTENT_RECEIVED_MANIFEST_KEY)).toBe(manifestText([V2]));
    expect(data.has(contentStagedEpisodeKey(ID))).toBe(true);
    const other = versioned("u06-y", 6, "2026-10-14.1", "다른 에피소드", "without");
    const vanished = recorder([other], {}, rec.saved);

    const summary = await refreshEpisodeCatalog({
      fetchText: vanished.fetchText,
      store: storeOver(data),
      bundled: bundledCatalogInput,
      assets: vanished.assets,
    });

    expect(summary.removed).toContain(ID);
    expect(data.has(CONTENT_RECEIVED_MANIFEST_KEY)).toBe(false);
    expect(data.has(contentEpisodeKey(ID))).toBe(false);
    for (const key of stagedKeys(ID)) expect(data.has(key)).toBe(false);
  });

  test("RS10. 새 에피소드는 지금처럼 활성에 받아 준비 알림을 내고 바뀐 에피소드는 스테이징에 받는다 — 관찰자는 두 id를 order 순으로 받는다", async () => {
    const fresh = versioned("u05-n", 5, "2026-10-14.1", "새 에피소드");
    const { data, ready, watch, run } = setup([V2, fresh]);

    await run();

    expect(data.get(contentEpisodeKey("u05-n"))).toBe(fresh.text);
    expect(ready).toEqual(["u05-n"]);
    expect(manifestEntryIn(data.get(CONTENT_MANIFEST_KEY), "u05-n")).toEqual(entryOf(fresh));
    expect(manifestEntryIn(data.get(CONTENT_MANIFEST_KEY), ID)).toEqual(entryOf(V1));
    expect(data.get(contentEpisodeKey(ID))).toBe(V1.text);
    expect(watch.events[0]).toBe("planned:u04-x,u05-n");
  });

  test("RS11. 새 에피소드 본문을 내장 자산 받기보다 먼저 받고, 매니페스트가 404이거나 손상이면 planned를 부르지 않는다", async () => {
    const fresh = versioned("u04-a", 4, "2026-10-14.1", "새 에피소드");
    const rec = recorder([fresh], {}, new Set());
    const { store } = fakeStore();

    await refreshEpisodeCatalog({
      fetchText: rec.fetchText,
      store,
      bundled: bundledCatalogInput,
      assets: rec.assets,
    });

    const firstBundledAsset = rec.log.indexOf(`asset ${bundledPaths[0]}`);
    expect(rec.log.indexOf("fetch episodes/u04-a.json")).toBeGreaterThan(-1);
    expect(rec.log.indexOf("fetch episodes/u04-a.json")).toBeLessThan(firstBundledAsset);

    for (const reply of [{ ok: true, status: 404, text: "" } as const, ok("{not json")]) {
      const watch = observerLog();
      const { store: empty } = fakeStore();
      await refreshEpisodeCatalog({
        fetchText: fakeFetch({ "manifest.json": reply }).fetchText,
        store: empty,
        bundled: bundledCatalogInput,
        observer: watch.observer,
      });
      expect(watch.events).toEqual([]);
    }
  });

  test("RS12. 자산 대역이 없으면(파일 모듈 없음) 지금처럼 활성 본문이 새 버전이 되고 받은 키 · 스테이징이 없다", async () => {
    const fetched = fakeFetch(repliesFor([V2]));
    const { store, data } = fakeStore(activeSeed(V1));

    await refreshEpisodeCatalog({
      fetchText: fetched.fetchText,
      store,
      bundled: bundledCatalogInput,
    });

    expect(data.get(contentEpisodeKey(ID))).toBe(V2.text);
    expect(data.get(CONTENT_MANIFEST_KEY)).toBe(manifestText([V2]));
    expect(data.has(CONTENT_RECEIVED_MANIFEST_KEY)).toBe(false);
    for (const key of stagedKeys(ID)) expect(data.has(key)).toBe(false);
  });

  test("RS12. 자산 대역이 없을 때 관찰자를 주면 planned는 빈 목록으로 한 번 온다", async () => {
    const fetched = fakeFetch(repliesFor([V2]));
    const watch = observerLog();
    const { store } = fakeStore(activeSeed(V1));

    await refreshEpisodeCatalog({
      fetchText: fetched.fetchText,
      store,
      bundled: bundledCatalogInput,
      observer: watch.observer,
    });

    expect(watch.events).toEqual(["planned:"]);
  });
});

// 자산 받기를 붙잡는 대역 — 동시에 시작한 경로를 기록하고 손으로 풉니다.
function heldAssets() {
  const waiting = new Map<string, (result: DownloadResult) => void>();
  const started: string[] = [];
  const saved = new Set(bundledPaths);
  const assets: AssetDeps = {
    has: (path) => saved.has(path),
    remoteUrlOf: (path) => `https://cdn.example/content/${path}`,
    download: (_url, path) => {
      started.push(path);
      return new Promise<DownloadResult>((resolve) => {
        waiting.set(path, (result) => {
          if (result.status === "saved") saved.add(path);
          resolve(result);
        });
      });
    },
  };
  const release = (path: string, result: DownloadResult = { status: "saved" }): boolean => {
    const settle = waiting.get(path);
    if (settle === undefined) return false;
    waiting.delete(path);
    settle(result);
    return true;
  };
  return { assets, started, release };
}

describe("refreshEpisodeCatalog — 동시 받기는 에피소드 안에서만", () => {
  const withAssets = (id: string, order: number, assets: Record<string, unknown>): Remote =>
    remote(id, order, {}, JSON.stringify({ ...minimalEpisode(id), ...assets }));
  const threeAssets = (id: string, order: number): Remote =>
    withAssets(id, order, {
      cover: { image_url: `content/images/${id}/c.jpg`, audio_url: `${id}/l1` },
      extra: { image_url: `content/images/${id}/d.jpg` },
    });
  const twoAssets = (id: string, order: number): Remote =>
    withAssets(id, order, {
      cover: { image_url: `content/images/${id}/c.jpg`, audio_url: `${id}/l1` },
    });

  test("RS13. A의 자산 셋이 함께 시작되고 A가 끝나기 전에는 B 본문을 받지 않으며 진행은 줄지 않고 ready(A)로 끝난다", async () => {
    const A = threeAssets("u04-a", 4);
    const B = twoAssets("u05-b", 5);
    const log: string[] = [];
    const fetched = fakeFetch(repliesFor([A, B]));
    const held = heldAssets();
    const watch = observerLog();
    const { store } = fakeStore();
    const done = refreshEpisodeCatalog({
      fetchText: async (relative) => {
        log.push(relative);
        return fetched.fetchText(relative);
      },
      store,
      bundled: bundledCatalogInput,
      assets: held.assets,
      observer: watch.observer,
    });
    await flush();

    const aPaths = ["images/u04-a/c.jpg", "audio/u04-a/l1.m4a", "images/u04-a/d.jpg"];
    expect([...held.started].sort()).toEqual([...aPaths].sort());
    expect(log).not.toContain("episodes/u05-b.json");

    for (const path of [aPaths[1] ?? "", aPaths[0] ?? ""]) {
      expect(held.release(path)).toBe(true);
      await flush();
      expect(log).not.toContain("episodes/u05-b.json");
    }
    expect(held.release(aPaths[2] ?? "")).toBe(true);
    await flush();

    expect(watch.events.filter((event) => event.startsWith("progressed:u04-a"))).toEqual([
      "progressed:u04-a:1/4",
      "progressed:u04-a:2/4",
      "progressed:u04-a:3/4",
      "progressed:u04-a:4/4",
    ]);
    expect(watch.events.indexOf("ready:u04-a")).toBeGreaterThan(
      watch.events.indexOf("progressed:u04-a:4/4"),
    );
    expect(log).toContain("episodes/u05-b.json");

    for (const path of ["images/u05-b/c.jpg", "audio/u05-b/l1.m4a"]) {
      expect(held.release(path)).toBe(true);
    }
    await done;
  });

  test("RS13. A의 자산 하나가 연결 실패면 나머지 A 자산이 끝난 뒤 루프가 멈추고 B 본문을 받지 않는다", async () => {
    const A = threeAssets("u04-a", 4);
    const B = twoAssets("u05-b", 5);
    const log: string[] = [];
    const fetched = fakeFetch(repliesFor([A, B]));
    const held = heldAssets();
    const ready: string[] = [];
    const { store } = fakeStore();
    const done = refreshEpisodeCatalog({
      fetchText: async (relative) => {
        log.push(relative);
        return fetched.fetchText(relative);
      },
      store,
      bundled: bundledCatalogInput,
      assets: held.assets,
      onEpisodeReady: (id) => ready.push(id),
    });
    await flush();
    expect(held.started).toHaveLength(3);

    expect(held.release("audio/u04-a/l1.m4a", { status: "network" })).toBe(true);
    await flush();
    expect(held.release("images/u04-a/c.jpg")).toBe(true);
    expect(held.release("images/u04-a/d.jpg")).toBe(true);

    await done;
    expect(log).not.toContain("episodes/u05-b.json");
    expect(ready).toEqual([]);
  });
});

// 시드한 Map을 그대로 읽고 쓰는 저장소입니다 — 이전 실행의 상태 위에서 다음 실행을 돌립니다.
function storeOver(data: Map<string, string>): ContentStore {
  return {
    available: () => true,
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  };
}
