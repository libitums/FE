// 표지의 받기 표시와 미리 받기 창의 순서를 정하는 순수 모듈입니다(ADR-0165). 저장소 · 연결은 부르는 쪽이 읽어 넘깁니다.

import { isCatalogEpisodeComplete, type CatalogProgress } from "../lib/catalog-progress";
import type { EpisodeOpenGate } from "../lib/episode-open-gate";
import { prefetchWindowIds } from "../lib/prefetch-window";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { catalogCoverStatus } from "../screens/journey-map/catalog-map";
import type {
  CatalogGate,
  CatalogMapSection,
  CoverDownloadState,
  CoverDownloads,
} from "../screens/journey-map/catalog-map.contract";
import type { JourneyMapItemStatus } from "../screens/journey-map/journey-map-types";

/** 받기 차례가 지금 받는 편의 파일 진행 — 0 < done ≤ total(본문 1 + 자산 경로 수). */
export type AssetActivity = {
  readonly episodeId: string;
  readonly done: number;
  readonly total: number;
};

export type CoverDownloadInput = {
  readonly episodeId: string;
  readonly coverStatus: JourneyMapItemStatus;
  readonly episodeComplete: boolean;
  readonly isTutorial: boolean;
  readonly assetsComplete: boolean;
  /** 열 때의 받기 판정(ADR-0095 D6 · D7). */
  readonly gate: EpisodeOpenGate;
  /** 받기 차례가 이 편을 받을 차례인가 — 미리 받기 창 · 이번 실행에 연 편 · 허락한 편(ADR-0157). */
  readonly scheduled: boolean;
  /** 받기 차례가 도는 중인가. */
  readonly syncing: boolean;
  readonly activity: AssetActivity | null;
  /** 목록의 그림 · 음성 크기(`assets_bytes`). 없으면 `null`. */
  readonly bytes: number | null;
};

export const noCoverDownload: CoverDownloadState = { kind: "none" };

/**
 * 진도로 잠긴 편 · 끝낸 편 · 튜토리얼 · 다 받은 편은 표시가 없습니다. 열 때 시트가 묻거나(요금 연결 · 오프라인) 받기 차례가
 * 이 편을 받지 않으면(창 밖 · 끝났는데 못 받음) `tap-to-download`, 받는 중이면 `getting-ready`입니다.
 */
export function coverDownloadStateOf(input: CoverDownloadInput): CoverDownloadState {
  if (input.coverStatus === "locked" || input.episodeComplete || input.isTutorial) {
    return noCoverDownload;
  }
  if (input.assetsComplete) return noCoverDownload;
  const tap: CoverDownloadState = { kind: "tap-to-download", bytes: input.bytes };
  if (input.gate !== "open") return tap;
  const mine = input.activity?.episodeId === input.episodeId ? input.activity : null;
  // 파일을 다 받았으면 바꿔 끼우기(스테이징 → 활성)만 남았습니다.
  if (mine !== null && mine.done >= mine.total) return noCoverDownload;
  if (!input.syncing || !input.scheduled) return tap;
  return { kind: "getting-ready", percent: mine === null ? 0 : percentOf(mine) };
}

function percentOf(activity: AssetActivity): number {
  if (activity.total <= 0) return 0;
  return Math.min(99, Math.max(0, Math.floor((activity.done * 100) / activity.total)));
}

/** 미리 받기 창을 셀 맵 순서 — 열린 편과 「준비 중」 편 모두(ADR-0157 D1)입니다. */
export function catalogPrefetchWindowOf(
  sections: readonly CatalogMapSection[],
  progress: CatalogProgress,
): readonly string[] {
  return prefetchWindowIds(
    sections.map((section) => section.episodeId),
    (episodeId) => {
      const section = sections.find((candidate) => candidate.episodeId === episodeId);
      return section !== undefined && sectionCompleteIn(section, progress);
    },
  );
}

/** 구획이 끝났는가 — 열린 편은 그 완료 키, 「준비 중」 편은 끝나지 않은 것으로 셉니다. */
export function sectionCompleteIn(section: CatalogMapSection, progress: CatalogProgress): boolean {
  return (
    section.kind === "catalog-ready" &&
    isCatalogEpisodeComplete(progress, section.episodeId, section.completionKeys)
  );
}

/** 표지 받기 표시를 셀 때 부르는 쪽이 읽어 넘기는 값입니다 — 저장소 · 연결 읽기는 이 함수들 안에 있습니다. */
export type CoverDownloadReads = {
  readonly gateOf: (episodeId: string) => EpisodeOpenGate;
  readonly assetsComplete: (episodeId: string) => boolean;
  readonly scheduled: (episodeId: string) => boolean;
  readonly bytes: (episodeId: string) => number | null;
  readonly syncing: boolean;
  readonly activity: AssetActivity | null;
};

/** 열린 구획마다 표지 받기 표시 — `none`이 아닌 편만 싣습니다. 잠긴 편은 저장소를 읽지 않습니다. */
export function catalogCoverDownloadsOf(
  sections: readonly CatalogMapSection[],
  gate: CatalogGate,
  reads: CoverDownloadReads,
): CoverDownloads {
  const out: Record<string, CoverDownloadState> = {};
  sections.forEach((section, index) => {
    if (section.kind !== "catalog-ready") return;
    const coverStatus = catalogCoverStatus(sections, index, gate);
    const episodeComplete = sectionCompleteIn(section, gate.progress);
    const isTutorial = section.episodeId === TUTORIAL_EPISODE_ID;
    if (coverStatus === "locked" || episodeComplete || isTutorial) return;
    const id = section.episodeId;
    const state = coverDownloadStateOf({
      episodeId: id,
      coverStatus,
      episodeComplete,
      isTutorial,
      assetsComplete: reads.assetsComplete(id),
      gate: reads.gateOf(id),
      scheduled: reads.scheduled(id),
      syncing: reads.syncing,
      activity: reads.activity,
      bytes: reads.bytes(id),
    });
    if (state.kind !== "none") out[id] = state;
  });
  return out;
}
