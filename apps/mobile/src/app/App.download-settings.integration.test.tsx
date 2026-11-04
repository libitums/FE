import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { downloadPolicyStorageKey } from "../lib/download-policy";
import type { SettingsEventSink } from "../screens/settings/settings.contract";

// `integration` 계층: 설정 › 다운로드(ADR-0095 D8) — 설정 항목에서 열리고(이벤트 하나), 정책을 고르면 기기 저장소에
// 남으며, 다시 열면 그 값이 골라져 있고, 뒤로 가면 설정 루트입니다.

afterEach(() => {
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
