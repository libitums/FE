// 여정 맵의 스페셜 유닛 항목 계약입니다. 타입만 둡니다 — 구현은 `journey-special-unit.ts`(순수) ·
// `SpecialUnitMapItem.tsx`(렌더)가 집니다.

import type { ReactNode } from "@lynx-js/react";
import type { SheetTargetId } from "./catalog-map.contract";
import type { JourneyMapNodeStatus } from "./journey-map-types";

/** `UiCopy.specialUnitMap` — 맵이 스페셜 항목에 붙이는 보조 라벨과 낭독 이름. */
export type SpecialUnitMapCopy = {
  /** 보이는 보조 라벨 — 대문자 문자열 그대로(`SPECIAL`). */
  readonly eyebrow: string;
  /** 낭독 이름 — `special, <이름>`. 상태 접미사는 붙이지 않는다(컴포넌트 몫). */
  readonly accessibilityLabel: (name: string) => string;
};

export type SpecialUnitLabelTone = "muted" | "brand" | "correct";

/** 안내 말풍선이 떠 있는 표지만 `"guide"`(스크림 위로 들림 · 흰 라벨). */
export type SpecialUnitMapLayer = "map" | "guide";

export type SpecialUnitMapItemProps = {
  /** `SpecialUnit`의 `id` — testid `ui-lynx-special-unit-<unitId>` · 라벨 testid의 꼬리. */
  readonly unitId: string;
  /** 보이는 제목(둘째 줄). */
  readonly title: string;
  /** 낭독 이름의 `<이름>` 자리 — 튜토리얼은 제목, 카탈로그는 `Episode n. <제목>`. */
  readonly accessibilityName: string;
  readonly status: JourneyMapNodeStatus;
  /** 고를 수 있는 상태(`canSelectMapNode`)에서만 불린다. 인자는 탭의 세로 좌표(없으면 0)다. */
  readonly onSelect: (tapY: number) => void;
  readonly layer?: SpecialUnitMapLayer; // 기본 "map"
  /** 표식 · 라벨 뒤에 붙는 겹(안내 말풍선). */
  readonly children?: ReactNode;
  /** 이 항목이 여는 말풍선의 키(카탈로그 최종만). 없으면 튕김 · 반짝임이 서지 않습니다. */
  readonly sheetTargetId?: SheetTargetId;
};

export type SpecialUnitMapTestId =
  | `journey-special-unit-label-${string}`
  | `journey-special-unit-eyebrow-${string}`
  | `journey-special-unit-title-${string}`;
