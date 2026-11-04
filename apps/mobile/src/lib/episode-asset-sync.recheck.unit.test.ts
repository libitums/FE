import { expect, test, vi } from "vitest";

import type { ContentStore } from "./episode-cache";
import {
  contentAssetsKey,
  ensureEpisodeAssets,
  isAssetsComplete,
  type AssetDeps,
  type DownloadResult,
} from "./episode-asset-sync";

// `unit` 계층: 「서버에 없음」으로 적힌 경로를 다시 확인하는 규칙입니다(ADR-0095 D2). 표시가 그 본문의 것이고
// `missing`이 남아 있으면 24시간이 지났을 때 · 매니페스트가 바뀐 차례일 때 · 확인 시각이 없는 옛 표시일 때 빠진
// 경로만 다시 받습니다. 결과는 늘 `already`이고 열림 판정(sha만 봄)은 바뀌지 않습니다.

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 3, 12, 0, 0);
const entry = { id: "u00-tutorial", sha256: "abc" };
const paths = ["images/a.webp", "audio/d-01.m4a", "audio/d-02.m4a"];
const notFound: DownloadResult = { status: "http", code: 400 };

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
  answers: Record<string, DownloadResult>,
  present: readonly string[],
): AssetDeps & { download: ReturnType<typeof vi.fn> } {
  const saved = new Set(present);
  const download = vi.fn(async (_url: string, path: string): Promise<DownloadResult> => {
    const answer = answers[path] ?? { status: "saved" };
    if (answer.status === "saved") saved.add(path);
    return answer;
  });
  return { has: (path) => saved.has(path), download, remoteUrlOf: (path) => `https://cdn/${path}` };
}

function seed(store: ReturnType<typeof memoryStore>, marker: Record<string, unknown>): void {
  store.data.set(contentAssetsKey(entry.id), JSON.stringify(marker));
}

const marker = (store: ReturnType<typeof memoryStore>): unknown =>
  JSON.parse(store.data.get(contentAssetsKey(entry.id)) ?? "null");

test("AR1. 확인 시각이 없는 옛 표시는 빠진 경로만 다시 받고, 받은 것은 missing에서 빼며 결과는 already다", async () => {
  const store = memoryStore();
  seed(store, { sha256: "abc", missing: ["audio/d-01.m4a", "audio/d-02.m4a"] });
  const d = deps({ "audio/d-02.m4a": notFound }, ["images/a.webp"]);

  expect(await ensureEpisodeAssets(store, d, entry, paths, { now: () => NOW })).toBe("already");

  expect(d.download.mock.calls.map((call) => call[1])).toEqual([
    "audio/d-01.m4a",
    "audio/d-02.m4a",
  ]);
  expect(marker(store)).toEqual({ sha256: "abc", missing: ["audio/d-02.m4a"], checkedAt: NOW });
  expect(isAssetsComplete(store, entry.id, "abc")).toBe(true);
});

test("AR2. 24시간이 안 지났으면 다시 받지 않고 표시도 그대로다", async () => {
  const store = memoryStore();
  const before = { sha256: "abc", missing: ["audio/d-01.m4a"], checkedAt: NOW - DAY + 1 };
  seed(store, before);
  const d = deps({}, ["images/a.webp", "audio/d-02.m4a"]);

  expect(await ensureEpisodeAssets(store, d, entry, paths, { now: () => NOW })).toBe("already");

  expect(d.download).not.toHaveBeenCalled();
  expect(marker(store)).toEqual(before);
});

test("AR3. 24시간이 지났으면 다시 받는다 — 또 없으면 missing은 그대로 두고 확인 시각만 새로 쓴다", async () => {
  const store = memoryStore();
  seed(store, { sha256: "abc", missing: ["audio/d-01.m4a"], checkedAt: NOW - DAY });
  const d = deps({ "audio/d-01.m4a": notFound }, ["images/a.webp", "audio/d-02.m4a"]);

  expect(await ensureEpisodeAssets(store, d, entry, paths, { now: () => NOW })).toBe("already");

  expect(d.download).toHaveBeenCalledTimes(1);
  expect(marker(store)).toEqual({ sha256: "abc", missing: ["audio/d-01.m4a"], checkedAt: NOW });
});

test("AR4. recheckMissing(매니페스트가 바뀐 차례)이면 24시간 전이어도 다시 받는다", async () => {
  const store = memoryStore();
  seed(store, { sha256: "abc", missing: ["audio/d-01.m4a"], checkedAt: NOW - 1000 });
  const d = deps({}, ["images/a.webp", "audio/d-02.m4a"]);

  expect(
    await ensureEpisodeAssets(store, d, entry, paths, { now: () => NOW, recheckMissing: true }),
  ).toBe("already");

  expect(d.download).toHaveBeenCalledTimes(1);
  // 더 볼 것이 없으면 확인 시각 없이 다 받은 표시와 같은 모양이 됩니다.
  expect(marker(store)).toEqual({ sha256: "abc", missing: [] });
});

test("AR5. 다시 받다 연결이 끊기면(io · 5xx) 표시를 바꾸지 않고 already다 — 다음 차례에 다시 본다", async () => {
  for (const failure of [{ status: "io" }, { status: "http", code: 503 }] as DownloadResult[]) {
    const store = memoryStore();
    const before = { sha256: "abc", missing: ["audio/d-01.m4a"] };
    seed(store, before);
    const d = deps({ "audio/d-01.m4a": failure }, ["images/a.webp", "audio/d-02.m4a"]);

    expect(await ensureEpisodeAssets(store, d, entry, paths, { now: () => NOW })).toBe("already");
    expect(marker(store)).toEqual(before);
  }
});

test("AR6. missing이 비어 있으면 시간이 지나도 · recheckMissing이어도 받지 않는다", async () => {
  const store = memoryStore();
  const before = { sha256: "abc", missing: [], checkedAt: NOW - 10 * DAY };
  seed(store, before);
  const d = deps({}, paths);

  expect(
    await ensureEpisodeAssets(store, d, entry, paths, { now: () => NOW, recheckMissing: true }),
  ).toBe("already");
  expect(d.download).not.toHaveBeenCalled();
  expect(marker(store)).toEqual(before);
});

test("AR7. 다른 본문(sha)의 표시는 재확인이 아니라 전체 받기다 — 완료 표시에 확인 시각을 함께 쓴다", async () => {
  const store = memoryStore();
  seed(store, { sha256: "old", missing: ["audio/d-01.m4a"] });
  const d = deps({ "audio/d-02.m4a": notFound }, []);

  expect(await ensureEpisodeAssets(store, d, entry, paths, { now: () => NOW })).toBe("completed");

  expect(d.download).toHaveBeenCalledTimes(3);
  expect(marker(store)).toEqual({ sha256: "abc", missing: ["audio/d-02.m4a"], checkedAt: NOW });
});

test("AR8. 깨진 표시(JSON 아님 · missing이 배열 아님)는 재확인하지 않고 열림 판정도 지금 규칙 그대로다", async () => {
  const store = memoryStore();
  store.data.set(contentAssetsKey(entry.id), JSON.stringify({ sha256: "abc", missing: "x" }));
  const d = deps({}, paths);

  expect(await ensureEpisodeAssets(store, d, entry, paths, { now: () => NOW })).toBe("already");
  expect(d.download).not.toHaveBeenCalled();
});
