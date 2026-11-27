import { describe, expect, test } from "vitest";

import { contentTranslationKey } from "./episode-cache";
import { decodeManifest } from "./episode-manifest";
import type { EpisodeManifest } from "./episode-manifest";
import { fakeFetch, fakeStore, ok } from "./episode-refresh.test-support";
import type { FetchText } from "./episode-remote";
import { sha256Hex, utf8Bytes } from "./sha256";
import { syncTranslationsReport, translationJobsOf } from "./episode-translation-sync";

// `unit` 계층: 언어 바꿈 받기(ADR-0102 개정 ⟨언어 바꿈 받기⟩)가 쓰는 받기 함수 — 받을 편 세기 · 진행 · 실패 수 · 같은 파일 요청 합치기.

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

describe("syncTranslationsReport", () => {
  test("TR1. 받을 편은 저장 파일이 없거나 sha가 다른 편뿐이고, 영어면 없다", () => {
    const viA = fileText(A, "vi");
    const viB = fileText(B, "vi");
    const manifest = manifestOf([
      { id: A, langs: { vi: viA } },
      { id: B, langs: { vi: viB } },
    ]);
    const { store } = fakeStore({ [contentTranslationKey("vi", A)]: viA });
    expect(translationJobsOf(manifest, "vi", store).map((job) => job.id)).toEqual([B]);
    expect(translationJobsOf(manifest, null, store)).toEqual([]);
    expect(translationJobsOf(manifest, "ja", store)).toEqual([]);
  });

  test("TR2. 한 편이 끝날 때마다 진행을 알리고, 받지 못한 편을 실패로 센다", async () => {
    const viA = fileText(A, "vi");
    const viB = fileText(B, "vi");
    const manifest = manifestOf([
      { id: A, langs: { vi: viA } },
      { id: B, langs: { vi: viB } },
    ]);
    const { fetchText } = fakeFetch({ [`translations/vi/${A}.json`]: ok(viA) });
    const { store } = fakeStore();
    const progress: [number, number][] = [];

    const report = await syncTranslationsReport({
      fetchText,
      store,
      manifest,
      language: "vi",
      onProgress: (done, total) => progress.push([done, total]),
    });

    expect(report).toEqual({ stored: [`vi/${A}`], failed: 1, total: 2 });
    expect(progress).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });

  test("TR3. 같은 파일을 받는 중에 또 받으면 요청은 한 번이고 둘 다 저장된 것으로 본다", async () => {
    const viA = fileText(A, "vi");
    const manifest = manifestOf([{ id: A, langs: { vi: viA } }]);
    const calls: string[] = [];
    let release: (() => void) | undefined;
    const fetchText: FetchText = (relative) => {
      calls.push(relative);
      return new Promise((resolve) => {
        release = () => resolve({ ok: true, status: 200, text: viA });
      });
    };
    const { store } = fakeStore();

    const first = syncTranslationsReport({ fetchText, store, manifest, language: "vi" });
    const second = syncTranslationsReport({ fetchText, store, manifest, language: "vi" });
    release?.();

    expect(await first).toEqual({ stored: [`vi/${A}`], failed: 0, total: 1 });
    expect(await second).toEqual({ stored: [`vi/${A}`], failed: 0, total: 1 });
    expect(calls).toEqual([`translations/vi/${A}.json`]);
  });
});
