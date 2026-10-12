import type { ReactNode } from "@lynx-js/react";

import type { CatalogUnitNodeProps } from "./catalog-map.contract";

import "./journey-special-unit.css";

// 카탈로그 레슨 · 최종 노드입니다 — 상태(잠김 · 열림 · 끝)가 사슬에서 파생되고, 열린 노드만 고름을 올립니다.
export function CatalogUnitNode({ episodeId, node }: CatalogUnitNodeProps): ReactNode {
  return (
    <view className="journey-special-unit" data-testid={`catalog-unit-${episodeId}-${node.key}`} />
  );
}
