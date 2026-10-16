// 여정 맵의 카탈로그 구획 계약입니다. 타입만 둡니다 — 튜토리얼 구획(`JourneyMapSection`)과
// 섞이지 않는 별도 종류입니다.

import type { LockReason } from "../../lib/episode-catalog";
import type { CatalogProgress, CatalogUnitKey } from "../../lib/catalog-progress";
import type {
  JourneyMapItemStatus,
  JourneyMapNodeStatus,
  JourneyMapSection,
  JourneyStepId,
} from "./journey-map-types";
import type { JourneyMapNodeAccess, JourneyMapProgressLoad } from "./journey-map-load.contract";
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
  /** 에피소드 완료 키 — `episode.completion?.requires ?? [episode.finalTest.id]`. 비지 않는다. */
  readonly completionKeys: readonly CatalogUnitKey[];
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

/** 레슨 · 최종 노드 — 상태가 사슬(표지 → 레슨들 → 최종)에서 파생됩니다. */
export type CatalogUnitNode = {
  readonly key: CatalogUnitKey;
  readonly role: "lesson" | "final";
  readonly ordinal: number;
  readonly status: JourneyMapItemStatus;
};

/** 맵 화면의 카탈로그 슬롯입니다. 없으면(undefined) 카탈로그 구획이 없는 맵 — 튜토리얼만. */
export type JourneyMapCatalogProps = {
  readonly sections: readonly CatalogMapSection[];
  readonly progress: CatalogProgress;
  readonly onStartCover: (episodeId: string) => void;
  /** 레슨 · 최종 노드를 눌렀을 때. 열린 노드에서만 불립니다. */
  readonly onStartUnit: (episodeId: string, unitKey: CatalogUnitKey) => void;
};

export type CatalogMapSectionsProps = {
  readonly sections: readonly CatalogMapSection[];
  readonly gate: CatalogGate;
  /** 없으면 열려 있습니다. */
  readonly access?: JourneyMapNodeAccess;
  readonly onStartCover: (episodeId: string) => void;
  readonly onStartUnit: (episodeId: string, unitKey: CatalogUnitKey) => void;
};

export type CatalogEpisodeSectionProps = {
  readonly section: CatalogReadySection;
  readonly coverStatus: JourneyMapNodeStatus;
  readonly access: JourneyMapNodeAccess;
  readonly progress: CatalogProgress;
  readonly onStartCover: (episodeId: string) => void;
  readonly onStartUnit: (episodeId: string, unitKey: CatalogUnitKey) => void;
};

export type CatalogUnavailableSectionProps = { readonly section: CatalogUnavailableSection };

export type CatalogCoverMapItemProps = {
  readonly episodeId: string;
  /** 낭독의 `Episode n.` 자리입니다. */
  readonly ordinal: number;
  readonly status: JourneyMapNodeStatus;
  readonly onSelect: (episodeId: string) => void;
};

export type CatalogUnitNodeProps = {
  readonly episodeId: string;
  readonly episodeOrdinal: number;
  readonly node: Omit<CatalogUnitNode, "status"> & { readonly status: JourneyMapNodeStatus };
  readonly onSelect: (episodeId: string, unitKey: CatalogUnitKey) => void;
};

export type JourneyMapHeaderSlotProps = {
  /** 화면이 배럴에서 읽은 값을 넘깁니다(테스트 mock이 닿게). */
  readonly tutorialSections: readonly JourneyMapSection[];
  readonly progress: JourneyProgress;
  readonly load: JourneyMapProgressLoad;
  /** 화면 겹침 레이어가 떠 있으면 참 — 실패 줄의 재시도 버튼을 낭독에서 가립니다(ADR-0016 D9). */
  readonly obscured?: boolean;
  /** 열려 있는 스텝 말풍선의 스텝입니다 — 띠의 unit 번호가 그 스텝을 따릅니다. 없으면 `null`과 같습니다. */
  readonly openStepId?: JourneyStepId | null;
};

export type CatalogMapCopy = {
  readonly episodeLabel: (ordinal: number) => string;
  readonly coverTitle: string;
  readonly lessonTitle: (ordinal: number) => string;
  readonly finalTitle: string;
  /** 표지 · 레슨 · 최종 노드의 낭독 이름 — `Episode n. <제목>`. */
  readonly nodeLabel: (episodeLabel: string, title: string) => string;
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
