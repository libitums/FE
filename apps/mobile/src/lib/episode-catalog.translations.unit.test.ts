import { expect, test } from "vitest";

import { bundledCatalogInput } from "./episode-bundled";
import {
  bundledCatalogInput as bundledWithVi,
  u01TitleVi,
} from "./episode-bundled.vi.test-support";
import { buildEpisodeCatalog } from "./episode-catalog";
import type { CatalogEntry } from "./episode-catalog";
import { manifestText, remote } from "./episode-refresh.test-support";

// `unit` 계층: 카탈로그가 저장된 번역 파일로 그 언어 표를 바꾼다(ADR-0102 D3) — 이긴 항목이 그 언어를 적었을 때만.

const ID = "u31-trans";
const fileText = (water: string) =>
  JSON.stringify({ schema: "translation-1", episode: ID, language: "vi", entries: { water } });
const listed = remote(ID, 31, {
  translations: {
    vi: { url: `translations/vi/${ID}.json`, version: "v1", sha256: "c".repeat(64), bytes: 1 },
  },
});
const unlisted = remote(ID, 31);

function readyOf(entries: CatalogEntry[]) {
  const found = entries.find((entry) => entry.id === ID);
  if (found?.status !== "ready") throw new Error(`준비된 ${ID}가 없습니다`);
  return found.episode;
}
const build = (r: typeof listed, translations: Record<string, Record<string, string>>) =>
  buildEpisodeCatalog({
    bundled: bundledCatalogInput,
    cache: { manifest: manifestText([r]), episodes: { [ID]: r.text }, translations },
  });

test("CT1. 매니페스트가 적은 언어의 저장 파일이 있으면 그 표가 에피소드에 실린다", () => {
  expect(readyOf(build(listed, { [ID]: { vi: fileText("nước") } })).translations?.vi).toEqual({
    water: "nước",
  });
});

test("CT2. 매니페스트가 그 언어를 적지 않았으면 저장 파일이 있어도 쓰지 않는다", () => {
  expect(readyOf(build(unlisted, { [ID]: { vi: fileText("nước") } })).translations).toBeUndefined();
});

test("CT3. 저장 파일이 틀렸으면 본문 표(여기선 없음)를 그대로 둔다", () => {
  expect(readyOf(build(listed, { [ID]: { vi: "{oops" } })).translations).toBeUndefined();
});

test("CT4. 저장 파일이 없으면 번역 입력이 없는 것과 같은 결과다", () => {
  const without = buildEpisodeCatalog({
    bundled: bundledCatalogInput,
    cache: { manifest: manifestText([listed]), episodes: { [ID]: listed.text } },
  });
  expect(readyOf(build(listed, {}))).toEqual(readyOf(without));
});

// 2026-11-27 제보(zh-TW 뜻이 영어 — 롤플레이 · 레슨 모두): 원격이 이겨도 자산을 다 받기 전에는 같은 id 내장본으로 엽니다.
// 내장본에는 vi · id · es · ja 표만 실려 있어, 받아 둔 zh-TW · th · my 파일이 그 판에 닿지 않았습니다.
const U01 = "u01-water";
const fileOf = (language: string, title: string) =>
  JSON.stringify({
    schema: "translation-1",
    episode: U01,
    language,
    entries: { "Buying Water": title },
  });
const refOf = (language: string) => ({
  url: `translations/level-5/${language}/${U01}.json`,
  version: "2026-11-18.1",
  sha256: "d".repeat(64),
  bytes: 1,
});
const newerU01 = remote(U01, 1, {
  version: "2026-11-18.1",
  translations: { "zh-TW": refOf("zh-TW"), vi: refOf("vi") },
});
function fallbackOf(translations: Record<string, Record<string, string>>) {
  const entry = buildEpisodeCatalog({
    bundled: bundledWithVi,
    // 본문이 없다 = 자산을 다 받지 않아 원격본을 열지 않은 판(로더의 `keep`) — 내장본으로 엽니다.
    cache: { manifest: manifestText([newerU01]), episodes: {}, translations },
  }).find((candidate) => candidate.id === U01);
  if (entry?.status !== "ready" || entry.source !== "bundled") {
    throw new Error("내장본으로 열지 않았습니다");
  }
  return entry.episode;
}

test("CT5. 원격이 이겼지만 내장본으로 열 때도 내장본에 없는 언어(zh-TW)의 저장 파일 표가 실린다", () => {
  const episode = fallbackOf({ [U01]: { "zh-TW": fileOf("zh-TW", "買水") } });
  expect(episode.translations?.["zh-TW"]).toEqual({ "Buying Water": "買水" });
});

test("CT6. 내장본에 있는 언어(vi)는 내장본 표를 지킨다 — 다른 판의 파일로 바꾸지 않는다", () => {
  const episode = fallbackOf({ [U01]: { vi: fileOf("vi", "Mua nước (tệp)") } });
  expect(episode.translations?.vi?.["Buying Water"]).toBe(u01TitleVi);
});

test("CT7. 내장본으로 열 때 저장 파일이 없으면 그 언어 표가 없다", () => {
  expect(fallbackOf({}).translations?.["zh-TW"]).toBeUndefined();
});
