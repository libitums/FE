import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "./episode-bundled";
import { isAssetsComplete, markAssetsComplete } from "./episode-asset-sync";
import {
  CONTENT_MANIFEST_KEY,
  CONTENT_RECEIVED_MANIFEST_KEY,
  contentEpisodeKey,
  contentTranslationKey,
  readCachedSource,
  readCachedTranslations,
  safeAvailable,
  safeGet,
  tryRemove,
  trySet,
  type ContentStore,
} from "./episode-cache";
import { buildEpisodeCatalog, parseCachedManifest } from "./episode-catalog";
import { fakeStore, manifestText, remote } from "./episode-refresh.test-support";

// `unit` 계층: 자산 게이트 — 원격 에피소드는 자산까지 갖춘 뒤에만 카탈로그에 열립니다(ADR-0071).

const X = remote("u04-x", 4);

function catalogWith(keep?: (id: string) => boolean) {
  const { store } = fakeStore({
    [CONTENT_MANIFEST_KEY]: manifestText([X]),
    [contentEpisodeKey("u04-x")]: X.text,
  });
  return { store, read: () => readCachedSource(store, ["u04-x"], keep) };
}

const statusOf = (source: ReturnType<typeof readCachedSource>) =>
  buildEpisodeCatalog({ bundled: bundledCatalogInput, cache: source }).find((e) => e.id === "u04-x")
    ?.status;

describe("readCachedSource — 자산 게이트", () => {
  test("CG1. 게이트가 그 id를 거르면 본문이 캐시돼 있어도 pending이다", () => {
    const { read } = catalogWith(() => false);
    expect(statusOf(read())).toBe("pending");
  });

  test("CG2. 게이트가 없으면(파일 모듈 없음) 본문만으로 ready다 — 지금 동작", () => {
    const { read } = catalogWith();
    expect(statusOf(read())).toBe("ready");
  });

  test("CG3. 자산 완료 표시가 그 본문 sha와 맞을 때만 ready다", () => {
    const { store } = catalogWith();
    const entries = parseCachedManifest(store.get(CONTENT_MANIFEST_KEY))?.episodes ?? [];
    const keep = (id: string) => {
      const entry = entries.find((candidate) => candidate.id === id);
      return entry === undefined || isAssetsComplete(store, id, entry.sha256);
    };

    expect(statusOf(readCachedSource(store, ["u04-x"], keep))).toBe("pending");
    markAssetsComplete(store, "u04-x", "other-sha", []);
    expect(statusOf(readCachedSource(store, ["u04-x"], keep))).toBe("pending");
    markAssetsComplete(store, "u04-x", X.entry.sha256 as string, []);
    expect(statusOf(readCachedSource(store, ["u04-x"], keep))).toBe("ready");
  });
});

describe("저장 키 · 안전 도우미", () => {
  test("EC1. 활성 매니페스트 키는 그대로이고 받은 매니페스트 키가 따로 있다", () => {
    expect(CONTENT_MANIFEST_KEY).toBe("libitum.content.manifest");
    expect(CONTENT_RECEIVED_MANIFEST_KEY).toBe("libitum.content.manifest.received");
  });

  test("EC2. 저장소가 던지면 null · false · false · false이고, 정상이면 값 · true다", () => {
    const boom = (): never => {
      throw new Error("host down");
    };
    const throwing: ContentStore = { available: boom, get: boom, set: boom, remove: boom };
    expect(safeGet(throwing, "k")).toBeNull();
    expect(trySet(throwing, "k", "v")).toBe(false);
    expect(tryRemove(throwing, "k")).toBe(false);
    expect(safeAvailable(throwing)).toBe(false);

    const { store, data } = fakeStore({ k: "v" });
    expect(safeGet(store, "k")).toBe("v");
    expect(safeGet(store, "none")).toBeNull();
    expect(trySet(store, "k2", "v2")).toBe(true);
    expect(data.get("k2")).toBe("v2");
    expect(tryRemove(store, "k")).toBe(true);
    expect(data.has("k")).toBe(false);
    expect(safeAvailable(store)).toBe(true);
  });
});

// 2026-11-27 제보(zh-TW만 영어): 보류된 편은 활성 항목이 옛 것이라 나중에 생긴 언어를 적지 않습니다 — 받은 매니페스트의 항목도 함께
// 넘기면 그 언어의 저장 파일까지 읽습니다. 같은 (편, 언어)는 한 번만 읽습니다.
describe("readCachedTranslations — 활성 · 받은 매니페스트 항목", () => {
  const refOf = (language: string) => ({
    url: `translations/${language}/u04-x.json`,
    version: "v",
    sha256: "c".repeat(64),
    bytes: 1,
  });
  const active = remote("u04-x", 4, { translations: { vi: refOf("vi") } });
  const received = remote("u04-x", 4, {
    translations: { vi: refOf("vi"), "zh-TW": refOf("zh-TW") },
  });
  const entriesOf = (text: string) => parseCachedManifest(text)?.episodes ?? [];

  test("EC3. 두 매니페스트 항목을 넘기면 어느 한쪽만 적은 언어도 읽고, 같은 언어는 한 번만 읽는다", () => {
    const { store } = fakeStore({
      [contentTranslationKey("vi", "u04-x")]: "VI",
      [contentTranslationKey("zh-TW", "u04-x")]: "ZH",
    });
    const reads: string[] = [];
    const counting: ContentStore = {
      ...store,
      get: (key) => {
        reads.push(key);
        return store.get(key);
      },
    };
    const out = readCachedTranslations(counting, [
      ...entriesOf(manifestText([active])),
      ...entriesOf(manifestText([received])),
    ]);
    expect(out).toEqual({ "u04-x": { vi: "VI", "zh-TW": "ZH" } });
    expect(reads.filter((key) => key === contentTranslationKey("vi", "u04-x"))).toHaveLength(1);
  });
});
