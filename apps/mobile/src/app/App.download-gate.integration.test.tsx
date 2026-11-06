import { afterEach, expect, test, vi } from "vitest";
import { cleanup, screen, within } from "@lynx-js/react/testing-library";

import {
  bootDownloadApp as boot,
  coverScreenShown,
  sheetAction,
  sheetActionIds,
  sheetTitle,
  tap,
  tapCover,
} from "./test-helpers/download-gate";
import { downloadAllowedStorageKey, downloadPolicyStorageKey } from "../lib/download-policy";

// `integration` 계층: 에피소드를 열 때의 받기 문지기(ADR-0095 D6 · D7) — 맵의 표지를 누르면 연결 종류 · 정책 · 받은
// 상태에 따라 곧바로 열거나 받기 시트를 띄웁니다. 테스트에는 받아 둔 자산이 없어(표시 없음) 내장 편도 「덜 받음」입니다.
// 시트는 정책을 바꾸지 않습니다(정책은 설정 화면만). 유닛 단위는 `App.download-gate.unit-tap` 파일에 있습니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const allowed = (store: Map<string, string>): string[] =>
  JSON.parse(store.get(downloadAllowedStorageKey) ?? "[]");

test("[DG1] 모바일 데이터 · 묻기 — 덜 받은 편 표지는 받기 시트를 띄우고, Wi-Fi에서 받기면 열지 않고 닫는다", async () => {
  await boot("cellular:metered");
  tapCover("u01-water");
  expect(sheetTitle()).toHaveTextContent("Download Episode 1?");
  expect(coverScreenShown()).toBe(false);
  tap(sheetAction("wifi-later"));
  expect(screen.queryByTestId("download-sheet")).not.toBeInTheDocument();
  expect(coverScreenShown()).toBe(false);
});

test("[DG2] 모바일 데이터 · 묻기 — 지금 받기면 그 편만 허락해 저장하고 연다 · 정책은 건드리지 않고 체크 행은 없다", async () => {
  const store = await boot("cellular:metered");
  tapCover("u01-water");
  expect(screen.queryByTestId("download-sheet-dont-ask")).not.toBeInTheDocument();
  tap(sheetAction("download-now"));
  expect(allowed(store)).toContain("u01-water");
  expect(store.has(downloadPolicyStorageKey)).toBe(false);
  expect(coverScreenShown()).toBe(true);
});

test("[DG3] 모바일 데이터 · Wi-Fi만 — 표지는 세 출구, 이번만 모바일 데이터로면 그 편만 허락하고 정책은 그대로 열린다", async () => {
  const store = await boot("cellular:metered", { [downloadPolicyStorageKey]: "wifi-only" });
  tapCover("u01-water");
  expect(sheetTitle()).toHaveTextContent("Episode 1 downloads on Wi-Fi");
  expect(sheetActionIds()).toEqual(["mobile-data-once", "open-anyway", "change-setting"]);
  tap(sheetAction("mobile-data-once"));
  expect(allowed(store)).toContain("u01-water");
  expect(store.get(downloadPolicyStorageKey)).toBe("wifi-only");
  expect(coverScreenShown()).toBe(true);
});

test("[DG3b] 모바일 데이터 · Wi-Fi만 — 그림 · 소리 없이 열기는 허락을 쓰지 않고 연다", async () => {
  const store = await boot("cellular:metered", { [downloadPolicyStorageKey]: "wifi-only" });
  tapCover("u01-water");
  tap(sheetAction("open-anyway"));
  expect(coverScreenShown()).toBe(true);
  expect(allowed(store)).toEqual([]);
  expect(store.get(downloadPolicyStorageKey)).toBe("wifi-only");
});

test("[DG3c] 모바일 데이터 · Wi-Fi만 — 설정 바꾸기는 설정 › 다운로드로 가고, 뒤로는 설정 루트다", async () => {
  await boot("cellular:metered", { [downloadPolicyStorageKey]: "wifi-only" });
  tapCover("u01-water");
  tap(sheetAction("change-setting"));
  expect(screen.getByTestId("download-settings-title")).toBeInTheDocument();
  expect(coverScreenShown()).toBe(false);
  tap(within(screen.getByTestId("download-settings-screen")).getByTestId("ui-lynx-round-button"));
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
});

test("[DG4] 오프라인 — 오프라인 시트는 그냥 열기가 첫 동작이고, 그냥 열기면 연다", async () => {
  await boot("offline:unknown");
  tapCover("u01-water");
  expect(sheetTitle()).toHaveTextContent("You're offline");
  expect(sheetActionIds()).toEqual(["open-anyway", "ok"]);
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
