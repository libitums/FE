// 음절 조립(SYLLABLE_BUILD)으로의 매핑과 철자 탐색입니다(순수).
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다. 뼈대만 선 상태입니다 — 철자 탐색과
// 매핑은 아직 채우지 않았습니다.

import type { LearningItem } from "../lib/episode-content.model";
import { skippedItem } from "./catalog-item-text";
import type { CatalogLessonItemPort, CatalogMappedItem } from "./catalog-lesson-types";

/**
 * 타일을 한 번씩만 써서 이으면 `word`가 되는 타일 인덱스 열입니다 — 깊이 우선 · 작은 인덱스 먼저 · 접두
 * 비교입니다. 없으면 `null`입니다.
 */
export function catalogSpellingOf(
  _tiles: readonly string[],
  _word: string,
): readonly number[] | null {
  return null;
}

export function syllableBuildItemOf(
  item: Extract<LearningItem, { type: "SYLLABLE_BUILD" }>,
  _port: CatalogLessonItemPort,
): CatalogMappedItem {
  return skippedItem(item, "screen-pending");
}
