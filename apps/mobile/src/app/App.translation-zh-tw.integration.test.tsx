import { openSettingsFromMore } from "./test-helpers/more-menu";
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
import { uiCopyEn } from "../lib/ui-copy-en";
import { uiCopyZhTw } from "../lib/ui-copy-zh-tw";
import { uiLanguageStorageKey } from "../lib/ui-language";
import { resetApp } from "./test-helpers/episode-format-harness";
import { tutorialDoneProgress } from "./test-helpers/progress-seed";
import { bootTutorialApp, flushAsync } from "./test-helpers/tutorial-boot";

// `integration` 계층: 대만 중국어(ADR-0185 개정 2026-11-24) — th · my와 같은 길. 고르면 받기 차례가 매니페스트의 zh-TW 번역 파일만 받아
// 에피소드 영어 칸을 바꾸고, 화면 문구도 대만 중국어 표다. 매니페스트에 zh-TW 항목이 없으면(운영 업로드 전) 영어 원문 그대로다.
// 대역은 경계뿐입니다(저장소 · fetch).

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
const TH = fileOf("th", "ซื้อน้ำ (ไฟล์)");
const ZH = fileOf("zh-TW", "買水（檔案）");
const refOf = (language: string, text: string) => ({
  url: `translations/level-5/${language}/${U01}.json`,
  version: "2026-11-24.1",
  sha256: sha256Hex(utf8Bytes(text)),
  bytes: utf8Bytes(text).length,
});
const manifestWith = (translations: Record<string, unknown>) =>
  JSON.stringify({
    schema: "manifest-1",
    generated_at: "2026-11-24T00:00:00Z",
    min_client_level: 4,
    episodes: [
      {
        id: U01,
        order: 1,
        title: "물 사기",
        schema: "delivery-2",
        version: "2026-11-24.1",
        sha256: sha256Hex(utf8Bytes(bodyText)),
        bytes: utf8Bytes(bodyText).length,
        url: `episodes/level-4/${U01}.json`,
        translations,
      },
    ],
  });
const manifest = manifestWith({ th: refOf("th", TH), "zh-TW": refOf("zh-TW", ZH) });
const serveOf = (text: string) => ({
  manifest: text,
  episodes: {},
  files: {
    "manifests/level-4.json": text,
    [`episodes/level-4/${U01}.json`]: bodyText,
    [`translations/level-5/th/${U01}.json`]: TH,
    [`translations/level-5/zh-TW/${U01}.json`]: ZH,
  },
});
const progressSeed = {
  catalogProgress: {
    ...tutorialDoneProgress(),
    [U01]: ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"],
  },
};

function roleplayTitle(): string {
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  return screen.getByTestId(`roleplay-list-item-title-story-${U01}`).textContent ?? "";
}

test("ITW1. 설정 › Language에서 繁體中文을 고르면 zh-TW 파일만 받아 같은 실행 안에서 이야기 · 화면 문구가 대만 중국어다", async () => {
  const { urls, store } = await bootTutorialApp({
    serve: serveOf(manifest),
    progressSeed,
    preStore: { [CONTENT_MANIFEST_KEY]: manifest, [contentEpisodeKey(U01)]: bodyText },
  });
  await flushAsync();
  expect(store.has(contentTranslationKey("zh-TW", U01))).toBe(false);

  openSettingsFromMore();
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-settings-group-item-language")).getByTestId(
      "ui-lynx-settings-cell",
    ),
    {},
  );
  await act(async () => {
    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-zh-TW"), {});
  });
  await flushAsync();
  fireEvent.tap(
    within(screen.getByTestId("language-select-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
  await flushAsync();

  expect(store.get(contentTranslationKey("zh-TW", U01))).toBe(ZH);
  expect(urls.some((url) => url.includes(`translations/level-5/th/${U01}.json`))).toBe(false);
  expect(roleplayTitle()).toBe("買水（檔案）");
  openSettingsFromMore();
  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent(uiCopyZhTw.settings.title);
  expect(uiCopyZhTw.settings.title).not.toBe(uiCopyEn.settings.title);
});

test("ITW2. 저장된 zh-TW 사용자의 받기 차례는 zh-TW 파일만 받고, 다음 실행(오프라인)의 이야기 · 화면 문구가 대만 중국어다", async () => {
  const { urls, store } = await bootTutorialApp({
    serve: serveOf(manifest),
    progressSeed,
    preStore: { [uiLanguageStorageKey]: "zh-TW" },
  });
  await flushAsync();

  expect(urls.some((url) => url.includes(`translations/level-5/zh-TW/${U01}.json`))).toBe(true);
  expect(urls.some((url) => url.includes(`translations/level-5/th/${U01}.json`))).toBe(false);
  expect(store.get(contentTranslationKey("zh-TW", U01))).toBe(ZH);

  resetApp();
  await bootTutorialApp({ offline: true, progressSeed, store });
  expect(roleplayTitle()).toBe("買水（檔案）");
  openSettingsFromMore();
  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent(uiCopyZhTw.settings.title);
});

test("ITW3. 매니페스트에 zh-TW 항목이 없으면(운영 업로드 전) 번역 파일을 받지 않고 이야기는 영어 원문이다", async () => {
  const thOnly = manifestWith({ th: refOf("th", TH) });
  const { urls } = await bootTutorialApp({
    serve: serveOf(thOnly),
    progressSeed,
    preStore: { [uiLanguageStorageKey]: "zh-TW" },
  });
  await flushAsync();

  expect(urls.some((url) => url.includes("translations/level-5/"))).toBe(false);
  expect(roleplayTitle()).toBe("Buying Water");
});
