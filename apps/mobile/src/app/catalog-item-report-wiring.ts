// 활동이 올린 문항 판정 보고를 측정 이벤트로 잇는 결선입니다. 채점 유형이 아니면 보내지 않습니다.

import type { CatalogUnitKey } from "../lib/catalog-progress";
import { emitCompanionEvent } from "../lib/companion-events";
import type { ItemAnswerReport } from "../lib/item-answer";
import { isWordbookRef } from "../lib/wordbook";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { itemAnsweredEventOf } from "./catalog-events";
import type { ItemAnswerContent } from "./catalog-events";
import type { EpisodeContent } from "./episode-content";
import type { CatalogItemRef } from "./catalog-lesson-types";
import type { LearningTrail } from "./learning-trail";

export type CatalogItemReportWiring = {
  readonly onCatalogItemAnswered: (
    episodeId: string,
    unitKey: CatalogUnitKey,
    ref: CatalogItemRef,
    report: ItemAnswerReport,
  ) => void;
  /** 단어 카드 활동이 끝났을 때 — 보인 카드들(단어장에 적음, ADR-0169). 다시 풀기에는 카드가 없습니다. */
  readonly onCatalogCardsSeen: (episodeId: string, refs: readonly CatalogItemRef[]) => void;
  /** 단어 카드마다 별이 달렸는지(배경 스레드에서 읽음) — 별을 달 수 없는 카드는 null. */
  readonly catalogCardStars: (
    episodeId: string,
    refs: readonly CatalogItemRef[],
  ) => readonly (boolean | null)[];
  /** 단어 카드의 별을 누름(단어장 즐겨찾기, ADR-0169 즐겨찾기 개정). */
  readonly onCatalogCardStar: (episodeId: string, ref: CatalogItemRef, starred: boolean) => void;
};

/** 그 에피소드의 판 정보입니다 — 준비된 카탈로그 항목만. 저장소 출처 `cache`는 측정에서 `remote`라 부릅니다. */
export function itemAnswerContentOf(
  content: Pick<EpisodeContent, "catalog"> | undefined,
  episodeId: string,
): ItemAnswerContent | undefined {
  const entry = content?.catalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") return undefined;
  return {
    version: entry.version,
    source: entry.source === "cache" ? "remote" : "bundled",
    ...(entry.level === undefined ? {} : { level: entry.level }),
  };
}

export function catalogItemReportWiring(args: {
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
  readonly episodeContent?: Pick<EpisodeContent, "catalog">;
  /** 레슨 자취(단어장 · Letters 추천 신호, ADR-0169). 없으면 측정만 합니다. */
  readonly learningTrail?: LearningTrail;
}): CatalogItemReportWiring {
  const sink = args.episodeIntroEventSink;
  return {
    onCatalogItemAnswered: (episodeId, unitKey, ref, report) => {
      const event = itemAnsweredEventOf(
        episodeId,
        unitKey,
        ref,
        report,
        itemAnswerContentOf(args.episodeContent, episodeId),
      );
      if (event !== null) sink?.(event);
      args.learningTrail?.itemAnswered(episodeId, ref, report.outcome);
    },
    catalogCardStars: (episodeId, refs) =>
      args.learningTrail?.starsOf(
        episodeId,
        refs.map((ref) => ref.contentRef),
      ) ?? refs.map(() => null),
    onCatalogCardStar: (episodeId, ref, starred) => {
      const contentRef = ref.contentRef;
      if (contentRef === undefined || !isWordbookRef(contentRef)) return;
      args.learningTrail?.setStar(episodeId, contentRef, starred);
      emitCompanionEvent(sink, {
        name: "wordbook_star_toggled",
        surface: "learning",
        starred,
        source: "lesson_card",
      });
    },
    onCatalogCardsSeen: (episodeId, refs) => {
      args.learningTrail?.cardsSeen(
        episodeId,
        refs.map((ref) => ref.contentRef),
      );
    },
  };
}
