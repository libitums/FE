// 통화 시계의 표기입니다. 서사 통화와 통화 최종 테스트가 함께 씁니다.

/** 통화 시계입니다 — `0:00`, `1:05`. */
export function callClockLabel(elapsedSeconds: number): string {
  const seconds = Math.max(0, Math.floor(elapsedSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
