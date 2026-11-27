import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, expect, test } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";

import {
  CONTENT_MANIFEST_KEY,
  CONTENT_RECEIVED_MANIFEST_KEY,
  contentEpisodeKey,
  contentTranslationKey,
} from "../lib/episode-cache";
import { sha256Hex, utf8Bytes } from "../lib/sha256";
import { uiLanguageStorageKey } from "../lib/ui-language";
import { resetApp } from "./test-helpers/episode-format-harness";
import { tutorialDoneProgress } from "./test-helpers/progress-seed";
import { bootTutorialApp } from "./test-helpers/tutorial-boot";

// `integration` 계층(2026-11-27 제보 — 같은 iPhone에서 vi는 뜻이 나오고 zh-TW만 영어, 껐다 켜도 그대로): 새 판의 자산을 다 받지 못해
// 바뀐 편이 보류(스테이징)된 기기는 활성 매니페스트가 그 편의 **옛 항목**을 지킵니다. 옛 항목은 zh-TW가 생기기 전 것이라 번역 항목이
// vi · id · es · ja뿐이고, 원격 본문(번역표 없음)이 이겨 내장 zh-TW 표도 닿지 않습니다. 받아 둔 zh-TW 파일이 있어도 카탈로그가
// 활성 항목이 적은 언어만 읽어 뜻이 영어로 남았습니다. 대역은 경계뿐입니다(저장소 · fetch 연결 실패).

afterEach(resetApp);

const U01 = "u01-water";
// 원격 본문은 번역표를 싣지 않습니다(level-5 — 언어별 파일). 내장본에서 표를 뺀 사본을 원격 본문으로 씁니다.
const bundledBody = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../content/episodes/u01-water.json"), "utf8"),
) as Record<string, unknown>;
const { translations: _tables, ...remoteBody } = bundledBody;
const bodyText = JSON.stringify(remoteBody);

const fileOf = (language: string, title: string) =>
  JSON.stringify({
    schema: "translation-1",
    episode: U01,
    language,
    entries: { "Buying Water": title },
  });
const FILES: Record<string, string> = {
  vi: fileOf("vi", "Mua nước (tệp)"),
  "zh-TW": fileOf("zh-TW", "買水（檔案）"),
  th: fileOf("th", "ซื้อน้ำ (ไฟล์)"),
};
const refOf = (language: string, version: string) => ({
  url: `translations/level-5/${language}/${U01}.json`,
  version,
  sha256: sha256Hex(utf8Bytes(FILES[language] ?? "")),
  bytes: utf8Bytes(FILES[language] ?? "").length,
});
const entryOf = (version: string, languages: readonly string[], sha: string) => ({
  id: U01,
  order: 1,
  title: "물 사기",
  schema: "delivery-2",
  version,
  sha256: sha,
  bytes: 1,
  url: `episodes/level-5/${U01}.json`,
  translations: Object.fromEntries(
    languages.map((language) => [language, refOf(language, version)]),
  ),
});
const manifestOf = (entry: ReturnType<typeof entryOf>) =>
  JSON.stringify({
    schema: "manifest-1",
    generated_at: "2026-11-24T00:00:00Z",
    min_client_level: 5,
    episodes: [entry],
  });

// 활성: 옛 판(2026-11-13.1) — 그때 매니페스트는 zh-TW · th를 적지 않았습니다. 받은 것: 새 판(보류 중) — 모든 언어를 적습니다.
const ACTIVE = manifestOf(entryOf("2026-11-13.1", ["vi"], sha256Hex(utf8Bytes(bodyText))));
const RECEIVED = manifestOf(entryOf("2026-11-18.1", ["vi", "zh-TW", "th"], "e".repeat(64)));

async function roleplayTitleIn(language: string): Promise<string> {
  await bootTutorialApp({
    offline: true,
    progressSeed: {
      catalogProgress: {
        ...tutorialDoneProgress(),
        [U01]: ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"],
      },
    },
    preStore: {
      [uiLanguageStorageKey]: language,
      [CONTENT_MANIFEST_KEY]: ACTIVE,
      [CONTENT_RECEIVED_MANIFEST_KEY]: RECEIVED,
      [contentEpisodeKey(U01)]: bodyText,
      [contentTranslationKey(language, U01)]: FILES[language] ?? "",
    },
  });
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  return screen.getByTestId(`roleplay-list-item-title-story-${U01}`).textContent ?? "";
}

test("IHE1. vi — 옛 활성 항목이 적은 언어는 받아 둔 파일 표로 뜻이 선다(비교 기준)", async () => {
  expect(await roleplayTitleIn("vi")).toBe("Mua nước (tệp)");
});

test.each([
  ["zh-TW", "買水（檔案）"],
  ["th", "ซื้อน้ำ (ไฟล์)"],
])(
  "IHE2. %s — 옛 활성 항목이 적지 않았어도 받은 매니페스트가 적은 언어의 받아 둔 파일로 뜻이 선다",
  async (language, title) => {
    expect(await roleplayTitleIn(language)).toBe(title);
  },
);
