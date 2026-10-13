// 짝 맞추기로의 매핑입니다(순수).
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다.

import type { LearningItem } from "../lib/episode-content.model";
import { skippedItem } from "./catalog-item-text";
import type { CatalogLessonItemPort, CatalogMappedItem } from "./catalog-lesson-types";

export function pairMatchItemOf(
  item: Extract<LearningItem, { type: "PAIR_MATCH" }>,
  _port: CatalogLessonItemPort,
): CatalogMappedItem {
  return skippedItem(item, "malformed");
}
