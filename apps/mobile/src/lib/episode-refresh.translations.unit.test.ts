import { expect, test } from "vitest";

import { bundledCatalogInput } from "./episode-bundled";
import { contentTranslationKey } from "./episode-cache";
import { refreshEpisodeCatalog } from "./episode-refresh";
import { fakeFetch, fakeStore, manifestText, ok, remote } from "./episode-refresh.test-support";
import { sha256Hex, utf8Bytes } from "./sha256";

// `unit` 계층: 받기 차례가 번역 단계를 돈다(ADR-0102 D3) — UI 언어가 있으면 그 언어 파일을 받고 요약에 적는다.

const ID = "u31-trans";
const vi = JSON.stringify({
  schema: "translation-1",
  episode: ID,
  language: "vi",
  entries: { a: "b" },
});
const X = remote(ID, 31, {
  translations: {
    vi: {
      url: `translations/vi/${ID}.json`,
      version: "v1",
      sha256: sha256Hex(utf8Bytes(vi)),
      bytes: utf8Bytes(vi).length,
    },
  },
});
const replies = {
  "manifest.json": ok(manifestText([X])),
  [X.entry.url as string]: ok(X.text),
  [`translations/vi/${ID}.json`]: ok(vi),
};

test("RT1. UI 언어가 vi면 그 번역 파일을 받아 저장하고 요약에 적는다", async () => {
  const { fetchText, calls } = fakeFetch(replies);
  const { store, data } = fakeStore();
  const summary = await refreshEpisodeCatalog({
    fetchText,
    store,
    bundled: bundledCatalogInput,
    manifestPaths: ["manifest.json"],
    translationLanguage: "vi",
  });
  expect(calls).toContain(`translations/vi/${ID}.json`);
  expect(summary.translations).toEqual([`vi/${ID}`]);
  expect(data.get(contentTranslationKey("vi", ID))).toBe(vi);
});

test("RT2. 언어를 주지 않으면(영어) 번역 파일을 요청하지 않는다", async () => {
  const { fetchText, calls } = fakeFetch(replies);
  const { store } = fakeStore();
  const summary = await refreshEpisodeCatalog({
    fetchText,
    store,
    bundled: bundledCatalogInput,
    manifestPaths: ["manifest.json"],
  });
  expect(calls.some((call) => call.startsWith("translations/"))).toBe(false);
  expect(summary.translations).toEqual([]);
});
