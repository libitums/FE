// 끝낸 에피소드에 업데이트로 생긴 유닛의 판정입니다. 유닛은 순서대로만 열리고 최종 테스트가 사슬의 끝이므로
// (`catalogUnitStatus`), 최종 테스트를 끝낸 에피소드에 남은 안 끝낸 유닛은 끝낸 뒤 콘텐츠가 바뀌어 생긴 것입니다 — 버전을
// 따로 들지 않고 진행만으로 가립니다. 완료 키(`completionKeys`)로 보지 않는 까닭: 완료 키가 레슨 전체인 에피소드(u00)는
// 새 유닛이 생기면 완료가 풀려 안내할 대상에서 빠집니다. 순수 함수만 둡니다.

import type { CatalogProgress, CatalogUnitKey } from "../../lib/catalog-progress";
import { isCatalogUnitDone } from "../../lib/catalog-progress";
import type { CatalogMapSection } from "./catalog-map.contract";

/** 최종 테스트를 끝낸 에피소드의 안 끝낸 유닛(유닛 순서) — 준비되지 않았거나 최종 전이면 빈 배열. */
export function catalogFreshUnitKeysOf(
  section: CatalogMapSection,
  progress: CatalogProgress,
): readonly CatalogUnitKey[] {
  if (section.kind !== "catalog-ready") return [];
  const { episodeId } = section;
  if (!isCatalogUnitDone(progress, episodeId, section.finalKey)) return [];
  return section.lessonKeys.filter((key) => !isCatalogUnitDone(progress, episodeId, key));
}

/**
 * 바뀐 상태의 서명 — 바뀐 에피소드마다 「에피소드:유닛,유닛」. 안내는 본 적 없는 서명이 있을 때 뜨므로, 같은 상태로는
 * 다시 뜨지 않고 새 유닛이 더 생기면 다시 뜹니다.
 */
export function catalogUpdateSignaturesOf(
  sections: readonly CatalogMapSection[],
  progress: CatalogProgress,
): readonly string[] {
  return sections.flatMap((section) => {
    const keys = catalogFreshUnitKeysOf(section, progress);
    return keys.length === 0 ? [] : [`${section.episodeId}:${keys.join(",")}`];
  });
}
