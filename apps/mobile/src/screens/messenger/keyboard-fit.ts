// 자유 대화 방이 정한 면 높이(`height`)를 네 줄에 나누는 계산입니다(messenger-chat-ui spec §6.3).
// 줄 수 · 칸 배치는 그대로고, 키 높이가 차이를 흡수합니다. 남는 높이는 판 위쪽 여백이 됩니다.

/** 판 위 · 아래 안쪽 여백의 합입니다(messenger-keyboard.css의 padding 8 + 8). */
const PLATE_PADDING = 16;
/** 칸 안쪽 여백의 위 · 아래 합입니다(칸 = 키 + 3 + 3). */
const CELL_PADDING = 6;
const ROWS = 4;
/** 키 높이의 하한 · 상한입니다(디자인 K-KEY-MIN 40 · K-KEY-MAX 56). */
const KEY_MIN = 40;
const KEY_MAX = 56;

/** 안전 영역 아래를 뺀 몫을 네 줄로 나눠 키 높이를 정합니다. 유한하지 않은 입력은 하한입니다. */
export function fittedKeyHeight(height: number, bottomEdge: number): number {
  const edge = Number.isFinite(bottomEdge) && bottomEdge > 0 ? bottomEdge : 0;
  const rows = height - PLATE_PADDING - edge;
  if (!Number.isFinite(rows)) return KEY_MIN;
  const key = Math.floor(rows / ROWS) - CELL_PADDING;
  return Math.min(KEY_MAX, Math.max(KEY_MIN, key));
}
