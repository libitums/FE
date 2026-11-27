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
import { languageDownloadZhTw } from "../lib/ui-copy-language-download";
import { resetApp } from "./test-helpers/episode-format-harness";
import { openSettingsFromMore } from "./test-helpers/more-menu";
import { tutorialDoneProgress } from "./test-helpers/progress-seed";
import { bootTutorialApp, flushAsync } from "./test-helpers/tutorial-boot";
import { contentSyncEventName } from "./use-episode-content-refresh";

// `integration` 계층(2026-11-27 사용자 지시 — 「설정에서 언어를 바꾸면 다운로드 모달이나 화면이 떠야지, 껐다 켜야 되는 건 이상한 구조」):
// 설정에서 앱 언어를 바꾸면 그 언어의 번역 파일이 없을 때 바로 받기 시트가 서고, 받은 뒤 재시작 없이 열린 카탈로그에 뜻이 입혀진다.
// 실패면 다시 시도, 오프라인이면 연결되면 받는다는 안내 뒤 연결이 돌아오면(호스트 신호) 받는다. 이미 있으면 시트 없이 바로 적용한다.
// 대역은 경계뿐입니다(저장소 · fetch · 연결 상태 모듈).

afterEach(resetApp);

const U01 = "u01-water";
// 원격 본문(번역표 없음)이 이기는 기기 — 뜻은 받은 파일에서만 옵니다.
const bundled = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../content/episodes/u01-water.json"), "utf8"),
) as Record<string, unknown>;
const { translations: _tables, ...remoteBody } = bundled;
const bodyText = JSON.stringify(remoteBody);
const ZH = JSON.stringify({
  schema: "translation-1",
  episode: U01,
  language: "zh-TW",
  entries: { "Buying Water": "買水（檔案）" },
});
const FILE_PATH = `translations/level-5/zh-TW/${U01}.json`;
const manifest = JSON.stringify({
  schema: "manifest-1",
  generated_at: "2026-11-24T00:00:00Z",
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
          url: FILE_PATH,
          version: "2026-11-18.1",
          sha256: sha256Hex(utf8Bytes(ZH)),
          bytes: utf8Bytes(ZH).length,
        },
      },
    },
  ],
});
const progressSeed = {
  catalogProgress: {
    ...tutorialDoneProgress(),
    [U01]: ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"],
  },
};
const sheet = () => screen.queryByTestId("language-download-sheet");

// 테스트가 받는 도중 버킷을 바꿀 수 있게 `files`를 그대로 넘깁니다(복사하지 않음).
async function bootWith(files: Record<string, string>, extra: Record<string, string> = {}) {
  files["manifests/level-5.json"] = manifest;
  return bootTutorialApp({
    serve: { manifest, episodes: {}, files },
    progressSeed,
    preStore: { [CONTENT_MANIFEST_KEY]: manifest, [contentEpisodeKey(U01)]: bodyText, ...extra },
  });
}

async function chooseZhTw(): Promise<void> {
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
}

function roleplayTitle(): string {
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  return screen.getByTestId(`roleplay-list-item-title-story-${U01}`).textContent ?? "";
}

function tapAction(id: string): void {
  fireEvent.tap(
    within(screen.getByTestId(`ui-lynx-bottom-sheet-action-${id}`)).getByTestId("ui-lynx-button"),
    {},
  );
}

test("ILD1. 받다 실패하면 시트가 다시 시도를 내고, 다시 시도로 받으면 재시작 없이 뜻이 zh-TW다", async () => {
  const files: Record<string, string> = {};
  const { store } = await bootWith(files);
  await flushAsync();

  await chooseZhTw();
  await flushAsync();
  expect(sheet()).not.toBeNull();
  expect(sheet()).toHaveTextContent(languageDownloadZhTw.failedTitle);

  files[FILE_PATH] = ZH;
  await act(async () => {
    tapAction("retry");
  });
  await flushAsync();
  expect(sheet()).toBeNull();
  expect(store.get(contentTranslationKey("zh-TW", U01))).toBe(ZH);
  fireEvent.tap(
    within(screen.getByTestId("language-select-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
  await flushAsync();
  expect(roleplayTitle()).toBe("買水（檔案）");
});

test("ILD2. 받을 수 있으면 받고 시트가 닫히며, 재시작 없이 뜻이 zh-TW다", async () => {
  const { store } = await bootWith({ [FILE_PATH]: ZH });
  await flushAsync();

  await chooseZhTw();
  await flushAsync();
  expect(sheet()).toBeNull();
  expect(store.get(contentTranslationKey("zh-TW", U01))).toBe(ZH);
  fireEvent.tap(
    within(screen.getByTestId("language-select-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
  await flushAsync();
  expect(roleplayTitle()).toBe("買水（檔案）");
});

test("ILD3. 이미 받아 둔 파일이 맞으면 시트 없이 바로 뜻이 zh-TW다", async () => {
  const { urls } = await bootWith({}, { [contentTranslationKey("zh-TW", U01)]: ZH });
  await flushAsync();

  await chooseZhTw();
  expect(sheet()).toBeNull();
  await flushAsync();
  expect(sheet()).toBeNull();
  expect(urls.some((url) => url.includes(FILE_PATH))).toBe(false);
});

test("ILD4. 오프라인이면 연결되면 받는다는 시트가 서고, 연결이 돌아오면(호스트 신호) 받아 뜻이 zh-TW다", async () => {
  // 오프라인 동안은 버킷에 닿지 않습니다 — 파일은 연결이 돌아온 뒤에만 내줍니다.
  const files: Record<string, string> = {};
  const { store } = await bootWith(files);
  await flushAsync();
  const modules = (globalThis as { NativeModules: Record<string, unknown> }).NativeModules;
  vi.stubGlobal("NativeModules", {
    ...modules,
    NetworkStatusModule: { current: () => "offline:unknown" },
  });

  await chooseZhTw();
  await flushAsync();
  expect(sheet()).toHaveTextContent(languageDownloadZhTw.offlineTitle);
  expect(store.has(contentTranslationKey("zh-TW", U01))).toBe(false);
  await act(async () => {
    tapAction("ok");
  });
  expect(sheet()).toBeNull();

  files[FILE_PATH] = ZH;
  vi.stubGlobal("NativeModules", {
    ...modules,
    NetworkStatusModule: { current: () => "wifi:unmetered" },
  });
  await act(async () => {
    lynx.getJSModule("GlobalEventEmitter").emit(contentSyncEventName, []);
  });
  await flushAsync();
  expect(store.get(contentTranslationKey("zh-TW", U01))).toBe(ZH);
  fireEvent.tap(
    within(screen.getByTestId("language-select-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
  await flushAsync();
  expect(roleplayTitle()).toBe("買水（檔案）");
});
