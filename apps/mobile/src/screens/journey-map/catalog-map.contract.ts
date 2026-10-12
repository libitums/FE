// 여정 맵의 카탈로그 구획 계약입니다. 타입만 둡니다 — 튜토리얼 구획(`JourneyMapSection`)과
// 섞이지 않는 별도 종류입니다.

import type { LockReason } from "../../lib/episode-catalog";
import type { CatalogProgress, CatalogUnitKey } from "../../lib/catalog-progress";
import type { JourneyMapItemStatus, JourneyMapSection } from "./journey-map-types";
import type { JourneyProgress } from "./journey-map-progress";

export type CatalogUnavailableReason = "pending" | LockReason;

export type CatalogReadySection = {
  readonly kind: "catalog-ready";
  readonly episodeId: string;
  /** 카탈로그 안 1-based 자리 — 「Episode n.」 */
  readonly ordinal: number;
  /** 매니페스트(이긴 쪽) 제목 */
  readonly title: string;
  /** `episode.units`의 id, 순서 그대로 */
  readonly lessonKeys: readonly CatalogUnitKey[];
  /** `episode.finalTest.id` ("RP") */
  readonly finalKey: CatalogUnitKey;
};

export type CatalogUnavailableSection = {
  readonly kind: "catalog-unavailable";
  readonly episodeId: string;
  readonly ordinal: number;
  readonly title: string;
  readonly reason: CatalogUnavailableReason;
};

export type CatalogMapSection = CatalogReadySection | CatalogUnavailableSection;

export type CatalogGate = {
  readonly tutorialPassed: boolean;
  readonly progress: CatalogProgress;
};

export type CatalogCaptionKind = "pending" | "update" | "unavailable";

export type CatalogLockedNode = {
  readonly key: CatalogUnitKey;
  readonly role: "lesson" | "final";
  readonly ordinal: number;
};

export type CatalogSectionProgress = { readonly completed: number; readonly total: number };

/** 맵 화면의 카탈로그 슬롯입니다. 없으면(undefined) 카탈로그 구획이 없는 맵 — 튜토리얼만. */
export type JourneyMapCatalogProps = {
  readonly sections: readonly CatalogMapSection[];
  readonly progress: CatalogProgress;
  readonly onStartCover: (episodeId: string) => void;
};

export type CatalogMapSectionsProps = {
  readonly sections: readonly CatalogMapSection[];
  readonly gate: CatalogGate;
  readonly onStartCover: (episodeId: string) => void;
};

export type CatalogEpisodeSectionProps = {
  readonly section: CatalogReadySection;
  readonly coverStatus: JourneyMapItemStatus;
  readonly onStartCover: (episodeId: string) => void;
};

export type CatalogUnavailableSectionProps = { readonly section: CatalogUnavailableSection };

export type CatalogCoverMapItemProps = {
  readonly episodeId: string;
  readonly status: JourneyMapItemStatus;
  readonly onSelect: (episodeId: string) => void;
};

export type CatalogLockedUnitNodeProps = {
  readonly episodeId: string;
  readonly node: CatalogLockedNode;
};

export type CatalogEpisodeHeaderProps = {
  readonly section: CatalogMapSection;
  readonly progress: CatalogProgress;
};

export type JourneyMapHeaderSlotProps = {
  /** `useCurrentEpisode`의 index(튜토리얼 + 카탈로그 이어 센 자리) */
  readonly index: number;
  /** 화면이 배럴에서 읽은 값을 넘깁니다(테스트 mock이 닿게). */
  readonly tutorialSections: readonly JourneyMapSection[];
  readonly progress: JourneyProgress;
  readonly catalog: JourneyMapCatalogProps | undefined;
};

export type CatalogMapCopy = {
  readonly episodeLabel: (ordinal: number) => string;
  readonly coverTitle: string;
  readonly lessonTitle: (ordinal: number) => string;
  readonly finalTitle: string;
  readonly preparing: (title: string) => string;
  readonly caption: Readonly<Record<CatalogCaptionKind, string>>;
  readonly unavailableSection: (label: string, title: string, kind: CatalogCaptionKind) => string;
};

export type CatalogMapTestId =
  | `catalog-section-${string}`
  | `catalog-unavailable-${string}`
  | `catalog-unavailable-caption-${string}`
  | "catalog-header-unavailable"
  // CatalogMapSections 루트(가림 속성 자리)
  | "journey-map-screen-catalog";
