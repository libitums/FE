import type { ReactNode } from "@lynx-js/react";

import type { MapRowKind } from "./journey-map-rows";

export type MapUnitRowProps = { readonly kind: MapRowKind; readonly children: ReactNode };
export type MapUnitCellProps = {
  readonly domId: string;
  /** testid의 꼬리입니다 — `journey-map-cell-<testKey>`. */
  readonly testKey: string;
  readonly children: ReactNode;
};

// 껍데기입니다 — 줄 · 셀 상자와 속성은 구현 단계에서 채웁니다.
export function MapUnitRow({ children }: MapUnitRowProps): ReactNode {
  return children;
}

export function MapUnitCell({ children }: MapUnitCellProps): ReactNode {
  return children;
}
