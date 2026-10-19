// 세션이 받는 에피소드 콘텐츠 포트와 그 순수 도우미입니다. 화면 경로가 닿는 파일이라 3a 모듈은
// 타입만 가져옵니다(값을 가져오면 메인 스레드 빌드가 깨집니다).

import type { AudioTiming } from "../lib/audio-manifest";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { RefreshSummary } from "../lib/episode-refresh";
import type { fillPlaceholders } from "../lib/placeholder-fill";
import type { EpisodeContentRefreshedEvent } from "../screens/episode-intro/episode-intro.contract";

export type FillText = typeof fillPlaceholders;

/** 세션이 받는 콘텐츠 포트입니다. 함수 셋은 백그라운드가 닫아 만듭니다(화면은 값 import 없이 씁니다). */
export type EpisodeContent = {
  readonly catalog: readonly CatalogEntry[];
  /** 버킷 기준 상대 경로(컷 그림 · 음성) → 절대 URL. 설정 없음 · 경로 거부면 null. */
  readonly imageUrlOf: (relativePath: string) => string | null;
  readonly fillText: FillText;
  /** 음성 id → 길이(음성 정보 파일). 모르면 null. */
  readonly audioTimingOf: (audioId: string) => AudioTiming | null;
};

export const noEpisodeContent: EpisodeContent = {
  catalog: [],
  imageUrlOf: () => null,
  fillText: (text) => text,
  audioTimingOf: () => null,
};

export type AppSessionContent = { readonly episodeContent: EpisodeContent };

function byOrderThenId(a: CatalogEntry, b: CatalogEntry): number {
  if (a.order !== b.order) return a.order - b.order;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * 갱신 뒤 다시 읽은 카탈로그(`next`)를 기준으로 하되, 이전에 열려 있던(`ready`) 항목은 닫지도 바꾸지도
 * 않습니다 — 갱신이 새 버전을 들였거나 원격에서 사라졌거나 쓸 수 없게 만든 항목이라도 같은 실행 안에서는
 * 이전 본문을 유지합니다(레슨 도중 문항이 바뀌지 않게). 새 버전은 캐시에 저장되어 다음 실행에 반영됩니다.
 */
export function mergeCatalogForSession(
  previous: readonly CatalogEntry[],
  next: readonly CatalogEntry[],
): readonly CatalogEntry[] {
  const merged: CatalogEntry[] = [];
  for (const entry of next) {
    const before = previous.find((candidate) => candidate.id === entry.id);
    merged.push(before?.status === "ready" ? before : entry);
  }
  for (const entry of previous) {
    if (entry.status === "ready" && !next.some((candidate) => candidate.id === entry.id)) {
      merged.push(entry);
    }
  }
  return merged.sort(byOrderThenId);
}

export function refreshChangesCatalog(summary: RefreshSummary): boolean {
  return summary.manifest === "updated" || summary.fetched.length > 0 || summary.removed.length > 0;
}

function joinedUnique(values: readonly string[]): string {
  const unique: string[] = [];
  for (const value of values) {
    if (!unique.includes(value)) unique.push(value);
  }
  return unique.sort().join(",");
}

export function episodeContentRefreshedEventOf(
  summary: RefreshSummary,
): EpisodeContentRefreshedEvent | null {
  if (summary.manifest === "unavailable") return null;
  if (
    summary.manifest === "unchanged" &&
    summary.fetched.length === 0 &&
    summary.locked.length === 0 &&
    summary.failed.length === 0 &&
    summary.removed.length === 0
  ) {
    return null;
  }
  return {
    name: "episode_content_refreshed",
    manifest: summary.manifest,
    fetchedCount: String(summary.fetched.length),
    lockedCount: String(summary.locked.length),
    failedCount: String(summary.failed.length),
    lockReasons: joinedUnique(summary.locked.map((item) => item.reason)),
    failReasons: joinedUnique(summary.failed.map((item) => item.reason)),
    persisted: summary.persisted,
  };
}
