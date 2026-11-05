import { expect, test } from "vitest";

import { bundledCatalogInput } from "./episode-bundled";
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
