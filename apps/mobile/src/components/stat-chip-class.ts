/**
 * 칩의 면입니다. `none`은 바탕이 그대로 비치고(학습 완료 머리), `white`는 흰 면을 칠합니다(상단 줄).
 * `StatChip.tsx`가 같은 이름으로 다시 내보냅니다(소비처 import 불변).
 */
export type StatChipSurface = "none" | "white";

/**
 * 칩의 높이입니다. `hug`는 내용 높이(아이콘 24 + 세로 여백 6 × 2 + 테두리 — 40),
 * `touch-target`은 상단 줄의 높이(세로 여백 8 × 2 — 44)입니다. 아이콘 · 숫자 크기는 둘이 같습니다.
 */
export type StatChipHeight = "hug" | "touch-target";

/**
 * 순서는 `stat-chip` → 면(`stat-chip-surface-white`) → 높이(`stat-chip-height-touch-target`)이고
 * 공백 하나로 잇습니다. 던지지 않습니다.
 */
export function statChipClassName(_surface: StatChipSurface, _height: StatChipHeight): string {
  return "stat-chip";
}
