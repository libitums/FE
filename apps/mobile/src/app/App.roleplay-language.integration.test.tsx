import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import {
  CONTENT_MANIFEST_KEY,
  contentEpisodeKey,
  contentTranslationKey,
} from "../lib/episode-cache";
import { sha256Hex, utf8Bytes } from "../lib/sha256";
import { uiLanguageStorageKey } from "../lib/ui-language";
import { resetApp } from "./test-helpers/episode-format-harness";
import { tutorialDoneProgress } from "./test-helpers/progress-seed";
import { bootTutorialApp } from "./test-helpers/tutorial-boot";

// `integration` 계층(2026-11-27 제보 — zh-TW로 롤플레이 · 레슨의 뜻이 영어): 원격 판이 이겼지만 자산을 다 받기 전이라 같은 id
// 내장본으로 여는 기기에서, 받아 둔 zh-TW 번역 파일이 화면까지 닿는가를 App 한 트리로 봅니다. 대역은 경계뿐입니다 —
// 저장소 · `ContentFileModule`(받은 자산 없음) · `fetch`(연결 실패).

afterEach(resetApp);

const U01 = "u01-water";
const bodyText = readFileSync(resolve(process.cwd(), "content/episodes/u01-water.json"), "utf8");
const zhFile = JSON.stringify({
  schema: "translation-1",
  episode: U01,
  language: "zh-TW",
  entries: {
    "Buying Water": "買水",
    "Would you like a bag?": "需要塑膠袋嗎？",
    "No, I'm fine.": "不用了，沒關係。",
  },
});
// 내장(2026-11-04.2)보다 높은 판이라 원격이 이깁니다. 자산을 받지 않았으니 로더가 원격 본문을 내려놓고 내장본으로 엽니다.
const manifest = JSON.stringify({
  schema: "manifest-1",
  generated_at: "2026-11-18T00:00:00Z",
  min_client_level: 5,
  episodes: [
    {
      id: U01,
      order: 1,
      title: "물 사기",
      schema: "delivery-2",
      version: "2026-11-18.1",
      sha256: sha256Hex(utf8Bytes(bodyText)),
      bytes: utf8Bytes(bodyText).length,
      url: `episodes/level-5/${U01}.json`,
      translations: {
        "zh-TW": {
          url: `translations/level-5/zh-TW/${U01}.json`,
          version: "2026-11-18.1",
          sha256: sha256Hex(utf8Bytes(zhFile)),
          bytes: utf8Bytes(zhFile).length,
        },
      },
    },
  ],
});

async function bootZhTw(): Promise<void> {
  await bootTutorialApp({
    offline: true,
    contentFiles: { download: vi.fn(), fileUrl: () => "", remove: vi.fn() },
    progressSeed: {
      catalogProgress: {
        ...tutorialDoneProgress(),
        [U01]: ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"],
      },
    },
    preStore: {
      [uiLanguageStorageKey]: "zh-TW",
      [CONTENT_MANIFEST_KEY]: manifest,
      [contentEpisodeKey(U01)]: bodyText,
      [contentTranslationKey("zh-TW", U01)]: zhFile,
    },
  });
}

const id = (testId: string) => screen.getByTestId(testId);

test("IRL1. zh-TW — 내장본으로 연 판에도 받아 둔 zh-TW 파일 표가 롤플레이 목록 제목과 대화의 뜻 줄에 닿는다", async () => {
  await bootZhTw();
  fireEvent.tap(id("ui-lynx-bottom-navigator-item-roleplay"), {});
  expect(id(`roleplay-list-item-title-story-${U01}`)).toHaveTextContent("買水");

  fireEvent.tap(id(`roleplay-list-item-story-${U01}`), {});
  await act(async () => {
    fireEvent.tap(within(id("roleplay-preview-start")).getByTestId("ui-lynx-button"), {});
  });
  for (let i = 0; i < 30 && screen.queryByTestId("roleplay-talk-screen") === null; i += 1) {
    fireEvent.tap(id("catalog-cover-screen-next"), {});
  }
  expect(id("roleplay-talk-line")).toHaveTextContent("需要塑膠袋嗎？");
  expect(id("roleplay-talk-meaning")).toHaveTextContent("不用了，沒關係。");
});
