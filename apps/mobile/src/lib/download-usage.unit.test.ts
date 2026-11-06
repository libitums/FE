import { expect, test } from "vitest";

import { contentAssetsKey } from "./episode-asset-sync";
import { CONTENT_MANIFEST_KEY } from "./episode-cache";
import {
  downloadedAssetBytes,
  downloadedUnitCount,
  episodeAssetsComplete,
  episodeAssetsCompleteFor,
} from "./download-usage";
import { contentCommonAssetsKey, contentUnitAssetsKey } from "./episode-asset-groups-sync";
import { fakeStore } from "./episode-refresh.test-support";

// `unit` 계층: 받은 크기(ADR-0095 D8) — 다 받은 편의 `assets_bytes`만 더합니다.

const sha = (c: string) => c.repeat(64);

function manifest(entries: { id: string; sha: string; assetsBytes?: number }[]): string {
  return JSON.stringify({
    schema: "manifest-1",
    generated_at: "2026-11-04T00:00:00Z",
    episodes: entries.map((entry, order) => ({
      id: entry.id,
      order,
      title: entry.id,
      schema: "delivery-2",
      version: "1",
      sha256: entry.sha,
      bytes: 10,
      url: `episodes/${entry.id}.json`,
      ...(entry.assetsBytes === undefined ? {} : { assets_bytes: entry.assetsBytes }),
    })),
  });
}

test("DU1. 다 받은 편의 assets_bytes만 더한다 — 안 받은 편 · 다른 본문 표시는 빼고", () => {
  const { store, data } = fakeStore();
  data.set(
    CONTENT_MANIFEST_KEY,
    manifest([
      { id: "u01", sha: sha("a"), assetsBytes: 1000 },
      { id: "u02", sha: sha("b"), assetsBytes: 2000 },
      { id: "u03", sha: sha("c"), assetsBytes: 4000 },
    ]),
  );
  data.set(contentAssetsKey("u01"), JSON.stringify({ sha256: sha("a"), missing: [] }));
  data.set(contentAssetsKey("u03"), JSON.stringify({ sha256: sha("d"), missing: [] }));
  expect(downloadedAssetBytes(store)).toBe(1000);
});

test("DU2. 크기가 실린 편이 없거나 매니페스트가 없으면 null이다", () => {
  const empty = fakeStore();
  expect(downloadedAssetBytes(empty.store)).toBeNull();
  const noSizes = fakeStore();
  noSizes.data.set(CONTENT_MANIFEST_KEY, manifest([{ id: "u01", sha: sha("a") }]));
  noSizes.data.set(contentAssetsKey("u01"), JSON.stringify({ sha256: sha("a"), missing: [] }));
  expect(downloadedAssetBytes(noSizes.store)).toBeNull();
});

test("DU3. 크기는 실렸지만 다 받은 편이 없으면 0이다", () => {
  const { store, data } = fakeStore();
  data.set(CONTENT_MANIFEST_KEY, manifest([{ id: "u01", sha: sha("a"), assetsBytes: 1000 }]));
  expect(downloadedAssetBytes(store)).toBe(0);
});

test("DU4. 편의 자산 표시가 활성 목록 또는 내장 목록의 그 편 sha와 맞으면 다 받은 것이다", () => {
  const { store, data } = fakeStore();
  data.set(CONTENT_MANIFEST_KEY, manifest([{ id: "u01", sha: sha("a") }]));
  const bundled = [{ id: "u02", sha256: sha("b") }];
  data.set(contentAssetsKey("u01"), JSON.stringify({ sha256: sha("a"), missing: [] }));
  data.set(contentAssetsKey("u02"), JSON.stringify({ sha256: sha("b"), missing: [] }));
  data.set(contentAssetsKey("u03"), JSON.stringify({ sha256: sha("c"), missing: [] }));
  expect(episodeAssetsComplete(store, bundled, "u01")).toBe(true);
  expect(episodeAssetsComplete(store, bundled, "u02")).toBe(true);
  expect(episodeAssetsComplete(store, bundled, "u03")).toBe(false);
  expect(episodeAssetsComplete(store, bundled, "u04")).toBe(false);
});

const marker = (c: string) => JSON.stringify({ sha256: sha(c), missing: [] });
const unit = (unitKey: string) => ({ kind: "unit", unitKey }) as const;

test("[U-DU5] 유닛 판정 — 공통 표시와 그 유닛 표시가 같은 sha일 때만 참, 유닛만 · 공통만 · 다른 유닛은 거짓", () => {
  const { store, data } = fakeStore();
  data.set(CONTENT_MANIFEST_KEY, manifest([{ id: "u01", sha: sha("a") }]));
  const bundled: { id: string; sha256: string }[] = [];

  data.set(contentUnitAssetsKey("u01", "S1"), marker("a"));
  expect(episodeAssetsCompleteFor(store, bundled, "u01", unit("S1"))).toBe(false);

  data.set(contentCommonAssetsKey("u01"), marker("a"));
  expect(episodeAssetsCompleteFor(store, bundled, "u01", unit("S1"))).toBe(true);
  expect(episodeAssetsCompleteFor(store, bundled, "u01", unit("S2"))).toBe(false);
  expect(episodeAssetsCompleteFor(store, bundled, "u01", { kind: "common" })).toBe(true);
  expect(episodeAssetsCompleteFor(store, bundled, "u01", { kind: "episode" })).toBe(false);

  data.delete(contentUnitAssetsKey("u01", "S1"));
  expect(episodeAssetsCompleteFor(store, bundled, "u01", unit("S1"))).toBe(false);
});

test("[U-DU6] 편 표시가 완료면 common · unit 모두 참이다 — 유닛 표시가 없어도", () => {
  const { store, data } = fakeStore();
  data.set(CONTENT_MANIFEST_KEY, manifest([{ id: "u01", sha: sha("a") }]));
  data.set(contentAssetsKey("u01"), marker("a"));

  expect(episodeAssetsCompleteFor(store, [], "u01", { kind: "episode" })).toBe(true);
  expect(episodeAssetsCompleteFor(store, [], "u01", { kind: "common" })).toBe(true);
  expect(episodeAssetsCompleteFor(store, [], "u01", unit("S7"))).toBe(true);
  expect(episodeAssetsCompleteFor(store, [], "u02", unit("S7"))).toBe(false);
});

test("[U-DU7] downloadedUnitCount — 표시 받은 유닛 수, 편 표시가 완료면 전부, 없으면 0", () => {
  const { store, data } = fakeStore();
  data.set(
    CONTENT_MANIFEST_KEY,
    manifest([
      { id: "u01", sha: sha("a") },
      { id: "u02", sha: sha("b") },
    ]),
  );
  const keys = ["S1", "S2", "S3", "RP"];

  expect(downloadedUnitCount(store, [], "u01", keys)).toBe(0);

  data.set(contentCommonAssetsKey("u01"), marker("a"));
  data.set(contentUnitAssetsKey("u01", "S1"), marker("a"));
  data.set(contentUnitAssetsKey("u01", "S3"), marker("a"));
  expect(downloadedUnitCount(store, [], "u01", keys)).toBe(2);

  data.set(contentAssetsKey("u02"), marker("b"));
  expect(downloadedUnitCount(store, [], "u02", keys)).toBe(4);
});
