import { describe, expect, test, vi } from "vitest";

import type { AssetTarget } from "./download-policy";
import {
  contentCommonAssetsKey,
  contentUnitAssetsKey,
  ensureEpisodeAssetGroups,
} from "./episode-asset-groups-sync";
import { contentAssetsKey, type AssetDeps, type DownloadResult } from "./episode-asset-sync";
import type { EpisodeAssetGroups } from "./episode-assets";
import type { ContentStore } from "./episode-cache";

// `unit` 계층: 공통 → 유닛 순으로 받고 묶음마다 받음 표시를 두는 규칙입니다. 전송 · 파일 · 저장소는 대역입니다.

const ENTRY = { id: "u02", sha256: "sha-1" };
const C1 = "images/u02/c1.jpg";
const S1A = "images/u02/s1a.jpg";
const S2A = "audio/u02/s2a.m4a";
const SHARED = "images/u02/shared.jpg";

const GROUPS: EpisodeAssetGroups = {
  common: [C1],
  units: [
    { key: "S1", paths: [S1A] },
    { key: "S2", paths: [S2A] },
  ],
};

function memoryStore(): ContentStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    available: () => true,
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  };
}

function deps(
  answers: Record<string, DownloadResult> = {},
  onDownload: (path: string) => void = () => undefined,
): AssetDeps & { calls: string[] } {
  const saved = new Set<string>();
  const calls: string[] = [];
  const download = vi.fn(async (_url: string, path: string): Promise<DownloadResult> => {
    calls.push(path);
    onDownload(path);
    const answer = answers[path] ?? { status: "saved" };
    if (answer.status === "saved") saved.add(path);
    return answer;
  });
  return {
    has: (path) => saved.has(path),
    download,
    remoteUrlOf: (path) => `https://cdn.example/content/${path}`,
    calls,
  };
}

type Marker = { sha256: string; missing: string[] };
const markerOf = (store: { data: Map<string, string> }, key: string): Marker | undefined => {
  const text = store.data.get(key);
  return text === undefined ? undefined : (JSON.parse(text) as Marker);
};

describe("ensureEpisodeAssetGroups", () => {
  test("[U-AG1] 공통 → S1 → S2 순으로 받고, S1이 끝나면 S2를 받기 전에 S1 표시가 서 있으며, 끝나면 공통 · 유닛 · 편 표시가 모두 {sha256, missing}이다", async () => {
    const store = memoryStore();
    let s1MarkedBeforeS2: boolean | null = null;
    const d = deps({}, (path) => {
      if (path === S2A) s1MarkedBeforeS2 = store.data.has(contentUnitAssetsKey("u02", "S1"));
    });

    const outcome = await ensureEpisodeAssetGroups(store, d, ENTRY, GROUPS, {
      groupMarkers: "active",
    });

    expect(outcome).toBe("completed");
    expect(d.calls).toEqual([C1, S1A, S2A]);
    expect(s1MarkedBeforeS2).toBe(true);
    for (const key of [
      contentCommonAssetsKey("u02"),
      contentUnitAssetsKey("u02", "S1"),
      contentUnitAssetsKey("u02", "S2"),
      contentAssetsKey("u02"),
    ]) {
      expect(markerOf(store, key), key).toEqual({ sha256: "sha-1", missing: [] });
    }
  });

  test("[U-AG2] allowed가 S2만 거짓이면 공통 · S1만 받고 deferred(편 표시 없음), common이 거짓이면 아무것도 받지 않고 deferred다", async () => {
    const store = memoryStore();
    const d = deps();
    const noS2 = (target: AssetTarget) => !(target.kind === "unit" && target.unitKey === "S2");

    const outcome = await ensureEpisodeAssetGroups(store, d, ENTRY, GROUPS, {
      groupMarkers: "active",
      allowed: noS2,
    });

    expect(outcome).toBe("deferred");
    expect(d.calls).toEqual([C1, S1A]);
    expect(store.data.has(contentCommonAssetsKey("u02"))).toBe(true);
    expect(store.data.has(contentUnitAssetsKey("u02", "S1"))).toBe(true);
    expect(store.data.has(contentUnitAssetsKey("u02", "S2"))).toBe(false);
    expect(store.data.has(contentAssetsKey("u02"))).toBe(false);

    const empty = memoryStore();
    const d2 = deps();
    const blocked = await ensureEpisodeAssetGroups(empty, d2, ENTRY, GROUPS, {
      groupMarkers: "active",
      allowed: (target) => target.kind !== "common",
    });
    expect(blocked).toBe("deferred");
    expect(d2.calls).toEqual([]);
    expect(empty.data.size).toBe(0);
  });

  test("[U-AG3] S2 받는 중 연결 실패면 incomplete로 공통 · S1 표시는 남고, 다음 호출은 공통 · S1을 건너뛰고 S2부터 받는다", async () => {
    const store = memoryStore();
    const first = deps({ [S2A]: { status: "network" } });

    const outcome = await ensureEpisodeAssetGroups(store, first, ENTRY, GROUPS, {
      groupMarkers: "active",
    });

    expect(outcome).toBe("incomplete");
    expect(store.data.has(contentCommonAssetsKey("u02"))).toBe(true);
    expect(store.data.has(contentUnitAssetsKey("u02", "S1"))).toBe(true);
    expect(store.data.has(contentUnitAssetsKey("u02", "S2"))).toBe(false);
    expect(store.data.has(contentAssetsKey("u02"))).toBe(false);

    const second = deps();
    const again = await ensureEpisodeAssetGroups(store, second, ENTRY, GROUPS, {
      groupMarkers: "active",
    });
    expect(again).toBe("completed");
    expect(second.calls).toEqual([S2A]);
  });

  test("[U-AG4] 404 경로는 그 묶음 missing에 적고, 편 표시의 missing은 묶음 합집합(입력 순서 · 중복 없음)이다", async () => {
    const store = memoryStore();
    const groups: EpisodeAssetGroups = {
      common: [C1, SHARED],
      units: [
        { key: "S1", paths: [S1A, SHARED] },
        { key: "S2", paths: [S2A] },
      ],
    };
    const gone: DownloadResult = { status: "http", code: 404 };
    const d = deps({ [SHARED]: gone, [S2A]: gone });

    const outcome = await ensureEpisodeAssetGroups(store, d, ENTRY, groups, {
      groupMarkers: "active",
    });

    expect(outcome).toBe("completed");
    expect(markerOf(store, contentCommonAssetsKey("u02"))?.missing).toEqual([SHARED]);
    expect(markerOf(store, contentUnitAssetsKey("u02", "S1"))?.missing).toEqual([SHARED]);
    expect(markerOf(store, contentUnitAssetsKey("u02", "S2"))?.missing).toEqual([S2A]);
    expect(markerOf(store, contentAssetsKey("u02"))?.missing).toEqual([SHARED, S2A]);
  });

  test("[U-AG5] groupMarkers none + markerKey면 묶음 키를 쓰지 않고 스테이징 편 표시만 쓴다", async () => {
    const store = memoryStore();
    const d = deps();
    const staged = "libitum.content.staged-assets.u02";

    const outcome = await ensureEpisodeAssetGroups(store, d, ENTRY, GROUPS, {
      groupMarkers: "none",
      markerKey: staged,
    });

    expect(outcome).toBe("completed");
    expect([...store.data.keys()]).toEqual([staged]);
    expect(markerOf(store, staged)).toEqual({ sha256: "sha-1", missing: [] });
  });

  test("[U-AG6] 편 표시가 이미 그 sha면 already로 받지 않고, recheckMissing이면 서버에 없음 경로만 다시 받는다", async () => {
    const store = memoryStore();
    store.data.set(contentAssetsKey("u02"), JSON.stringify({ sha256: "sha-1", missing: [] }));
    const d = deps();
    const already = await ensureEpisodeAssetGroups(store, d, ENTRY, GROUPS, {
      groupMarkers: "active",
    });
    expect(already).toBe("already");
    expect(d.calls).toEqual([]);

    store.data.set(contentAssetsKey("u02"), JSON.stringify({ sha256: "sha-1", missing: [S2A] }));
    const d2 = deps();
    const outcome = await ensureEpisodeAssetGroups(store, d2, ENTRY, GROUPS, {
      groupMarkers: "active",
      recheckMissing: true,
    });
    expect(outcome).toBe("already");
    expect(d2.calls).toEqual([S2A]);
    expect(markerOf(store, contentAssetsKey("u02"))?.missing).toEqual([]);
  });

  test("[U-AG7] 공통과 유닛에 겹친 경로는 한 번만 받고, onPathSettled는 묶음마다 불린다", async () => {
    const store = memoryStore();
    const d = deps();
    const settled: string[] = [];
    const groups: EpisodeAssetGroups = { common: [C1], units: [{ key: "S1", paths: [C1, S1A] }] };

    await ensureEpisodeAssetGroups(store, d, ENTRY, groups, {
      groupMarkers: "active",
      onPathSettled: (path) => settled.push(path),
    });

    expect(d.calls).toEqual([C1, S1A]);
    expect(settled.filter((path) => path === C1)).toHaveLength(2);
    expect(settled.filter((path) => path === S1A)).toHaveLength(1);
  });
});
