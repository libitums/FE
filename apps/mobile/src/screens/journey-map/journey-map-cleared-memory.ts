// 방금 끝낸 유닛입니다 — 앱이 떠 있는 동안만 기억합니다(기기에 적지 않습니다). 맵은 다른 화면이 서면 내려가고
// 돌아오면 다시 서므로, 맵이 마운트 때 한 번 읽어 그 유닛의 다음 구간 발자국에만 등장 모션을 겁니다(ADR-0100).
// `journey-map-scroll-memory.ts`와 같은 꼴입니다.

import type { CatalogUnitKey } from "../../lib/catalog-progress";

export type MapClearedUnit = { readonly episodeId: string; readonly unitKey: CatalogUnitKey };

let remembered: MapClearedUnit | null = null;

/** 유닛을 끝낸 것으로 기록하는 자리에서 부릅니다 — 나중 기억이 앞 기억을 덮습니다. */
export function rememberMapCleared(episodeId: string, unitKey: CatalogUnitKey): void {
  remembered = { episodeId, unitKey };
}

/** 기억한 유닛을 돌려주고 비웁니다. 없으면 null. */
export function takeMapCleared(): MapClearedUnit | null {
  const taken = remembered;
  remembered = null;
  return taken;
}

/** 테스트 · 세션 초기화용입니다. */
export function forgetMapCleared(): void {
  remembered = null;
}
