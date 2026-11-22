import { describe, expect, test } from "vitest";

import {
  catalogCoverDownloadsOf,
  catalogPrefetchWindowOf,
  coverDownloadStateOf,
  type CoverDownloadInput,
} from "./cover-download-state";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";

// `unit` 계층(CD1 ~ CD9, ADR-0165): 사용자 차례인 편의 표지 받기 표시와 미리 받기 창의 맵 순서입니다.

const base: CoverDownloadInput = {
  episodeId: "u11",
  coverStatus: "available",
  episodeComplete: false,
  isTutorial: false,
  assetsComplete: false,
  gate: "open",
  scheduled: true,
  syncing: true,
  activity: null,
  bytes: 12_000_000,
};

describe("coverDownloadStateOf", () => {
  test("CD1. 진도로 잠긴 편은 받기 상태와 상관없이 표시가 없다", () => {
    expect(coverDownloadStateOf({ ...base, coverStatus: "locked" })).toEqual({ kind: "none" });
    expect(coverDownloadStateOf({ ...base, coverStatus: "locked", gate: "ask" })).toEqual({
      kind: "none",
    });
  });

  test("CD2. 자산을 다 받았거나 · 끝낸 편 · 튜토리얼이면 표시가 없다", () => {
    expect(coverDownloadStateOf({ ...base, assetsComplete: true })).toEqual({ kind: "none" });
    expect(coverDownloadStateOf({ ...base, episodeComplete: true })).toEqual({ kind: "none" });
    expect(coverDownloadStateOf({ ...base, isTutorial: true })).toEqual({ kind: "none" });
  });

  test("CD3. 받는 중이면 이 편의 파일 진행을 퍼센트로 낸다(내림, 다 받기 전엔 99 이하)", () => {
    const activity = { episodeId: "u11", done: 21, total: 50 };
    expect(coverDownloadStateOf({ ...base, activity })).toEqual({
      kind: "getting-ready",
      percent: 42,
    });
    expect(
      coverDownloadStateOf({ ...base, activity: { episodeId: "u11", done: 199, total: 200 } }),
    ).toEqual({ kind: "getting-ready", percent: 99 });
  });

  test("CD4. 받을 차례지만 아직 이 편에 닿지 않았으면 0%다", () => {
    const activity = { episodeId: "u01", done: 3, total: 9 };
    expect(coverDownloadStateOf({ ...base, activity })).toEqual({
      kind: "getting-ready",
      percent: 0,
    });
  });

  test("CD5. 요금 연결에서 묻는 시트 · Wi-Fi 전용 · 오프라인이면 「Tap to download」와 크기다", () => {
    for (const gate of ["ask", "wifi-only", "offline"] as const) {
      expect(coverDownloadStateOf({ ...base, gate })).toEqual({
        kind: "tap-to-download",
        bytes: 12_000_000,
      });
    }
    expect(coverDownloadStateOf({ ...base, gate: "ask", bytes: null })).toEqual({
      kind: "tap-to-download",
      bytes: null,
    });
  });

  test("CD6. 받기 차례가 끝났는데 다 받지 못했으면(실패) 「Tap to download」다", () => {
    const activity = { episodeId: "u11", done: 4, total: 9 };
    expect(coverDownloadStateOf({ ...base, syncing: false, activity })).toEqual({
      kind: "tap-to-download",
      bytes: 12_000_000,
    });
  });

  test("CD7. 창 밖이라 저절로 받지 않는 편은 「Tap to download」다", () => {
    expect(coverDownloadStateOf({ ...base, scheduled: false })).toEqual({
      kind: "tap-to-download",
      bytes: 12_000_000,
    });
  });

  test("CD8. 이 편의 파일을 다 받았으면(바꿔 끼우기 전) 표시가 없다", () => {
    const activity = { episodeId: "u11", done: 9, total: 9 };
    expect(coverDownloadStateOf({ ...base, syncing: false, activity })).toEqual({
      kind: "none",
    });
  });
});

const ready = (episodeId: string): CatalogMapSection => ({
  kind: "catalog-ready",
  episodeId,
  ordinal: 0,
  title: episodeId,
  lessonKeys: ["S1"],
  finalKey: "RP",
  completionKeys: ["RP"],
  cultureKeys: [],
});
const pending = (episodeId: string): CatalogMapSection => ({
  kind: "catalog-unavailable",
  episodeId,
  ordinal: 0,
  title: episodeId,
  reason: "pending",
});

describe("catalogPrefetchWindowOf", () => {
  test("CD9. 「준비 중」 편도 맵 순서에 들어 — 마지막으로 끝낸 편 다음 편이 창에 든다(ADR-0157 D1)", () => {
    const sections = [ready("u09"), ready("u10"), pending("u11"), pending("u12")];
    const progress = { u09: ["RP"], u10: ["RP"] };
    expect(catalogPrefetchWindowOf(sections, progress)).toEqual(["u11", "u12"]);
    expect(catalogPrefetchWindowOf(sections, { u09: ["RP"] })).toEqual(["u10", "u11"]);
  });
});

describe("catalogCoverDownloadsOf", () => {
  test("CD10. 열린 미완료 편만 표시가 서고, 진도로 잠긴 편은 저장소를 읽지 않고 빠진다", () => {
    const sections = [ready("u00-tutorial"), ready("u01"), ready("u02")];
    const asked: string[] = [];
    const downloads = catalogCoverDownloadsOf(
      sections,
      { legacyTutorialPassed: false, progress: { "u00-tutorial": ["RP"] } },
      {
        gateOf: () => "open",
        assetsComplete: (id) => {
          asked.push(id);
          return false;
        },
        scheduled: () => true,
        bytes: () => null,
        syncing: true,
        activity: { episodeId: "u01", done: 1, total: 4 },
      },
    );
    expect(downloads).toEqual({ u01: { kind: "getting-ready", percent: 25 } });
    expect(asked).not.toContain("u02");
  });
});
