// 단어 카드로의 매핑과 낱말 뜻 조회입니다(순수).
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다.

import type { LearningItem, Word } from "../lib/episode-content.model";
import { skippedItem } from "./catalog-item-text";
import type {
  CatalogFill,
  CatalogGlossOf,
  CatalogLessonItemPort,
  CatalogMappedItem,
} from "./catalog-lesson-types";

/** 낱말 `ref`의 영어 뜻을 찾는 함수입니다. 지금은 아무것도 찾지 않는 뼈대입니다. */
export function catalogGlossOf(_words: readonly Word[], _fill: CatalogFill): CatalogGlossOf {
  return () => null;
}

export function vocabCardItemOf(
  item: Extract<LearningItem, { type: "VOCAB_CARD" }>,
  _port: CatalogLessonItemPort,
): CatalogMappedItem {
  return skippedItem(item, "malformed");
}
