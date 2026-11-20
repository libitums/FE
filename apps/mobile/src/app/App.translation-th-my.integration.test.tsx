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
import { uiCopyMy } from "../lib/ui-copy-my";
import { uiCopyTh } from "../lib/ui-copy-th";
import { uiLanguageStorageKey } from "../lib/ui-language";
import { resetApp } from "./test-helpers/episode-format-harness";
import { tutorialDoneProgress } from "./test-helpers/progress-seed";
import { bootTutorialApp, flushAsync } from "./test-helpers/tutorial-boot";

// `integration` 계층: 태국어 · 미얀마어(ADR-0158, 2026-11-20 개정) — 고르면 받기 차례가 그 언어 번역 파일만 받아 에피소드 영어 칸을
// 바꾸고, 화면 문구도 그 언어 표다(전에는 영어). 대역은 경계뿐입니다(저장소 · fetch).

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
const MY = fileOf("my", "ရေဝယ်ခြင်း (ဖိုင်)");
const refOf = (language: string, text: string) => ({
  url: `translations/level-5/${language}/${U01}.json`,
  version: "2026-11-18.1",
  sha256: sha256Hex(utf8Bytes(text)),
  bytes: utf8Bytes(text).length,
});
const manifest = JSON.stringify({
  schema: "manifest-1",
  generated_at: "2026-11-18T00:00:00Z",
  min_client_level: 4,
  episodes: [
    {
      id: U01,
      order: 1,
      title: "물 사기",
      schema: "delivery-2",
      version: "2026-11-18.1",
      sha256: sha256Hex(utf8Bytes(bodyText)),
      bytes: utf8Bytes(bodyText).length,
      url: `episodes/level-4/${U01}.json`,
      translations: { th: refOf("th", TH), my: refOf("my", MY) },
    },
  ],
});
const serve = {
  manifest,
  episodes: {},
  files: {
    "manifests/level-4.json": manifest,
    [`episodes/level-4/${U01}.json`]: bodyText,
    [`translations/level-5/th/${U01}.json`]: TH,
    [`translations/level-5/my/${U01}.json`]: MY,
  },
};
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

test("ITH1. th 사용자의 받기 차례는 th 파일만 받고, 다음 실행의 이야기 · 화면 문구가 모두 태국어다", async () => {
  const { urls, store } = await bootTutorialApp({
    serve,
    progressSeed,
    preStore: { [uiLanguageStorageKey]: "th" },
  });
  await flushAsync();

  expect(urls.some((url) => url.includes(`translations/level-5/th/${U01}.json`))).toBe(true);
  expect(urls.some((url) => url.includes(`translations/level-5/my/${U01}.json`))).toBe(false);
  expect(store.get(contentTranslationKey("th", U01))).toBe(TH);

  resetApp();
  await bootTutorialApp({ offline: true, progressSeed, store });
  expect(roleplayTitle()).toBe("ซื้อน้ำ (ไฟล์)");
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent(uiCopyTh.settings.title);
  expect(uiCopyTh.settings.title).not.toBe(uiCopyEn.settings.title);
});

test("ITH2. 원격 판이 열린 채 설정 › Language에서 Burmese를 고르면 my 파일을 받아 같은 실행 안에서 이야기 · 화면 문구가 미얀마어다", async () => {
  const { store } = await bootTutorialApp({
    serve,
    progressSeed,
    preStore: { [CONTENT_MANIFEST_KEY]: manifest, [contentEpisodeKey(U01)]: bodyText },
  });
  await flushAsync();
  expect(store.has(contentTranslationKey("my", U01))).toBe(false);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-settings-group-item-language")).getByTestId(
      "ui-lynx-settings-cell",
    ),
    {},
  );
  await act(async () => {
    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-my"), {});
  });
  await flushAsync();
  fireEvent.tap(
    within(screen.getByTestId("language-select-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );

  expect(store.get(contentTranslationKey("my", U01))).toBe(MY);
  expect(roleplayTitle()).toBe("ရေဝယ်ခြင်း (ဖိုင်)");
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent(uiCopyMy.settings.title);
  expect(uiCopyMy.settings.title).not.toBe(uiCopyEn.settings.title);
});
