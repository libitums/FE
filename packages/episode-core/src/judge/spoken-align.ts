// 정답 마디 하나를 들은 말 안의 가장 비슷한 구간에 맞춥니다(순수). 편집 거리와 함께 구간이 어디서 시작했는지,
// 낱말 첫 음절(어간 자리)의 자모가 다른 자모로 **바뀌었는지**를 냅니다(ADR-0201 개정 ⟨앞 낱말 · 어간⟩).

import type { SpokenTrack } from "./hangul-pronunciation";

export type SpokenAlignment = {
  /** 최소 편집 거리. */
  readonly distance: number;
  /** 맞춘 구간이 시작하는 들은 말의 단위 번호(낱말 경계). */
  readonly start: number;
  /** 첫 음절 자모가 다른 자모로 바뀐 수(빠지거나 끼어든 것은 세지 않습니다). */
  readonly stemSlips: number;
};

const isConsonant = (unit: string | undefined) =>
  unit !== undefined && unit >= "ㄱ" && unit <= "ㅎ";

/** 낱말마다 첫 음절의 초성(있으면) · 중성 자리입니다. */
export function stemPositions(track: SpokenTrack): ReadonlySet<number> {
  const positions = new Set<number>();
  for (const start of track.wordStarts) {
    positions.add(start);
    if (isConsonant(track.units[start]) && start + 1 < track.units.length) positions.add(start + 1);
  }
  return positions;
}

/**
 * `pattern`과 `text` 안 어느 연속 구간 사이의 최소 편집 거리입니다. 구간은 `text`의 낱말 경계에서만 시작하고 끝납니다 —
 * 낱말을 반만 떼어 맞추지 못합니다(「현금으로」의 「금으로」 ≠ 「카드로」). 거리가 같은 길이 여럿이면 일치 · 빠짐 · 끼어듦을
 * 바뀜보다 먼저 고릅니다.
 */
export function alignWindow(
  pattern: readonly string[],
  stems: ReadonlySet<number>,
  text: SpokenTrack,
): SpokenAlignment {
  const { units } = text;
  const boundary = new Set([...text.wordStarts, units.length]);
  const open = (column: number) => boundary.has(column) || units.length === 0;
  // 첫 줄: 구간은 낱말 경계에서 시작하고, 경계 뒤 마디 첫 자모 앞에 끼어든 자모(연음으로 넘어온 받침)는 하나씩 셉니다.
  const first: number[] = [];
  for (let column = 0; column <= units.length; column += 1) {
    first.push(open(column) ? 0 : (first[column - 1] ?? 0) + 1);
  }
  const table: number[][] = [first];
  for (let row = 1; row <= pattern.length; row += 1) {
    const above = table[row - 1] ?? [];
    const current = [row];
    for (let column = 1; column <= units.length; column += 1) {
      const same = pattern[row - 1] === units[column - 1];
      current.push(
        Math.min(
          (above[column] ?? 0) + 1,
          (current[column - 1] ?? 0) + 1,
          (above[column - 1] ?? 0) + (same ? 0 : 1),
        ),
      );
    }
    table.push(current);
  }
  const last = table[pattern.length] ?? [];
  let end = -1;
  last.forEach((value, column) => {
    if (open(column) && (end < 0 || value < (last[end] ?? 0))) end = column;
  });
  if (end < 0) return { distance: pattern.length, start: units.length, stemSlips: 0 };
  const distance = last[end] ?? pattern.length;
  let row = pattern.length;
  let column = end;
  let stemSlips = 0;
  while (row > 0) {
    const here = table[row]?.[column] ?? 0;
    const diagonal = column > 0 ? (table[row - 1]?.[column - 1] ?? 0) : Number.POSITIVE_INFINITY;
    if (column > 0 && pattern[row - 1] === units[column - 1] && here === diagonal) {
      row -= 1;
      column -= 1;
    } else if (here === (table[row - 1]?.[column] ?? 0) + 1) {
      row -= 1;
    } else if (column > 0 && here === (table[row]?.[column - 1] ?? 0) + 1) {
      column -= 1;
    } else {
      if (stems.has(row - 1)) stemSlips += 1;
      row -= 1;
      column -= 1;
    }
  }
  while (column > 0 && !open(column)) column -= 1;
  return { distance, start: column, stemSlips };
}
