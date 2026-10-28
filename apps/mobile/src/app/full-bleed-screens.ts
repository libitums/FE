// 셸이 여백을 잡지 않는 route 판정입니다.

import type { SafeAreaInsets } from "../lib/safe-area";
import { mapTopLayout } from "../screens/journey-map/journey-map-insets";
import type { Screen } from "./nav-state";

export function isFullBleedScreen(screen: Screen): boolean {
  return (
    screen.name === "journey-entry" ||
    screen.name === "catalog-cover" ||
    screen.name === "catalog-story" ||
    screen.name === "catalog-final" ||
    screen.name === "catalog-epilogue" ||
    screen.name === "roleplay-story"
  );
}

/**
 * 셸이 잡을 여백입니다. 가장자리까지 그림을 까는 화면은 넷 다 0, 여정 맵은 위만 0입니다 — 맵이 상태 표시줄
 * 뒤까지 스크롤하고 그 높이는 맵이 스스로 더합니다(`mapTopLayout`, ⟨2026-10-19⟩ 사용자 결정).
 */
export function shellInsetsFor(screen: Screen, insets: SafeAreaInsets): SafeAreaInsets {
  if (isFullBleedScreen(screen)) return { top: 0, bottom: 0, left: 0, right: 0 };
  if (screen.name === "journey-map") return { ...insets, top: 0 };
  return insets;
}

/** 전역 머리(칩)의 위 모서리입니다 — 셸이 위 여백을 잡지 않는 여정 맵에서만 안전 영역 높이를 더합니다. */
export function shellHeaderTop(screen: Screen, insets: SafeAreaInsets): number {
  return mapTopLayout(screen.name === "journey-map" ? insets.top : 0).headerTop;
}
