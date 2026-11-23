// My words 걸러보기(ADR-0169 · 즐겨찾기 개정) — 칩 순서와 칩마다 보일 줄. 순수 함수입니다.

import type { WordbookEntry } from "../../app/wordbook-entries";
import type { WordbookFilter } from "./wordbook.contract";

/** Starred가 둘째 — 칩 줄이 넘치는 긴 언어(my · th)에서도 스크롤 없이 보입니다. */
export const wordbookFilters: readonly WordbookFilter[] = [
  "all",
  "starred",
  "new",
  "review",
  "known",
];

/**
 * `kept`는 Starred에서 방금 별을 뗀 줄의 열쇠입니다 — 칩을 바꿀 때까지 꺼진 별로 남겨, 그 별에 있던 낭독 초점이 사라지지 않게 합니다
 * (접근성 점검 M1).
 */
export function entriesForFilter(
  entries: readonly WordbookEntry[],
  filter: WordbookFilter,
  kept: readonly string[] = [],
): readonly WordbookEntry[] {
  if (filter === "all") return entries;
  if (filter === "starred")
    return entries.filter((entry) => entry.record.starred === true || kept.indexOf(entry.key) >= 0);
  return entries.filter((entry) => entry.status === filter);
}
