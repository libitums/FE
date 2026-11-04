// 표지 일러스트의 순수 파생입니다 — 홀짝 → 좌우, 매니페스트 `cover` 경로 → 주소. 던지지 않습니다.

import type { CatalogReadySection } from "./catalog-map.contract";

export type CatalogCoverIllustrationSide = "left" | "right";

export type CatalogCoverIllustration = {
  readonly url: string;
  /** 일러스트가 노드의 어느 쪽 위로 물러나는가 — `left`면 노드 면이 4사분면, `right`면 3사분면을 덮습니다. */
  readonly side: CatalogCoverIllustrationSide;
};

/** 짝수 `Episode n.`(0 · 2 · 4 …)은 왼쪽, 홀수는 오른쪽입니다. 소수는 정수부로, 음수도 홀짝으로 봅니다. */
export function coverIllustrationSideOf(ordinal: number): CatalogCoverIllustrationSide {
  return Math.trunc(ordinal) % 2 === 0 ? "left" : "right";
}

/** `cover`가 없거나 주소를 만들 수 없으면 null입니다. */
export function catalogCoverIllustrationOf(
  section: Pick<CatalogReadySection, "ordinal" | "cover">,
  imageUrlOf: (relativePath: string) => string | null,
): CatalogCoverIllustration | null {
  if (section.cover === undefined) return null;
  const url = imageUrlOf(section.cover);
  return url === null ? null : { url, side: coverIllustrationSideOf(section.ordinal) };
}
