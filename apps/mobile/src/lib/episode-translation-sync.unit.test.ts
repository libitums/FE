import { describe, expect, test } from "vitest";

import { contentTranslationKey } from "./episode-cache";
import { decodeManifest } from "./episode-manifest";
import type { EpisodeManifest } from "./episode-manifest";
import { fakeFetch, fakeStore, ok } from "./episode-refresh.test-support";
import { sha256Hex, utf8Bytes } from "./sha256";
import { syncTranslations } from "./episode-translation-sync";

// `unit` 계층: 받기 차례의 번역 단계(ADR-0102 D3) — UI 언어 파일만 · 같은 sha면 건너뜀 · 검증 실패는 저장 안 함 ·
// 한 편이 실패해도 다음 편으로.

const fileText = (id: string, lang: string, water = "nước") =>
  JSON.stringify({ schema: "translation-1", episode: id, language: lang, entries: { water } });
const ref = (id: string, lang: string, text: string) => ({
  url: `translations/${lang}/${id}.json`,
  version: "2026-11-05.2",
  sha256: sha256Hex(utf8Bytes(text)),
  bytes: utf8Bytes(text).length,
});
function manifestOf(entries: { id: string; langs: Record<string, string> }[]): EpisodeManifest {
  const decoded = decodeManifest({
    schema: "manifest-1",
    generated_at: "2026-11-05T00:00:00Z",
    episodes: entries.map(({ id, langs }, index) => ({
      id,
      order: index + 1,
      title: id,
      schema: "delivery-2",
      version: "v1",
      sha256: "a".repeat(64),
      bytes: 1,
      url: `episodes/level-4/${id}.json`,
      translations: Object.fromEntries(
        Object.entries(langs).map(([lang, text]) => [lang, ref(id, lang, text)]),
      ),
    })),
  });
  if (!decoded.ok) throw new Error("매니페스트 픽스처가 틀렸습니다");
  return decoded.manifest;
}

const A = "u01-a";
const B = "u02-b";

describe("syncTranslations", () => {
  test("TS1. 지금 언어의 파일만 받아 저장하고 받은 목록을 돌려준다", async () => {
    const viA = fileText(A, "vi");
    const viB = fileText(B, "vi");
    const manifest = manifestOf([
      { id: A, langs: { vi: viA, ja: fileText(A, "ja", "水") } },
      { id: B, langs: { vi: viB } },
    ]);
    const { fetchText, calls } = fakeFetch({
      [`translations/vi/${A}.json`]: ok(viA),
      [`translations/vi/${B}.json`]: ok(viB),
    });
    const { store, data } = fakeStore();

    const stored = await syncTranslations({ fetchText, store, manifest, language: "vi" });

    expect(calls).toEqual([`translations/vi/${A}.json`, `translations/vi/${B}.json`]);
    expect(stored).toEqual([`vi/${A}`, `vi/${B}`]);
    expect(data.get(contentTranslationKey("vi", A))).toBe(viA);
  });

  test("TS2. 저장된 파일의 sha가 매니페스트와 같으면 받지 않는다", async () => {
    const viA = fileText(A, "vi");
    const manifest = manifestOf([{ id: A, langs: { vi: viA } }]);
    const { fetchText, calls } = fakeFetch({});
    const { store } = fakeStore({ [contentTranslationKey("vi", A)]: viA });

    expect(await syncTranslations({ fetchText, store, manifest, language: "vi" })).toEqual([]);
    expect(calls).toEqual([]);
  });

  test("TS3. 받은 원문의 sha가 다르거나 형식이 틀리면 저장하지 않고 예전 파일을 지킨다", async () => {
    const viA = fileText(A, "vi");
    const old = fileText(A, "vi", "cũ");
    const manifest = manifestOf([
      { id: A, langs: { vi: viA } },
      { id: B, langs: { vi: "not json" } },
    ]);
    const { fetchText } = fakeFetch({
      [`translations/vi/${A}.json`]: ok(fileText(A, "vi", "khác")),
      [`translations/vi/${B}.json`]: ok("not json"),
    });
    const { store, data } = fakeStore({ [contentTranslationKey("vi", A)]: old });

    expect(await syncTranslations({ fetchText, store, manifest, language: "vi" })).toEqual([]);
    expect(data.get(contentTranslationKey("vi", A))).toBe(old);
    expect(data.has(contentTranslationKey("vi", B))).toBe(false);
  });

  test("TS4. 영어(null)거나 매니페스트에 그 언어가 없으면 아무것도 받지 않는다", async () => {
    const manifest = manifestOf([{ id: A, langs: { ja: fileText(A, "ja", "水") } }]);
    const { fetchText, calls } = fakeFetch({});
    const { store } = fakeStore();

    expect(await syncTranslations({ fetchText, store, manifest, language: null })).toEqual([]);
    expect(await syncTranslations({ fetchText, store, manifest, language: "vi" })).toEqual([]);
    expect(calls).toEqual([]);
  });

  test("TS5. 한 편의 연결 실패 · 서버 오류는 그 편만 건너뛰고 다음 편을 받는다", async () => {
    const viB = fileText(B, "vi");
    const manifest = manifestOf([
      { id: A, langs: { vi: fileText(A, "vi") } },
      { id: B, langs: { vi: viB } },
    ]);
    const { fetchText } = fakeFetch({
      [`translations/vi/${A}.json`]: "reject",
      [`translations/vi/${B}.json`]: ok(viB),
    });
    const { store } = fakeStore();

    expect(await syncTranslations({ fetchText, store, manifest, language: "vi" })).toEqual([
      `vi/${B}`,
    ]);
  });

  test("TS6. 저장소 쓰기가 던져도 던지지 않고 그 편은 받은 목록에 없다", async () => {
    const viA = fileText(A, "vi");
    const manifest = manifestOf([{ id: A, langs: { vi: viA } }]);
    const { fetchText } = fakeFetch({ [`translations/vi/${A}.json`]: ok(viA) });
    const { store } = fakeStore({}, { throwOnSet: true });

    await expect(syncTranslations({ fetchText, store, manifest, language: "vi" })).resolves.toEqual(
      [],
    );
  });
});
