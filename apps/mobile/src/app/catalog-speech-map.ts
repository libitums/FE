// 말하기 문항(SHADOW · SPEAK_WORD)의 매핑입니다(순수).
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다.
//
// 스캐폴드: 둘 다 건너뜀 자리표시자입니다.

import type { LearningItem } from "../lib/episode-content.model";
import { skippedItem } from "./catalog-item-text";
import type {
  CatalogItemPort,
  CatalogLessonItemPort,
  CatalogMappedItem,
} from "./catalog-lesson-types";

type ItemOf<T extends LearningItem["type"]> = Extract<LearningItem, { type: T }>;

/** SHADOW — 출처 묶음 `answers[0]` → `stimulus.text`(한국어가 빈 쪽은 건너뜀). 둘 다 비면 malformed. */
export function readAloudItemOf(item: ItemOf<"SHADOW">, _port: CatalogItemPort): CatalogMappedItem {
  return skippedItem(item, "malformed");
}

/** SPEAK_WORD — malformed(정답 0) → image-missing(주소 없음 · 못 풂) → no-gloss(뜻 없음) 순서. */
export function speakWordItemOf(
  item: ItemOf<"SPEAK_WORD">,
  _port: CatalogLessonItemPort,
): CatalogMappedItem {
  return skippedItem(item, "malformed");
}
