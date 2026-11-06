import { expect, test } from "vitest";

import type { CatalogProgress } from "../lib/catalog-progress";
import type { CatalogEntry } from "../lib/episode-catalog";
import type {
  CatalogMapSection,
  CatalogReadySection,
} from "../screens/journey-map/catalog-map.contract";
import {
  currentDownloadEpisodeId,
  downloadCatalogEntriesOf,
  downloadProgressSummaryOf,
} from "./download-progress";

// `unit` 계층: 설정 › 다운로드의 편별 레슨 집계 — 진행 중인 편 고르기와 행 계산입니다.

const readySection = (episodeId: string, ordinal: number): CatalogReadySection => ({
  kind: "catalog-ready",
  episodeId,
  ordinal,
  title: episodeId,
  lessonKeys: ["S1", "S2"],
  finalKey: "RP",
  completionKeys: ["RP"],
  cultureKeys: [],
});
const unavailable = (episodeId: string, ordinal: number): CatalogMapSection => ({
  kind: "catalog-unavailable",
  episodeId,
  ordinal,
  title: episodeId,
  reason: "pending",
});

test("[U-PG1] currentDownloadEpisodeId — 첫 미완료 ready 구획, 앞이 끝났으면 다음, 전부 끝났거나 비면 null, 준비 중 구획은 건너뛴다", () => {
  const sections: CatalogMapSection[] = [
    readySection("u00", 0),
    unavailable("u01", 1),
    readySection("u02", 2),
    readySection("u03", 3),
  ];
  const none: CatalogProgress = {};
  expect(currentDownloadEpisodeId(sections, none)).toBe("u00");
  expect(currentDownloadEpisodeId(sections, { u00: ["RP"] })).toBe("u02");
  expect(currentDownloadEpisodeId(sections, { u00: ["RP"], u02: ["RP"] })).toBe("u03");
  expect(currentDownloadEpisodeId(sections, { u00: ["RP"], u02: ["RP"], u03: ["RP"] })).toBeNull();
  expect(currentDownloadEpisodeId([], none)).toBeNull();
  expect(currentDownloadEpisodeId([unavailable("u01", 1)], none)).toBeNull();
});

test("[U-PG2] downloadProgressSummaryOf — ordinal 순 행, downloadedLessons는 주입 함수 값, current는 그 id의 행(없으면 null)", () => {
  const entries = [
    { episodeId: "u02", ordinal: 2, unitKeys: ["S1", "S2", "RP"] },
    { episodeId: "u00", ordinal: 0, unitKeys: ["S1", "RP"] },
  ];
  const downloaded = (episodeId: string, unitKeys: readonly string[]) =>
    episodeId === "u02" ? unitKeys.length - 1 : 0;

  const summary = downloadProgressSummaryOf({ entries, currentEpisodeId: "u02" }, downloaded);

  expect(summary.rows).toEqual([
    { episodeId: "u00", ordinal: 0, downloadedLessons: 0, totalLessons: 2 },
    { episodeId: "u02", ordinal: 2, downloadedLessons: 2, totalLessons: 3 },
  ]);
  expect(summary.current).toEqual({
    episodeId: "u02",
    ordinal: 2,
    downloadedLessons: 2,
    totalLessons: 3,
  });

  expect(
    downloadProgressSummaryOf({ entries, currentEpisodeId: null }, downloaded).current,
  ).toBeNull();
  expect(
    downloadProgressSummaryOf({ entries, currentEpisodeId: "u99" }, downloaded).current,
  ).toBeNull();
  expect(downloadProgressSummaryOf({ entries: [], currentEpisodeId: null }, downloaded)).toEqual({
    rows: [],
    current: null,
  });
});

test("[U-PG2] downloadCatalogEntriesOf — ready 항목만, unitKeys는 units + finalTest", () => {
  const episode = { units: [{ id: "S1" }, { id: "S2" }], finalTest: { id: "RP" } };
  const catalog = [
    {
      status: "ready",
      id: "u01",
      order: 1,
      title: "t",
      version: "1",
      source: "bundled",
      episode,
      warnings: [],
    },
    { status: "pending", id: "u02", order: 2, title: "t", version: "1" },
    { status: "locked", id: "u03", order: 3, title: "t", version: "1", reason: "client-too-old" },
  ] as unknown as readonly CatalogEntry[];

  expect(downloadCatalogEntriesOf(catalog)).toEqual([
    { episodeId: "u01", ordinal: 1, unitKeys: ["S1", "S2", "RP"] },
  ]);
});
