import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { downloadAllowedStorageKey, downloadPolicyStorageKey } from "../lib/download-policy";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";

// `integration` 계층: 에피소드를 열 때의 받기 문지기(ADR-0095 D6 · D7) — 맵의 표지를 누르면 연결 종류 · 정책 · 받은
// 상태에 따라 곧바로 열거나 받기 시트를 띄웁니다. 테스트에는 받아 둔 자산이 없어(표시 없음) 내장 편도 「덜 받음」입니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function boot(network: string | null, initial: Record<string, string> = {}) {
  if (network !== null) {
    vi.stubGlobal("NativeModules", { NetworkStatusModule: { current: () => network } });
  }
  const store = new Map<string, string>([
    [authSessionStorageKey, serializeAuthSession(signedInBootSession)],
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
    ...Object.entries(initial),
  ]);
  const module = {
    get: (key: string) => store.get(key) ?? null,
    set: (key: string, value: string) => void store.set(key, value),
    remove: (key: string) => void store.delete(key),
  };
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />, { storageModule: module });
  return store;
}

const tap = (element: Element) => fireEvent.tap(element, {});
const tapCover = (id: string) =>
  tap(screen.getByTestId(`ui-lynx-special-unit-catalog-cover-${id}`));
const sheetAction = (id: string) =>
  within(screen.getByTestId(`ui-lynx-bottom-sheet-action-${id}`)).getByTestId("ui-lynx-button");
const coverScreenShown = () => screen.queryByTestId("episode-intro-screen-next") !== null;

test("[DG1] 모바일 데이터 · 묻기 — 덜 받은 편 표지는 받기 시트를 띄우고, Wi-Fi에서 받기면 열지 않고 닫는다", async () => {
  await boot("cellular:metered");
  tapCover("u01-water");
  expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent("Download Episode 1?");
  expect(coverScreenShown()).toBe(false);
  tap(sheetAction("wifi-later"));
  expect(screen.queryByTestId("download-sheet")).not.toBeInTheDocument();
  expect(coverScreenShown()).toBe(false);
});

test("[DG2] 모바일 데이터 · 묻기 — 지금 받기면 그 편을 허락해 저장하고 연다 · 다시 묻지 않기면 정책이 always", async () => {
  const store = await boot("cellular:metered");
  tapCover("u01-water");
  tap(screen.getByTestId("download-sheet-dont-ask"));
  tap(sheetAction("download-now"));
  expect(JSON.parse(store.get(downloadAllowedStorageKey) ?? "[]")).toContain("u01-water");
  expect(store.get(downloadPolicyStorageKey)).toBe("always");
  expect(coverScreenShown()).toBe(true);
});

test("[DG3] 모바일 데이터 · Wi-Fi만 — 묻지 않고 안내만, 확인은 닫는다", async () => {
  await boot("cellular:metered", { [downloadPolicyStorageKey]: "wifi-only" });
  tapCover("u01-water");
  expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent(
    "Episode 1 downloads on Wi-Fi",
  );
  tap(sheetAction("ok"));
  expect(screen.queryByTestId("download-sheet")).not.toBeInTheDocument();
  expect(coverScreenShown()).toBe(false);
});

test("[DG4] 오프라인 — 오프라인 시트, 그냥 열기면 연다", async () => {
  await boot("offline:unknown");
  tapCover("u01-water");
  expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent("You're offline");
  tap(sheetAction("open-anyway"));
  expect(coverScreenShown()).toBe(true);
});

test("[DG5] 연결 종류를 모르면(옛 호스트) · 허락한 편이면 시트 없이 연다", async () => {
  await boot(null);
  tapCover("u01-water");
  expect(screen.queryByTestId("download-sheet")).not.toBeInTheDocument();
  expect(coverScreenShown()).toBe(true);
  cleanup();
  vi.unstubAllGlobals();
  await boot("cellular:metered", { [downloadAllowedStorageKey]: '["u01-water"]' });
  tapCover("u01-water");
  expect(screen.queryByTestId("download-sheet")).not.toBeInTheDocument();
  expect(coverScreenShown()).toBe(true);
});
