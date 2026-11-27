import { expect, test, vi } from "vitest";

import {
  CONTENT_MANIFEST_KEY,
  CONTENT_RECEIVED_MANIFEST_KEY,
  contentTranslationKey,
} from "../lib/episode-cache";
import {
  fakeFetch,
  fakeStore,
  manifestText,
  ok,
  remote,
} from "../lib/episode-refresh.test-support";
import { sha256Hex, utf8Bytes } from "../lib/sha256";
import { createLanguageDownloadPort } from "./language-download-port";

// `unit` 계층: 언어 바꿈 받기의 포트(ADR-0102 개정 ⟨언어 바꿈 받기⟩) — 받을 편 · 크기 세기(받은 매니페스트가 먼저) · 받은 뒤
// 새로 저장한 파일이 있을 때만 카탈로그를 다시 읽음.

const ID = "u31-ld";
const ZH = JSON.stringify({
  schema: "translation-1",
  episode: ID,
  language: "zh-TW",
  entries: { water: "水" },
});
const zhRef = {
  url: `translations/zh-TW/${ID}.json`,
  version: "v2",
  sha256: sha256Hex(utf8Bytes(ZH)),
  bytes: utf8Bytes(ZH).length,
};
const withZh = manifestText([remote(ID, 31, { translations: { "zh-TW": zhRef } })]);
const withoutZh = manifestText([remote(ID, 31)]);

function portOf(initial: Record<string, string>, files: Record<string, string> = {}) {
  const { store } = fakeStore(initial);
  const replies = Object.fromEntries(Object.entries(files).map(([path, text]) => [path, ok(text)]));
  const { fetchText, calls } = fakeFetch(replies);
  const reload = vi.fn<() => void>();
  const port = createLanguageDownloadPort({ store, fetchText, reload, offline: () => false });
  return { port, calls, reload };
}

test("LDP1. 받은 매니페스트가 있으면 그 항목으로 받을 편 · 크기를 센다(활성 항목이 옛 것이어도)", () => {
  const { port } = portOf({
    [CONTENT_MANIFEST_KEY]: withoutZh,
    [CONTENT_RECEIVED_MANIFEST_KEY]: withZh,
  });
  expect(port.plan("zh-TW")).toEqual({ total: 1, bytes: zhRef.bytes });
});

test("LDP2. 저장 파일이 맞거나 매니페스트가 없으면 받을 것이 없다(null)", () => {
  expect(
    portOf({ [CONTENT_MANIFEST_KEY]: withZh, [contentTranslationKey("zh-TW", ID)]: ZH }).port.plan(
      "zh-TW",
    ),
  ).toBeNull();
  expect(portOf({}).port.plan("zh-TW")).toBeNull();
});

test("LDP3. 받아 저장했으면 카탈로그를 다시 읽고, 못 받았으면 읽지 않는다", async () => {
  const done = portOf({ [CONTENT_MANIFEST_KEY]: withZh }, { [zhRef.url]: ZH });
  expect(await done.port.run("zh-TW", () => undefined)).toEqual({
    stored: [`zh-TW/${ID}`],
    failed: 0,
    total: 1,
  });
  expect(done.reload).toHaveBeenCalledTimes(1);

  const failed = portOf({ [CONTENT_MANIFEST_KEY]: withZh });
  expect((await failed.port.run("zh-TW", () => undefined)).failed).toBe(1);
  expect(failed.reload).not.toHaveBeenCalled();
});
