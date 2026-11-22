import { expect, test } from "vitest";

import { entriesForFilter, wordbookFilters } from "./wordbook-filter";
import { sampleEntries, wordbookEntry } from "./wordbook.test-support";

// `unit` 계층: My words 걸러보기(ADR-0169 즐겨찾기 개정) — 칩 순서와 칩마다 보일 줄.

const starred = wordbookEntry("물", "mul", "water", "new", {
  record: { ...sampleEntries[1]!.record, starred: true },
});
const entries = [sampleEntries[0]!, starred, sampleEntries[2]!, sampleEntries[3]!];

test("WF1. 칩은 All · Starred · New · Review · Got it 순서(Starred가 둘째 — 긴 언어에서도 스크롤 없이 보임)", () => {
  expect(wordbookFilters).toEqual(["all", "starred", "new", "review", "known"]);
});

test("WF2. All은 전부, Starred는 별 단 줄만, 상태 칩은 그 상태만(순서 유지)", () => {
  expect(entriesForFilter(entries, "all")).toEqual(entries);
  expect(entriesForFilter(entries, "starred")).toEqual([starred]);
  expect(entriesForFilter(entries, "new").map((entry) => entry.ko)).toEqual(["감사합니다", "물"]);
  expect(entriesForFilter(entries, "review").map((entry) => entry.ko)).toEqual(["주세요"]);
  expect(entriesForFilter(entries, "known").map((entry) => entry.ko)).toEqual(["안녕하세요"]);
  expect(entriesForFilter(sampleEntries, "starred")).toEqual([]);
});

test("WF3. Starred에서 방금 별을 뗀 줄(kept)은 칩을 바꿀 때까지 남는다 — 낭독 초점이 사라지지 않게(접근성 점검 M1)", () => {
  const kept = [sampleEntries[0]!.key];
  expect(entriesForFilter(entries, "starred", kept)).toEqual([sampleEntries[0], starred]);
  expect(entriesForFilter(entries, "new", kept)).toEqual(entriesForFilter(entries, "new"));
});
