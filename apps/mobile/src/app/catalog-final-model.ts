// 카탈로그 최종 테스트(RP)의 모델입니다 — 콘텐츠 턴을 화면이 그릴 수 있는 턴으로 바꿉니다(순수).
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다.

import { isTypedAnswerAccepted } from "../lib/hangul-keyboard";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { LearningItem } from "../lib/episode-content";
import type {
  CatalogRoleplayTile,
  CatalogRoleplayTurn,
  CatalogRoleplayTurns,
} from "../screens/catalog-final/catalog-final.contract";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { noLearnerProfile } from "./catalog-cover-wiring";
import { koOf, latinOf } from "./catalog-item-text";
import { catalogFillOf } from "./catalog-lesson-plan";
import type { CatalogFill, CatalogItemPort } from "./catalog-lesson-plan";
import { shuffledOrder } from "./catalog-shuffle";
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
  item: LearningItem,
  port: CatalogRoleplayPort,
): CatalogRoleplayTurn | null {
  if (item.type !== "ROLEPLAY_TURN") return null;
  const original = item.tiles.map((tile) => koOf(port, tile.ko));
  const accepted = item.answers.map((answer) => koOf(port, answer.ko)).filter((ko) => ko !== "");
  const lineKo = koOf(port, item.context.ko);
  const [firstAccepted, ...restAccepted] = accepted;
  if (original.length === 0 || original.includes("") || lineKo === "") return null;
  if (firstAccepted === undefined) return null;
  if (!isTypedAnswerAccepted(original.join(" "), accepted)) return null;

  const order = shuffledOrder(`${port.episodeId}/${item.id}`, original.length);
  const shuffled = order.map((index): CatalogRoleplayTile => ({
    ko: original[index] ?? "",
    roman: latinOf(port, item.tiles[index]?.roman) ?? "",
  }));
  const [firstTile, ...restTiles] = shuffled;
  if (firstTile === undefined) return null;

  const imagePath = item.stimulus.imageUrl;
  return {
    id: item.id,
    instruction: latinOf(port, item.prompt.en) ?? "",
    line: {
      ko: lineKo,
      roman: latinOf(port, item.context.roman) ?? null,
      en: latinOf(port, item.context.en) ?? null,
    },
    tiles: [firstTile, ...restTiles],
    accepted: [firstAccepted, ...restAccepted],
    replyTranslation:
      latinOf(port, item.answers[0]?.en) ?? latinOf(port, item.stimulus.text?.en) ?? null,
    imageUrl: imagePath === undefined ? port.sceneImageUrl : port.imageUrlOf(imagePath),
  };
}

export function catalogFinalPlanOf(
  entry: Extract<CatalogEntry, { status: "ready" }>,
  ordinal: number,
  fill: CatalogFill,
  imageUrlOf: (relativePath: string) => string | null,
): CatalogFinalPlan {
  const scenePath = [...entry.episode.prologue]
    .reverse()
    .find((cut) => cut.imageUrl !== undefined)?.imageUrl;
  const port: CatalogRoleplayPort = {
    fill,
    episodeId: entry.id,
    sceneImageUrl: scenePath === undefined ? null : imageUrlOf(scenePath),
    imageUrlOf,
  };
  const attempts = entry.episode.finalTest.items.map((item) => catalogRoleplayTurnOf(item, port));
  const turns = attempts.filter((turn): turn is CatalogRoleplayTurn => turn !== null);
  return {
    episodeId: entry.id,
    ordinal,
    counterpartName: entry.episode.counterpart.trim(),
    turns,
    skippedItemCount: attempts.length - turns.length,
  };
}

// 같은 ready 항목 참조면 같은 계획 참조입니다(`catalogLessonPlanFor`와 같은 까닭).
const memo = new WeakMap<object, CatalogFinalPlan>();

/** 같은 ready 항목 참조면 같은 계획 참조를 돌려줍니다(메모). */
export function catalogFinalPlanFor(
  content: EpisodeContent,
  sections: readonly CatalogMapSection[],
  episodeId: string,
): CatalogFinalPlan | null {
  const entry = content.catalog.find((candidate) => candidate.id === episodeId);
  const section = sections.find((candidate) => candidate.episodeId === episodeId);
  if (entry === undefined || entry.status !== "ready" || section === undefined) return null;
  const known = memo.get(entry);
  if (known !== undefined && known.ordinal === section.ordinal) return known;
  const plan = catalogFinalPlanOf(
    entry,
    section.ordinal,
    catalogFillOf(content, noLearnerProfile),
    content.imageUrlOf,
  );
  memo.set(entry, plan);
  return plan;
}
