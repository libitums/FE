// 짝 맞추기로의 매핑입니다(순수).
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다.

import type { LearningItem } from "../lib/episode-content.model";
import { koOf, latinOf, skippedItem } from "./catalog-item-text";
import type { CatalogLessonItemPort, CatalogMappedItem } from "./catalog-lesson-types";
import { shuffledOrder } from "./catalog-shuffle";

const hasTwo = (values: readonly string[]): values is readonly [string, string, ...string[]] =>
  values.length >= 2;

/** 낱말 열은 콘텐츠 순서, 뜻 열만 섞습니다. 정답은 낱말마다 뜻이 선 자리입니다. */
export function pairMatchItemOf(
  item: Extract<LearningItem, { type: "PAIR_MATCH" }>,
  port: CatalogLessonItemPort,
): CatalogMappedItem {
  const words = item.pairs.map((pair) => koOf(port, pair.left.ko));
  const glosses = item.pairs.map((pair) => latinOf(port, pair.right) ?? "");
  const malformed =
    words.length < 2 ||
    words.length !== item.tiles.length ||
    words.includes("") ||
    glosses.includes("") ||
    new Set(words).size !== words.length;
  if (malformed) return skippedItem(item, "malformed");
  const order = shuffledOrder(`${port.episodeId}/${item.id}`, words.length);
  const meanings = order.map((index) => glosses[index] ?? "");
  if (!hasTwo(words) || !hasTwo(meanings)) return skippedItem(item, "malformed");
  return {
    kind: "pair-match",
    itemId: item.id,
    question: { words, meanings, answer: words.map((_, index) => order.indexOf(index)) },
  };
}
