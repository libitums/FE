// 가입 권유 카드의 자리(ADR-0174, 시안 Main) — 바텀 내비 위에 뜹니다. 순수 상수 · 함수.

/** 바텀 내비 높이(위 8 + 항목 48 + 아래 12 — `journey-map-screen.css`의 아래 여백 설명과 같은 값). */
export const navigatorHeight = 68;
/** 카드와 바 사이. */
export const cardGap = 12;
/** 카드 높이의 위 한계(주머니 칸 72 + 위아래 여백 16 × 2 + 테두리) — 큰 글자에서도 두 줄 글이 이 안에 섭니다. */
export const cardHeightEstimate = 108;

/** 셸 기준 카드의 `bottom` — 바 높이 + 간격 + 바 밑 시스템 바 몫(`tappableBottomInset`). */
export function signupCardBottom(tappableBottom: number): number {
  return navigatorHeight + cardGap + Math.max(0, tappableBottom);
}

/** 카드가 지도 아래에서 차지하는 몫 — 지도 아래 여백이 이보다 커야 맨 아래 유닛이 카드에 가리지 않습니다. */
export const signupCardReserve = navigatorHeight + cardGap + cardHeightEstimate;
