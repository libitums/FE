// 카탈로그 결선의 「이미 끝낸 활동」 기억입니다 — 상태를 두는 자리만 정하고 동작은 결선이 합니다.

export type CatalogFinishGuard = { current: string | null };

export function newCatalogFinishGuard(): CatalogFinishGuard {
  return { current: null };
}
