import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "./episode-bundled";
import {
  CONTENT_MANIFEST_KEY,
  contentEpisodeKey,
  readCachedSource,
  type ContentStore,
} from "./episode-cache";
import { buildEpisodeCatalog } from "./episode-catalog";
import { refreshEpisodeCatalog, type RefreshSummary } from "./episode-refresh";
import {
  fakeFetch,
  fakeStore,
  manifestText,
  ok,
  remote,
  type Remote,
  type Reply,
  type Wire,
} from "./episode-refresh.test-support";
import type { FetchText } from "./episode-remote";
import { sha256Hex, utf8Bytes } from "./sha256";

// `unit` 계층: 가짜 전송 · 가짜 저장소를 주입해 `refreshEpisodeCatalog`의 입출력과 호출 기록을 봅니다.

const run = (fetchText: FetchText, store: ContentStore): Promise<RefreshSummary> =>
  refreshEpisodeCatalog({ fetchText, store, bundled: bundledCatalogInput });

const X = remote("u04-x", 4);
const replyFor = (remotes: Remote[], extra: Wire = {}): Record<string, Reply> => ({
  "manifest.json": ok(manifestText(remotes, extra)),
  ...Object.fromEntries(remotes.map((r) => [r.entry.url as string, ok(r.text)])),
});

describe("refreshEpisodeCatalog", () => {
  test("F1. 원격 매니페스트가 404면 unavailable이고 저장하지 않는다", async () => {
    const { fetchText, calls } = fakeFetch({});
    const { store, sets } = fakeStore();
    const summary = await run(fetchText, store);
    expect(summary.manifest).toBe("unavailable");
    expect(summary.fetched).toEqual([]);
    expect(calls).toEqual(["manifest.json"]);
    expect(sets).toHaveLength(0);
  });

  // 가드: 무예외는 스캐폴드도 만족합니다.
  test("F2. 전송이 unconfigured면 unavailable, reject여도 예외 없이 summary를 낸다", async () => {
    const { store } = fakeStore();
    const unconfigured = fakeFetch({ "manifest.json": { ok: false, reason: "unconfigured" } });
    expect((await run(unconfigured.fetchText, store)).manifest).toBe("unavailable");
    const rejecting = fakeFetch({ "manifest.json": "reject" });
    const summary = await run(rejecting.fetchText, store);
    expect(summary.manifest).toBe("unavailable");
    expect(summary.fetched).toEqual([]);
  });

  test.each([
    ["손상 JSON", "{not json"],
    ["모양이 틀림", JSON.stringify({ schema: "manifest-1" })],
  ])("F3. 매니페스트가 %s이면 invalid이고 캐시가 그대로다", async (_name, text) => {
    const previous = manifestText([X]);
    const { fetchText } = fakeFetch({ "manifest.json": ok(text) });
    const { store, data, sets, removes } = fakeStore({
      [CONTENT_MANIFEST_KEY]: previous,
      [contentEpisodeKey("u04-x")]: X.text,
    });
    const summary = await run(fetchText, store);
    expect(summary.manifest).toBe("invalid");
    expect(data.get(CONTENT_MANIFEST_KEY)).toBe(previous);
    expect(data.get(contentEpisodeKey("u04-x"))).toBe(X.text);
    expect(sets).toHaveLength(0);
    expect(removes).toHaveLength(0);
  });

  test("F4. 넷째 에피소드를 받아 저장하고, 그 저장소로 다시 만든 카탈로그에서 ready/cache", async () => {
    const { fetchText } = fakeFetch(replyFor([X]));
    const { store, data } = fakeStore();
    const summary = await run(fetchText, store);
    expect(summary).toMatchObject({
      manifest: "updated",
      fetched: ["u04-x"],
      locked: [],
      failed: [],
      removed: [],
      persisted: true,
    });
    expect(data.get(CONTENT_MANIFEST_KEY)).toBe(manifestText([X]));
    expect(data.get(contentEpisodeKey("u04-x"))).toBe(X.text);
    const catalog = buildEpisodeCatalog({
      bundled: bundledCatalogInput,
      cache: readCachedSource(store, ["u04-x"]),
    });
    expect(catalog.find((e) => e.id === "u04-x")).toMatchObject({
      status: "ready",
      source: "cache",
    });
  });

  test("F5. 같은 매니페스트로 다시 돌리면 unchanged이고 받은 에피소드는 다시 받지 않는다", async () => {
    const { fetchText, calls } = fakeFetch(replyFor([X]));
    const { store } = fakeStore();
    await run(fetchText, store);
    calls.length = 0;
    const second = await run(fetchText, store);
    expect(second.manifest).toBe("unchanged");
    expect(second.fetched).toEqual([]);
    expect(calls).toEqual(["manifest.json"]);
  });

  test.each([
    ["같은 version", "2026-10-12.1"],
    ["더 낮은 version", "2026-10-11.9"],
  ])("F6. 내장보다 높지 않은 내장 id 항목(%s)은 받지 않는다", async (_name, version) => {
    const u01 = remote("u01-water", 1, { version });
    const { fetchText, calls } = fakeFetch(replyFor([u01]));
    const { store, data } = fakeStore();
    const summary = await run(fetchText, store);
    expect(summary.fetched).toEqual([]);
    expect(calls).toEqual(["manifest.json"]);
    expect(data.has(contentEpisodeKey("u01-water"))).toBe(false);
  });

  test.each([
    ["500", { ok: true, status: 500, text: "" } as Reply, "http"],
    ["network", { ok: false, reason: "network" } as Reply, "network"],
  ])("F7. 에피소드 응답이 %s이면 failed/%s이고 저장하지 않는다", async (_name, reply, reason) => {
    const { fetchText } = fakeFetch({ ...replyFor([X]), "episodes/u04-x.json": reply });
    const { store, data } = fakeStore();
    const summary = await run(fetchText, store);
    expect(summary.failed).toEqual([{ id: "u04-x", reason }]);
    expect(summary.fetched).toEqual([]);
    expect(data.has(contentEpisodeKey("u04-x"))).toBe(false);
  });

  test("F7. 에피소드 전송이 reject여도 예외 없이 그 에피소드를 저장하지 않는다", async () => {
    const { fetchText } = fakeFetch({ ...replyFor([X]), "episodes/u04-x.json": "reject" });
    const { store, data } = fakeStore();
    const summary = await run(fetchText, store);
    expect(summary.failed).toEqual([{ id: "u04-x", reason: "network" }]);
    expect(summary.fetched).toEqual([]);
    expect(data.has(contentEpisodeKey("u04-x"))).toBe(false);
  });

  test.each([
    [
      "해시 불일치",
      (r: Remote) => ({ ...r, entry: { ...r.entry, sha256: sha256Hex(utf8Bytes("x")) } }),
      "integrity-mismatch",
    ],
    [
      "바이트 불일치",
      (r: Remote) => ({ ...r, entry: { ...r.entry, bytes: (r.entry.bytes as number) + 1 } }),
      "integrity-mismatch",
    ],
    ["디코드 실패", () => remote("u04-x", 4, {}, "{"), "decode-failed"],
  ])("F8. %s이면 locked/%s이고 저장하지 않는다", async (_name, make, reason) => {
    const bad = make(X);
    const { fetchText } = fakeFetch(replyFor([bad]));
    const { store, data } = fakeStore();
    const summary = await run(fetchText, store);
    expect(summary.locked).toEqual([{ id: "u04-x", reason }]);
    expect(summary.fetched).toEqual([]);
    expect(data.has(contentEpisodeKey("u04-x"))).toBe(false);
  });

  test("F9. 지원하지 않는 schema는 locked/unsupported-schema이고 전송하지 않는다", async () => {
    const unsupported = remote("u04-x", 4, { schema: "delivery-9" });
    const { fetchText, calls } = fakeFetch(replyFor([unsupported]));
    const { store } = fakeStore();
    const summary = await run(fetchText, store);
    expect(summary.locked).toEqual([{ id: "u04-x", reason: "unsupported-schema" }]);
    expect(calls).toEqual(["manifest.json"]);
  });

  test("F10. min_client_level이 높으면 에피소드를 받지 않고 원격 항목을 client-too-old로 잠근다", async () => {
    const { fetchText, calls } = fakeFetch(replyFor([X], { min_client_level: 2 }));
    const { store } = fakeStore();
    const summary = await run(fetchText, store);
    expect(calls).toEqual(["manifest.json"]);
    expect(summary.fetched).toEqual([]);
    expect(summary.locked).toEqual([{ id: "u04-x", reason: "client-too-old" }]);
  });

  test("F11. 새 매니페스트에서 사라진 에피소드는 캐시에서 지우고 removed에 낸다", async () => {
    const u01 = remote("u01-water", 1, { version: "2026-10-12.1" });
    const { fetchText } = fakeFetch(replyFor([u01]));
    const { store, data, removes } = fakeStore({
      [CONTENT_MANIFEST_KEY]: manifestText([X]),
      [contentEpisodeKey("u04-x")]: X.text,
    });
    const summary = await run(fetchText, store);
    expect(summary.removed).toEqual(["u04-x"]);
    expect(removes).toContain(contentEpisodeKey("u04-x"));
    expect(data.has(contentEpisodeKey("u04-x"))).toBe(false);
  });

  test("F12. 저장소를 쓸 수 없으면 persisted false이고 set을 부르지 않지만 fetched는 계산된다", async () => {
    const { fetchText } = fakeFetch(replyFor([X]));
    const { store, sets } = fakeStore({}, { available: false });
    const summary = await run(fetchText, store);
    expect(summary.persisted).toBe(false);
    expect(summary.fetched).toEqual(["u04-x"]);
    expect(sets).toHaveLength(0);
  });

  test("F13. 매니페스트는 저장되고 에피소드 set만 던지면 persisted false · 그 에피소드는 fetched에 없고 다른 에피소드는 계속 받는다", async () => {
    const Y = remote("u05-y", 5);
    const { fetchText } = fakeFetch(replyFor([X, Y]));
    const { store, data } = fakeStore({}, { throwOnSetKeyPrefix: contentEpisodeKey("u04-x") });
    const summary = await run(fetchText, store);
    expect(summary.persisted).toBe(false);
    expect(summary.fetched).not.toContain("u04-x");
    expect(summary.fetched).toContain("u05-y");
    expect(data.get(CONTENT_MANIFEST_KEY)).toBe(manifestText([X, Y]));
  });
});
