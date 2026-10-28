// 여정 맵의 카탈로그 구획 계약입니다. 타입만 둡니다 — 튜토리얼(u00)도 카탈로그 에피소드의 하나입니다.

import type { LockReason } from "../../lib/episode-catalog";
import type { CatalogProgress, CatalogUnitKey } from "../../lib/catalog-progress";
import type { ReactNode } from "@lynx-js/react";
import type { SheetEntranceMotion } from "./journey-map-sheet-entrance.contract";

import type { JourneyMapItemStatus, JourneyMapNodeStatus } from "./journey-map-types";
import type { SpecialUnitMapLayer } from "./journey-special-unit.contract";
import type { JourneyMapNodeAccess, JourneyMapProgressLoad } from "./journey-map-load.contract";

/** 열린 카탈로그 유닛 말풍선의 키입니다(`catalogSheetKey`). */
export type CatalogSheetKey = `catalog:${string}`;

/** 말풍선을 연 유닛입니다. 상태 이름(`openStepId`)은 스텝 그대로입니다. */
export type SheetTargetId = CatalogSheetKey;

export type CatalogUnavailableReason = "pending" | LockReason;

export type CatalogReadySection = {
  readonly kind: "catalog-ready";
  readonly episodeId: string;
  /** 매니페스트 `order` — 「Episode n.」 */
  readonly ordinal: number;
  /** 매니페스트(이긴 쪽) 제목 */
  readonly title: string;
  /** 에피소드의 영어 제목(`title_en`)입니다 — 말풍선 · 머리 띠가 씁니다. 없으면 `title`을 씁니다. */
  readonly titleEn?: string;
  /** `episode.units`의 id, 순서 그대로 */
  readonly lessonKeys: readonly CatalogUnitKey[];
  /** `episode.finalTest.id` ("RP") */
  readonly finalKey: CatalogUnitKey;
  /** 에피소드 완료 키 — `episode.completion?.requires ?? [episode.finalTest.id]`. 비지 않는다. */
  readonly completionKeys: readonly CatalogUnitKey[];
  /** 문화 유닛의 키 — `lessonKeys`의 부분집합(유닛 순서)입니다. 없으면 빈 배열. */
  readonly cultureKeys: readonly CatalogUnitKey[];
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
  /** 옛 튜토리얼 최종 테스트를 통과한 기록이 있는가 — 사용자 기록의 사실(파생 입력)입니다. */
  readonly legacyTutorialPassed: boolean;
  readonly progress: CatalogProgress;
  /** 티켓을 쓰고 연 유닛입니다. 없으면 `{}`. 잠김을 풀지는 않고 열린 유닛의 색만 바꿉니다. */
  readonly ticketUnits?: CatalogProgress;
};

export type CatalogCaptionKind = "pending" | "update" | "unavailable";

export type CatalogUnitNodeRole = "lesson" | "culture" | "final";

/** 레슨 · 문화 · 최종 노드 — 상태가 사슬(표지 → 레슨들 → 최종)에서 파생됩니다. */
export type CatalogUnitNode = {
  readonly key: CatalogUnitKey;
  readonly role: CatalogUnitNodeRole;
  readonly ordinal: number;
  readonly status: JourneyMapItemStatus;
  /** 열림(`available`)이고 티켓을 쓰고 연 유닛이면 참입니다 — 맵이 진한 색(`brand.primary` · 흰 아이콘)으로 세웁니다. */
  readonly ticketed?: boolean;
};

/** 맵 화면의 카탈로그 슬롯입니다. */
export type JourneyMapCatalogProps = {
  readonly sections: readonly CatalogMapSection[];
  readonly progress: CatalogProgress;
  /** 티켓을 쓰고 연 유닛입니다(맵 노드 색 · 말풍선의 티켓 표시). 없으면 `{}`. */
  readonly ticketUnits?: CatalogProgress;
  /** 옛 튜토리얼 최종 테스트를 통과한 기록이 있는가 — 튜토리얼 다음 구획의 문 입력입니다. */
  readonly legacyTutorialPassed: boolean;
  readonly onStartCover: (episodeId: string) => void;
  /** 말풍선의 `Start`를 눌렀을 때입니다. 노드를 누르면 맵이 먼저 말풍선을 엽니다. */
  readonly onStartUnit: (episodeId: string, unitKey: CatalogUnitKey) => void;
  /**
   * 말풍선 진행 줄의 전체 수 — 그 유닛을 열면 서는 문항 수입니다. 없거나 0이면 진행 줄을 그리지
   * 않습니다(학습자 프로필이 아직 없어 문항을 지을 수 없을 때 등).
   */
  readonly unitItemCountOf?: (episodeId: string, unitKey: CatalogUnitKey) => number;
};

/** 열린 노드를 눌렀을 때 — 탭의 세로 좌표는 유닛을 재기 전까지 말풍선이 설 어림 자리입니다. */
export type CatalogUnitSelect = (episodeId: string, unitKey: CatalogUnitKey, tapY: number) => void;

/** 첫 유닛 안내의 맵 쪽 손잡이입니다. */
export type CatalogMapGuide = { readonly visible: boolean; readonly dismiss: () => void };

/** 안내가 어느 구획의 표지를 가리키는 동안 그 구획이 받는 손잡이입니다. */
export type CatalogCoverGuide = { readonly dismiss: () => void };

export type CatalogMapSectionsProps = {
  readonly sections: readonly CatalogMapSection[];
  readonly gate: CatalogGate;
  /** 없으면 열려 있습니다. */
  readonly access?: JourneyMapNodeAccess;
  /** 없으면 안내가 없는 맵입니다. */
  readonly guide?: CatalogMapGuide;
  readonly onStartCover: (episodeId: string) => void;
  readonly onSelectUnit: CatalogUnitSelect;
};

export type CatalogEpisodeSectionProps = {
  readonly section: CatalogReadySection;
  readonly coverStatus: JourneyMapNodeStatus;
  readonly access: JourneyMapNodeAccess;
  readonly progress: CatalogProgress;
  /** 티켓을 쓰고 연 유닛입니다. 없으면 `{}`. */
  readonly ticketUnits?: CatalogProgress;
  /** 첫 유닛 안내가 이 구획의 표지를 가리키는 동안의 손잡이, 아니면 null. */
  readonly guide: CatalogCoverGuide | null;
  readonly onStartCover: (episodeId: string) => void;
  readonly onSelectUnit: CatalogUnitSelect;
};

export type CatalogUnavailableSectionProps = {
  readonly section: CatalogUnavailableSection;
};

export type CatalogCoverMapItemProps = {
  readonly episodeId: string;
  /** 낭독의 `Episode n.` 자리입니다. */
  readonly ordinal: number;
  readonly status: JourneyMapNodeStatus;
  readonly onSelect: (episodeId: string) => void;
  readonly layer?: SpecialUnitMapLayer; // 기본 "map"
  /** 안내 말풍선 자리입니다. */
  readonly children?: ReactNode;
};

export type FirstUnitMapTooltipProps = {
  /** 고를 수 있을 때만 onSelect가 불립니다. */
  readonly status: JourneyMapNodeStatus;
  readonly onSelect: () => void;
};

export type CatalogUnitNodeProps = {
  readonly episodeId: string;
  readonly episodeOrdinal: number;
  readonly node: Omit<CatalogUnitNode, "status"> & { readonly status: JourneyMapNodeStatus };
  readonly onSelect: CatalogUnitSelect;
};

export type JourneyMapHeaderSlotProps = {
  readonly load: JourneyMapProgressLoad;
  /** 띠 자리 · 띠의 위 모서리(`mapTopLayout`). 없으면 CSS 기본값(64)과 같다. */
  readonly bandTop?: number;
  /** 로딩 줄의 위 모서리(`mapTopLayout`). 없으면 CSS 기본값(72)과 같다. */
  readonly progressRowTop?: number;
  /** 화면 겹침 레이어가 떠 있으면 참 — 실패 줄의 재시도 버튼을 낭독에서 가립니다(ADR-0016 D9). */
  readonly obscured?: boolean;
  /** 열려 있는 말풍선의 유닛입니다 — 띠의 unit 번호가 그 유닛을 따릅니다. 없으면 `null`과 같습니다. */
  readonly openStepId?: SheetTargetId | null;
  /** 카탈로그 유닛의 말풍선이면 이 구획 · 진행으로 띠를 세웁니다. */
  readonly catalogSections?: readonly CatalogMapSection[];
  readonly catalogProgress?: CatalogProgress;
  /** 띠의 등장 모션입니다. 없으면 `none`(모션 없음)과 같습니다. */
  readonly sheetEntrance?: SheetEntranceMotion;
};

export type CatalogMapCopy = {
  readonly episodeLabel: (ordinal: number) => string;
  readonly coverTitle: string;
  readonly lessonTitle: (ordinal: number) => string;
  readonly finalTitle: string;
  readonly cultureTitle: string;
  /** 표지 · 레슨 · 최종 노드의 낭독 이름 — `Episode n. <제목>`. */
  readonly nodeLabel: (episodeLabel: string, title: string) => string;
  readonly caption: Readonly<Record<CatalogCaptionKind, string>>;
  readonly unavailableSection: (label: string, title: string, kind: CatalogCaptionKind) => string;
  /** 카탈로그 맨 끝 「다음 에피소드 준비 중」 구획 — 제목 · 안내 · 낭독 이름(`Episode n.` 뒤에 둘을 잇습니다). */
  readonly comingSoon: {
    readonly title: string;
    readonly body: string;
    readonly label: (episodeLabel: string) => string;
  };
};

export type CatalogMapTestId =
  | `catalog-section-${string}`
  | `catalog-unavailable-${string}`
  | `catalog-unavailable-caption-${string}`
  // 받는 중인 에피소드의 「준비 중」 구획(ADR-0071)
  | `catalog-pending-${string}`
  | "catalog-header-unavailable"
  // CatalogMapSections 루트(가림 속성 자리)
  | "journey-map-screen-catalog"
  | "first-unit-map-tooltip";
