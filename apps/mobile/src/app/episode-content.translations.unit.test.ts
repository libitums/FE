import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import { mergeCatalogForSession } from "./episode-content";

// `unit` 계층: 세션 병합이 같은 판(version · 출처가 같음)의 번역표만 새 것으로 바꾼다(ADR-0102 D3) — 언어를 바꿔
// 받은 번역 파일이 다음 실행을 기다리지 않고 보입니다. 구조는 이전 항목 그대로입니다.

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;
const base = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
})[0] as ReadyEntry;
const withTables = (
  entry: ReadyEntry,
  translations: ReadyEntry["episode"]["translations"],
  patch: Partial<ReadyEntry> = {},
): ReadyEntry => ({ ...entry, ...patch, episode: { ...entry.episode, translations } });

describe("mergeCatalogForSession — 번역표", () => {
  test("ECT1. 같은 판이고 번역표만 다르면 이전 항목에 새 번역표를 실은 것이다", () => {
    const before = withTables(base, { vi: { a: "옛" } });
    const next = withTables(base, { vi: { a: "옛" }, ja: { a: "새" } });

    const [merged] = mergeCatalogForSession([before], [next]) as ReadyEntry[];

    expect(merged?.episode.translations).toEqual({ vi: { a: "옛" }, ja: { a: "새" } });
    expect(merged?.episode.units).toBe(before.episode.units);
  });

  test("ECT2. 번역표 내용이 같으면 이전 항목 그대로(같은 참조)다", () => {
    const before = withTables(base, { vi: { a: "옛" } });
    const next = withTables(base, { vi: { a: "옛" } });

    expect(mergeCatalogForSession([before], [next])[0]).toBe(before);
  });

  test("ECT3. 판이 다르면(새 version · 다른 출처) 번역표도 바꾸지 않는다 — 교체는 지금 규칙대로", () => {
    const before = withTables(base, { vi: { a: "옛" } });
    const newer = withTables(base, { vi: { a: "새" } }, { version: "v9" });
    const remote = withTables(base, { vi: { a: "새" } }, { source: "cache" });

    expect(mergeCatalogForSession([before], [newer])[0]).toBe(before);
    expect(mergeCatalogForSession([before], [remote])[0]).toBe(before);
  });
});
