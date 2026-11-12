// 교정 범위 → 강조 조각입니다(messenger-chat-1-5 spec §4.3). 범위는 코드 포인트 [start, end).

import type { ChatCorrectionChange } from "./chat-source.contract";

export type CorrectionSegment = { readonly text: string; readonly kind: "same" | "changed" };

export function correctionSegmentsOf(
  corrected: string,
  changes: readonly ChatCorrectionChange[],
): readonly CorrectionSegment[] {
  const points = [...corrected];
  const length = points.length;
  const ranges = changes
    .filter((c) => Number.isFinite(c.start) && Number.isFinite(c.end))
    .map((c) => ({ start: Math.max(0, c.start), end: Math.min(length, c.end) }))
    .filter((c) => c.start < c.end)
    .sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last !== undefined && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  const segments: CorrectionSegment[] = [];
  const push = (from: number, to: number, kind: CorrectionSegment["kind"]): void => {
    if (to > from) segments.push({ text: points.slice(from, to).join(""), kind });
  };
  let cursor = 0;
  for (const range of merged) {
    push(cursor, range.start, "same");
    push(range.start, range.end, "changed");
    cursor = range.end;
  }
  push(cursor, length, "same");
  return segments;
}
