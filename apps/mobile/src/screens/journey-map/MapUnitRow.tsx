import type { ReactNode } from "@lynx-js/react";

import type { MapRowKind } from "./journey-map-rows";

import "./journey-map-row.css";

export type MapUnitRowProps = { readonly kind: MapRowKind; readonly children: ReactNode };
export type MapUnitCellProps = {
  readonly domId: string;
  /** testid의 꼬리입니다 — `journey-map-cell-<testKey>`. */
  readonly testKey: string;
  /** 참이면 이 칸을 낭독에서 가립니다(첫 유닛 안내가 다른 칸을 가리키는 동안). 없으면 속성을 달지 않습니다. */
  readonly hidden?: boolean;
  readonly children: ReactNode;
};

// 줄 상자입니다 — 구획 상자의 직계 자식이고, 종류는 클래스로 가릅니다. 낭독 요소가 아닙니다:
// `accessibility-element={false}`가 정지가 늘지 않게 하는 속성 하나입니다(ADR-0022 D5와 같은 선택).
export function MapUnitRow({ kind, children }: MapUnitRowProps): ReactNode {
  return (
    <view
      className={`journey-map-row journey-map-row-${kind}`}
      data-testid="journey-map-row"
      // 데이터셋 키는 카멜로 적습니다(하이픈 키는 테스트 환경이 거부합니다) — 속성 이름은 `data-row-kind`가 됩니다.
      data-rowKind={kind}
      accessibility-element={false}
    >
      {children}
    </view>
  );
}

// 셀 상자입니다 — 유닛의 DOM id(자동 스크롤이 잽니다)와 testid를 집니다. 접근성 속성은 없습니다:
// 탭 · 낭독 단위는 안쪽 `LearningUnit`입니다.
export function MapUnitCell({ domId, testKey, hidden, children }: MapUnitCellProps): ReactNode {
  return (
    <view
      id={domId}
      className="journey-map-cell"
      data-testid={`journey-map-cell-${testKey}`}
      {...(hidden === undefined ? {} : { "accessibility-elements-hidden": hidden })}
    >
      {children}
    </view>
  );
}
