import { afterEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import {
  U01,
  bootDownloadApp,
  coverScreenShown,
  downloadedSeed,
  sheetAction,
  sheetActionIds,
  sheetTitle,
  tap,
  tapCover,
  tapUnit,
  unitOpened,
} from "./test-helpers/download-gate";
import { u01OpenSeed } from "./test-helpers/progress-seed";
import { downloadAllowedStorageKey, downloadPolicyStorageKey } from "../lib/download-policy";

// `integration` 계층: 유닛 단위 받기 문지기(ADR-0095 D6 정정) — 맵의 유닛(레슨)을 누르면 공통 묶음 + 그 유닛만 묻고,
// 허락도 `"<편>#<유닛>"` 토큰 하나입니다. 표지(편 단위)와는 받음 판정이 다릅니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const boot = (network: string | null, initial: Record<string, string> = {}) =>
  bootDownloadApp(network, initial, u01OpenSeed);
const allowed = (store: Map<string, string>): string[] =>
  JSON.parse(store.get(downloadAllowedStorageKey) ?? "[]");

test("[DG6] 모바일 데이터 · 묻기 — 유닛을 누르면 레슨 시트(크기 줄 없음 · 행 셋)이고, Wi-Fi에서 받기면 닫히고 맵이 그대로다", async () => {
  await boot("cellular:metered");
  tapUnit(U01, "S1");
  expect(sheetTitle()).toHaveTextContent("Download Lesson 1?");
  expect(screen.queryByTestId("download-sheet-size")).not.toBeInTheDocument();
  expect(screen.getByTestId("download-sheet-row-common")).toBeInTheDocument();
  expect(screen.getByTestId("download-sheet-row-target")).toBeInTheDocument();
  expect(screen.getByTestId("download-sheet-row-rest")).toBeInTheDocument();
  tap(sheetAction("wifi-later"));
  expect(screen.queryByTestId("download-sheet")).not.toBeInTheDocument();
  expect(unitOpened()).toBe(false);
});

test("[DG7] 모바일 데이터 · 묻기 — 지금 받기는 그 유닛 토큰만 허락하고(편 토큰 없음) 정책은 그대로 열린다", async () => {
  const store = await boot("cellular:metered");
  tapUnit(U01, "S1");
  tap(sheetAction("download-now"));
  expect(allowed(store)).toEqual([`${U01}#S1`]);
  expect(store.has(downloadPolicyStorageKey)).toBe(false);
  expect(unitOpened()).toBe(true);
});

test("[DG8] 공통 + S1을 받아 둔 편은 S1이 시트 없이 열리지만, 같은 시드로 표지(편)는 덜 받아 시트가 선다", async () => {
  const seed = downloadedSeed(["S1"]);
  await boot("cellular:metered", seed);
  tapUnit(U01, "S1");
  expect(screen.queryByTestId("download-sheet")).not.toBeInTheDocument();
  expect(unitOpened()).toBe(true);
  cleanup();
  vi.unstubAllGlobals();
  await boot("cellular:metered", seed);
  tapCover(U01);
  expect(sheetTitle()).toHaveTextContent("Download Episode 1?");
  expect(coverScreenShown()).toBe(false);
});

test("[DG9] 오프라인 — 덜 받은 유닛은 레슨 안내 시트이고 그냥 열기로 열린다 · 받아 둔 유닛은 시트 없이 열린다", async () => {
  await boot("offline:unknown");
  tapUnit(U01, "S1");
  expect(sheetTitle()).toHaveTextContent("You're offline");
  expect(screen.getByTestId("ui-lynx-bottom-sheet-description")).toHaveTextContent("Lesson 1");
  expect(sheetActionIds()).toEqual(["open-anyway", "ok"]);
  tap(sheetAction("open-anyway"));
  expect(unitOpened()).toBe(true);
  cleanup();
  vi.unstubAllGlobals();
  await boot("offline:unknown", downloadedSeed(["S1"]));
  tapUnit(U01, "S1");
  expect(screen.queryByTestId("download-sheet")).not.toBeInTheDocument();
  expect(unitOpened()).toBe(true);
});

test("[DG10] 모바일 데이터 · 그 유닛을 허락해 둔 상태면(받는 중) 시트 없이 열린다", async () => {
  await boot("cellular:metered", { [downloadAllowedStorageKey]: JSON.stringify([`${U01}#S1`]) });
  tapUnit(U01, "S1");
  expect(screen.queryByTestId("download-sheet")).not.toBeInTheDocument();
  expect(unitOpened()).toBe(true);
});
