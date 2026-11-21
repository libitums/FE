import { expect, test } from "vitest";

import type { RankingRow } from "../../lib/ranking.contract";
import { nearMeItems, type RankingListItem } from "./ranking-rules";

// `unit` 계층(ADR-0170 D11 RK-U15 ~ U19): 그룹 전체 대신 상위 3 · 생략 · 내 위 2 · 나 · 내 아래 1.

const group = (size: number, myRank: number | null): RankingRow[] =>
  Array.from({ length: size }, (_, index) => ({
    rank: index + 1,
    name: `P${index + 1}`,
    countryCode: null,
    episode: null,
    score: 100 - index,
    me: index + 1 === myRank,
  }));

/** 줄은 순위 숫자, 생략은 「…N」으로 적습니다. */
const shape = (items: readonly RankingListItem[]): readonly (number | string)[] =>
  items.map((item) => (item.kind === "row" ? item.row.rank : `…${item.hidden}`));

test("RK-U15. 중간이면 상위 3 · 생략 · 내 위 2 · 나 · 내 아래 1", () => {
  expect(shape(nearMeItems(group(25, 12)))).toEqual([1, 2, 3, "…6", 10, 11, 12, 13]);
});

test("RK-U16. 꼴찌면 내 아래 없이 끝난다", () => {
  expect(shape(nearMeItems(group(25, 25)))).toEqual([1, 2, 3, "…19", 23, 24, 25]);
});

test("RK-U17. 상위권이면 생략 없이 이어진다 — 1위도 4위까지 보여 쫓아오는 사람이 보인다", () => {
  expect(shape(nearMeItems(group(25, 1)))).toEqual([1, 2, 3, 4]);
  expect(shape(nearMeItems(group(25, 3)))).toEqual([1, 2, 3, 4]);
  expect(shape(nearMeItems(group(25, 5)))).toEqual([1, 2, 3, 4, 5, 6]);
});

test("RK-U18. 한 줄만 건너뛸 자리면 생략 대신 그 줄을 그린다", () => {
  // 내 위 2의 첫 줄이 5위 — 사이가 4위 하나뿐.
  expect(shape(nearMeItems(group(25, 7)))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  // 사이가 둘(4 · 5위)부터 생략.
  expect(shape(nearMeItems(group(25, 8)))).toEqual([1, 2, 3, "…2", 6, 7, 8, 9]);
});

test("RK-U19. 작은 그룹 · 내 줄이 없는 응답은 그대로 전부", () => {
  expect(shape(nearMeItems(group(3, 2)))).toEqual([1, 2, 3]);
  expect(shape(nearMeItems(group(0, null)))).toEqual([]);
  expect(shape(nearMeItems(group(12, null)))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});
