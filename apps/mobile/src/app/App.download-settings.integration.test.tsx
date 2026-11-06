import { cleanup } from "@lynx-js/react/testing-library";
import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { downloadAllowedStorageKey, downloadPolicyStorageKey } from "../lib/download-policy";
import { U01, bootDownloadApp, downloadedSeed } from "./test-helpers/download-gate";
import { contentAssetsKey } from "../lib/episode-asset-sync";
import { bundledCatalogInput } from "../lib/episode-bundled.test-support";
import type { SettingsEventSink } from "../screens/settings/settings.contract";

// `integration` 계층: 설정 › 다운로드(ADR-0095 D8) — 설정 항목에서 열리고(이벤트 하나), 정책을 고르면 기기 저장소에
// 남으며, 다시 열면 그 값이 골라져 있고, 뒤로 가면 설정 루트입니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function storage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>([
    [authSessionStorageKey, serializeAuthSession(signedInBootSession)],
    ...Object.entries(initial),
  ]);
  return {
    store,
    module: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  };
}

const tap = (element: Element) => fireEvent.tap(element, {});
const downloadsCell = () =>
  within(screen.getByTestId("ui-lynx-settings-group-item-download")).getByTestId(
    "ui-lynx-settings-cell",
  );

test("[DL1] 설정 › Downloads를 열면 download_settings_opened 하나를 보내고 다운로드 화면이 선다", async () => {
  const settingsEventSink = vi.fn<NonNullable<SettingsEventSink>>();
  const { module } = storage();
  await renderSignedInApp(
    <App progressSeed={legacyPassedSeed} settingsEventSink={settingsEventSink} />,
    { storageModule: module },
  );
  tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"));
  expect(screen.getByTestId("ui-lynx-settings-group-item-download")).toHaveTextContent("Downloads");
  tap(downloadsCell());

  expect(screen.getByTestId("download-settings-title")).toHaveTextContent("Downloads");
  expect(settingsEventSink.mock.calls.map(([event]) => event.name)).toEqual([
    "settings_opened",
    "download_settings_opened",
  ]);
});

test("[DL2] 정책을 고르면 저장소에 남고, 뒤로 갔다 다시 열면 그 값이 골라져 있다", async () => {
  const { store, module } = storage();
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />, { storageModule: module });
  tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"));
  tap(downloadsCell());

  tap(screen.getByTestId("ui-lynx-option-selector-item-wifi-only"));
  expect(store.get(downloadPolicyStorageKey)).toBe("wifi-only");

  tap(within(screen.getByTestId("download-settings-screen")).getByTestId("ui-lynx-round-button"));
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  tap(downloadsCell());
  expect(screen.getByTestId("ui-lynx-option-selector-item-wifi-only")).toHaveAttribute(
    "data-selected",
    "true",
  );
});

const openDownloads = () => {
  tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"));
  tap(downloadsCell());
};
const rowText = (id: string) => screen.getByTestId(`download-settings-episode-${id}`);

test("[DL3] 편별 집계 — 받은 표시가 없으면 0 of 전체, 나머지 받기는 첫 미완료 편(튜토리얼)을 가리킨다", async () => {
  await bootDownloadApp("wifi:unmetered");
  openDownloads();
  expect(rowText("u00-tutorial")).toHaveTextContent("Episode 0: 0 of 14 lessons");
  expect(rowText(U01)).toHaveTextContent("Episode 1: 0 of 10 lessons");
  expect(screen.getByTestId("download-settings-download-rest")).toHaveTextContent(
    "Download the rest of Episode 0",
  );
});

test("[DL4] 요금 없는 연결 — 나머지 받기는 확인 없이 그 편 전체를 허락하고 받는 중 줄을 보인다", async () => {
  const store = await bootDownloadApp("wifi:unmetered");
  openDownloads();
  tap(within(screen.getByTestId("download-settings-download-rest")).getByTestId("ui-lynx-button"));
  expect(JSON.parse(store.get(downloadAllowedStorageKey) ?? "[]")).toEqual(["u00-tutorial"]);
  expect(screen.getByTestId("download-settings-download-all-started")).toBeInTheDocument();
});

test("[DL5] 공통 + 모든 유닛을 받아 두면 그 편은 complete · 편 표시만 있어도 complete", async () => {
  const entry = bundledCatalogInput.manifest.episodes.find((candidate) => candidate.id === U01);
  const episode = bundledCatalogInput.episodes[U01] as { steps: { id: string }[] };
  const unitKeys = [...episode.steps.map((step) => step.id), "INT"];
  await bootDownloadApp("wifi:unmetered", downloadedSeed(unitKeys));
  openDownloads();
  expect(rowText(U01)).toHaveTextContent("Episode 1: complete");
  cleanup();
  vi.unstubAllGlobals();
  await bootDownloadApp("wifi:unmetered", {
    [contentAssetsKey(U01)]: JSON.stringify({ sha256: entry?.sha256, missing: [] }),
  });
  openDownloads();
  expect(rowText(U01)).toHaveTextContent("Episode 1: complete");
});
