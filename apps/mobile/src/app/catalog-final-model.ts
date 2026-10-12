// 카탈로그 최종 테스트(RP)의 모델입니다 — 콘텐츠 턴을 화면이 그릴 수 있는 턴으로 바꿉니다(순수).
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다.

import type { CatalogEntry } from "../lib/episode-catalog";
import type { LearningItem } from "../lib/episode-content";
import type {
  CatalogRoleplayTile,
  CatalogRoleplayTurn,
  CatalogRoleplayTurns,
} from "../screens/catalog-final/catalog-final.contract";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import type { CatalogFill, CatalogItemPort } from "./catalog-lesson-plan";
import type { EpisodeContent } from "./episode-content";

export type { CatalogRoleplayTile, CatalogRoleplayTurn, CatalogRoleplayTurns };

export type CatalogFinalPlan = {
  readonly episodeId: string;
  readonly ordinal: number;
  /** `episode.counterpart`(치환 없음, trim) */
  readonly counterpartName: string;
  readonly turns: readonly CatalogRoleplayTurn[];
  readonly skippedItemCount: number;
};

export type CatalogRoleplayPort = CatalogItemPort & {
  /** 표지 컷 중 그림이 있는 마지막 컷의 절대 URL입니다. */
  readonly sceneImageUrl: string | null;
  readonly imageUrlOf: (relativePath: string) => string | null;
};

/** RP 문항이 아니거나 그릴 수 없는 모양이면 `null`(건너뜀)입니다. */
export function catalogRoleplayTurnOf(
  _item: LearningItem,
  _port: CatalogRoleplayPort,
): CatalogRoleplayTurn | null {
  return null;
}

export function catalogFinalPlanOf(
  entry: Extract<CatalogEntry, { status: "ready" }>,
  ordinal: number,
  _fill: CatalogFill,
  _imageUrlOf: (relativePath: string) => string | null,
): CatalogFinalPlan {
  return {
    episodeId: entry.id,
    ordinal,
    counterpartName: entry.episode.counterpart.trim(),
    turns: [],
    skippedItemCount: 0,
  };
}

/** 같은 ready 항목 참조면 같은 계획 참조를 돌려줍니다(메모). */
export function catalogFinalPlanFor(
  _content: EpisodeContent,
  _sections: readonly CatalogMapSection[],
  _episodeId: string,
): CatalogFinalPlan | null {
  return null;
}
