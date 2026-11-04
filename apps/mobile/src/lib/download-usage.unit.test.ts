import { expect, test } from "vitest";

import { contentAssetsKey } from "./episode-asset-sync";
import { CONTENT_MANIFEST_KEY } from "./episode-cache";
import { downloadedAssetBytes, episodeAssetsComplete } from "./download-usage";
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
