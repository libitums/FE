// 카탈로그 맨 끝의 「다음 에피소드 준비 중」 구획을 세울지와 그 번호를 정하는 순수 모듈입니다. 마지막 구획이
// 열린 에피소드일 때만 그다음 번호로 섭니다 — 에피소드가 늘면 따라 밀립니다. 마지막이 이미 준비 중 · 잠김이면
// 그 구획이 같은 말을 하므로 붙이지 않습니다.

import type { CatalogMapSection } from "./catalog-map.contract";

export function catalogComingSoonOrdinal(sections: readonly CatalogMapSection[]): number | null {
  const last = sections[sections.length - 1];
  return last?.kind === "catalog-ready" ? sections.length + 1 : null;
}
