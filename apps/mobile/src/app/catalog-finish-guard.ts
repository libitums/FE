import { useRef } from "@lynx-js/react";

// 카탈로그 결선의 「이미 끝낸 활동」 기억입니다 — 상태를 두는 자리만 정하고 동작은 결선이 합니다.

export type CatalogFinishGuard = { current: string | null };

export function newCatalogFinishGuard(): CatalogFinishGuard {
  return { current: null };
}

/** 세션이 들고 있는 가드입니다 — 같은 렌더 안의 연타를 거르려고 상태가 아닌 ref입니다. */
export function useCatalogFinishGuard(): CatalogFinishGuard {
  return useRef(newCatalogFinishGuard()).current;
}
