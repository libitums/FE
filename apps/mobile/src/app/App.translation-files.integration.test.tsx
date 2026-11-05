import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, expect, test } from "vitest";
import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import {
  CONTENT_MANIFEST_KEY,
  contentEpisodeKey,
  contentTranslationKey,
} from "../lib/episode-cache";
import { sha256Hex, utf8Bytes } from "../lib/sha256";
import { saveUiLanguage, uiLanguageStorageKey } from "../lib/ui-language";
import { resetApp } from "./test-helpers/episode-format-harness";
import { tutorialDoneProgress } from "./test-helpers/progress-seed";
import { bootTutorialApp, flushAsync } from "./test-helpers/tutorial-boot";

// `integration` 계층: 언어별 번역 파일(ADR-0102)이 실제 앱 트리에서 — 받기 차례가 UI 언어 파일만 받아 저장하고,
// 카탈로그가 그 표로 본문 표를 바꿔 화면(롤플레이 목록의 에피소드 제목 = `titleEn`)까지 닿는다. 언어를 바꾸면
// 그 언어 파일을 받는다. 대역은 경계뿐입니다(저장소 · fetch).

afterEach(resetApp);

const U01 = "u01-water";
const bodyText = readFileSync(resolve(process.cwd(), "content/episodes/u01-water.json"), "utf8");
const fileOf = (language: string, title: string) =>
  JSON.stringify({
    schema: "translation-1",
    episode: U01,
    language,
    entries: { "Buying Water": title },
  });
const VI = fileOf("vi", "Mua nước (tệp)");
const JA = fileOf("ja", "水を買う（ファイル）");
const refOf = (language: string, text: string) => ({
  url: `translations/${language}/${U01}.json`,
  version: "2026-11-06.1",
  sha256: sha256Hex(utf8Bytes(text)),
  bytes: utf8Bytes(text).length,
});
// 내장(2026-11-04.2)보다 높은 판이라 원격이 이깁니다. 본문은 내장과 같은 바이트(본문 안 vi 표는 「Mua nước」).
const manifest = JSON.stringify({
  schema: "manifest-1",
  generated_at: "2026-11-06T00:00:00Z",
  min_client_level: 4,
  episodes: [
    {
      id: U01,
      order: 1,
      title: "물 사기",
      schema: "delivery-2",
      version: "2026-11-06.1",
      sha256: sha256Hex(utf8Bytes(bodyText)),
      bytes: utf8Bytes(bodyText).length,
      url: `episodes/level-4/${U01}.json`,
      translations: { vi: refOf("vi", VI), ja: refOf("ja", JA) },
    },
  ],
});
const serve = {
  manifest,
  episodes: {},
  files: {
    "manifests/level-4.json": manifest,
    [`episodes/level-4/${U01}.json`]: bodyText,
    [`translations/vi/${U01}.json`]: VI,
    [`translations/ja/${U01}.json`]: JA,
  },
};
const progressSeed = {
  catalogProgress: {
    ...tutorialDoneProgress(),
    [U01]: ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"],
  },
};

const SETTINGS_LANGUAGE_ROW = () =>
  within(screen.getByTestId("ui-lynx-settings-group-item-language")).getByTestId(
    "ui-lynx-settings-cell",
  );

function roleplayTitle(): string {
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  return screen.getByTestId(`roleplay-list-item-title-story-${U01}`).textContent ?? "";
}

test("ITF1. 저장된 vi 번역 파일이 있으면 본문 안 표 대신 파일 표가 화면에 닿는다", async () => {
  await bootTutorialApp({
    offline: true,
    progressSeed,
    preStore: {
      [uiLanguageStorageKey]: "vi",
      [CONTENT_MANIFEST_KEY]: manifest,
      [contentEpisodeKey(U01)]: bodyText,
      [contentTranslationKey("vi", U01)]: VI,
    },
  });
  expect(roleplayTitle()).toBe("Mua nước (tệp)");
});

test("ITF2. vi 사용자의 받기 차례는 수준 4 매니페스트에서 vi 파일만 받아 저장하고, 다음 실행의 화면이 그 표를 쓴다", async () => {
  const { urls, store } = await bootTutorialApp({
    serve,
    progressSeed,
    preStore: { [uiLanguageStorageKey]: "vi" },
  });
  await flushAsync();

  expect(urls.some((url) => url.includes("manifests/level-4.json"))).toBe(true);
  expect(urls.some((url) => url.includes(`translations/vi/${U01}.json`))).toBe(true);
  expect(urls.some((url) => url.includes(`translations/ja/${U01}.json`))).toBe(false);
  expect(store.get(contentTranslationKey("vi", U01))).toBe(VI);

  // 이번 실행은 이미 연 내장 판을 지킵니다(ADR-0056 D3) — 받은 원격 판과 번역은 다음 실행에 섭니다.
  resetApp();
  await bootTutorialApp({ offline: true, progressSeed, store });
  expect(roleplayTitle()).toBe("Mua nước (tệp)");
});

test("ITF3. UI 언어를 ja로 저장하면 받기를 다시 돌려 ja 파일을 받는다", async () => {
  const { urls, store } = await bootTutorialApp({
    serve,
    progressSeed,
    preStore: { [uiLanguageStorageKey]: "vi" },
  });
  await flushAsync();
  expect(store.has(contentTranslationKey("ja", U01))).toBe(false);

  await act(async () => {
    saveUiLanguage("ja");
  });
  await flushAsync();

  expect(urls.some((url) => url.includes(`translations/ja/${U01}.json`))).toBe(true);
  expect(store.get(contentTranslationKey("ja", U01))).toBe(JA);
});

test("ITF4. 원격 판이 열린 채 설정에서 언어를 ja로 바꾸면 ja 파일을 받아 같은 실행 안에서 화면에 닿는다", async () => {
  await bootTutorialApp({
    serve,
    progressSeed,
    preStore: {
      [uiLanguageStorageKey]: "vi",
      [CONTENT_MANIFEST_KEY]: manifest,
      [contentEpisodeKey(U01)]: bodyText,
      [contentTranslationKey("vi", U01)]: VI,
    },
  });
  await flushAsync();
  expect(roleplayTitle()).toBe("Mua nước (tệp)");

  // 설정 › Language에서 ja를 고릅니다 — 세션 언어가 바뀌고 저장되며, 저장 알림이 받기를 다시 돌립니다.
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
  fireEvent.tap(SETTINGS_LANGUAGE_ROW(), {});
  await act(async () => {
    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-ja"), {});
  });
  await flushAsync();
  fireEvent.tap(
    within(screen.getByTestId("language-select-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );

  expect(roleplayTitle()).toBe("水を買う（ファイル）");
});
