import { openSettingsFromMore } from "./test-helpers/more-menu";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, expect, test } from "vitest";
import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { CONTENT_MANIFEST_KEY, contentEpisodeKey } from "../lib/episode-cache";
import { sha256Hex, utf8Bytes } from "../lib/sha256";
import { uiCopyEn } from "../lib/ui-copy-en";
import { uiCopyZhTw } from "../lib/ui-copy-zh-tw";
import { uiLanguageStorageKey } from "../lib/ui-language";
import { resetApp } from "./test-helpers/episode-format-harness";
import { tutorialDoneProgress } from "./test-helpers/progress-seed";
import { bootTutorialApp, flushAsync } from "./test-helpers/tutorial-boot";

// `integration` 계층: 대만 중국어(ADR-0185) — 설정 › Language에서 고르면 같은 실행 안에서 화면 문구가 대만 중국어 표로 바뀌고,
// 이야기 번역 파일은 없으므로 받지 않고 에피소드는 영어 원문 그대로다(콘텐츠 번역은 범위 밖). 대역은 경계뿐입니다(저장소 · fetch).

afterEach(resetApp);

const U01 = "u01-water";
const bodyText = readFileSync(resolve(process.cwd(), "content/episodes/u01-water.json"), "utf8");
const TH = JSON.stringify({
  schema: "translation-1",
  episode: U01,
  language: "th",
  entries: { "Buying Water": "ซื้อน้ำ (ไฟล์)" },
});
const manifest = JSON.stringify({
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
      translations: {
        th: {
          url: `translations/level-5/th/${U01}.json`,
          version: "2026-11-24.1",
          sha256: sha256Hex(utf8Bytes(TH)),
          bytes: utf8Bytes(TH).length,
        },
      },
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

test("ITW1. 설정 › Language에서 繁體中文을 고르면 같은 실행 안에서 화면 문구가 대만 중국어이고, 이야기는 영어 원문이다", async () => {
  const { urls } = await bootTutorialApp({
    serve,
    progressSeed,
    preStore: { [CONTENT_MANIFEST_KEY]: manifest, [contentEpisodeKey(U01)]: bodyText },
  });
  await flushAsync();

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

  expect(urls.some((url) => url.includes("translations/level-5/zh-TW"))).toBe(false);
  expect(roleplayTitle()).toBe("Buying Water");
  openSettingsFromMore();
  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent(uiCopyZhTw.settings.title);
  expect(uiCopyZhTw.settings.title).not.toBe(uiCopyEn.settings.title);
});

test("ITW2. 저장된 zh-TW로 다시 열면 번역 파일을 받지 않고 처음부터 대만 중국어 화면이다", async () => {
  const { urls } = await bootTutorialApp({
    serve,
    progressSeed,
    preStore: { [uiLanguageStorageKey]: "zh-TW" },
  });
  await flushAsync();

  expect(urls.some((url) => url.includes("translations/level-5/"))).toBe(false);
  openSettingsFromMore();
  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent(uiCopyZhTw.settings.title);
});
