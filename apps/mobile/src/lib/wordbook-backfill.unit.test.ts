import { describe, expect, test } from "vitest";

import type { CatalogEntry } from "./episode-catalog";
import {
  BACKFILL_REVIEWS_PER_DAY,
  completedLessonWordsOf,
  withCompletedLessonWords,
} from "./wordbook-backfill";
import { emptyWordbook, withAnswer, withCardsSeen, withStarred, wordStatusOf } from "./wordbook";

// `unit` 계층: 끝낸 레슨의 단어 채움(ADR-0169 개정 2026-11-25). 사용자 보고 — 단어장이 나오기 전에 끝낸 레슨 · 재설치 뒤 끝낸
// 레슨의 단어가 단어장(My words · 스토리 단어 시트)에 없었습니다. 단어장은 레슨 중 카드를 볼 때만 쌓였기 때문입니다.

const card = (id: string, ref: string) => ({ id, type: "VOCAB_CARD", ref });

function entry(id: string, order: number, units: readonly unknown[]): CatalogEntry {
  return {
    status: "ready",
    id,
    order,
    title: id,
    version: "1",
    source: "bundled",
    warnings: [],
    episode: { title: id, words: [], units },
  } as unknown as CatalogEntry;
}

const water = entry("u01-water", 1, [
  {
    id: "S1",
    items: [
      card("s1-01", "voca:a1"),
      card("s1-02", "voca:b2"),
      { id: "s1-03", type: "LISTEN_CHOICE", ref: "voca:a1" },
      card("s1-04", "expr:hi"),
    ],
  },
  { id: "S2", items: [card("s2-01", "voca:c3"), card("s2-02", "voca:a1")] },
  { id: "S3", items: [card("s3-01", "voca:d4")] },
]);
const cafe = entry("u02-cafe", 2, [{ id: "S1", items: [card("s1-01", "voca:a1")] }]);
const loading = { status: "loading", id: "u03-bus", order: 3 } as unknown as CatalogEntry;

const today = "2026-11-25";

describe("채울 단어", () => {
  test("WB1. 끝낸 유닛의 단어 카드 voca ref만 — 카탈로그 · 유닛 · 문항 순서, 같은 에피소드 안 중복 없음", () => {
    const words = completedLessonWordsOf([water, cafe, loading], {
      "u01-water": ["intro", "S1", "S2"],
      "u02-cafe": ["S1"],
      "u03-bus": ["S1"],
    });
    expect(words).toEqual([
      { episodeId: "u01-water", ref: "voca:a1" },
      { episodeId: "u01-water", ref: "voca:b2" },
      { episodeId: "u01-water", ref: "voca:c3" },
      { episodeId: "u02-cafe", ref: "voca:a1" },
    ]);
  });

  test("WB2. 끝낸 유닛이 없으면 · 카탈로그가 준비 전이면 빈 목록", () => {
    expect(completedLessonWordsOf([water], {})).toEqual([]);
    expect(completedLessonWordsOf([loading], { "u03-bus": ["S1"] })).toEqual([]);
  });
});

describe("채움", () => {
  test("WB3. 빈 단어장 + 끝낸 레슨 → 새 단어로 채운다(처음 본 날 = 오늘, 상자 0, 답 없음)", () => {
    const book = withCompletedLessonWords(emptyWordbook, [water], { "u01-water": ["S1"] }, today);
    expect(Object.keys(book.words)).toEqual(["u01-water|voca:a1", "u01-water|voca:b2"]);
    expect(book.words["u01-water|voca:a1"]).toEqual({
      episodeId: "u01-water",
      ref: "voca:a1",
      firstSeen: today,
      correct: 0,
      incorrect: 0,
      box: 0,
      due: "2026-11-26",
      last: null,
    });
  });

  test("WB4. 이미 있는 줄 · 별 · 복습 기록은 그대로, 없는 ref만 더한다", () => {
    let before = withCardsSeen(emptyWordbook, "u01-water", ["voca:a1"], "2026-10-01");
    before = withAnswer(before, "u01-water", "voca:a1", "correct", "2026-10-02");
    before = withStarred(before, "u01-water", "voca:a1", true, "2026-10-02");
    const book = withCompletedLessonWords(before, [water], { "u01-water": ["S1"] }, today);
    expect(book.words["u01-water|voca:a1"]).toBe(before.words["u01-water|voca:a1"]);
    expect(book.words["u01-water|voca:b2"]?.firstSeen).toBe(today);
  });

  test("WB5. 더할 것이 없으면 같은 객체(저장하지 않음) — 두 번 불러도 같다(멱등)", () => {
    const once = withCompletedLessonWords(emptyWordbook, [water], { "u01-water": ["S1"] }, today);
    expect(withCompletedLessonWords(once, [water], { "u01-water": ["S1"] }, "2026-12-01")).toBe(
      once,
    );
    expect(withCompletedLessonWords(emptyWordbook, [water], {}, today)).toBe(emptyWordbook);
  });
});

describe("복습 나눠 잡기(사용자 결정 2026-11-25)", () => {
  const many = (count: number) =>
    entry("u09-many", 9, [
      {
        id: "S1",
        items: Array.from({ length: count }, (_, i) => card(`s1-${i}`, `voca:w${i}`)),
      },
    ]);

  test("WB6. 채운 단어의 다음 복습은 내일부터 하루 최대 15개씩 — 레슨 순서대로 앞 단어가 먼저, 상태는 New", () => {
    expect(BACKFILL_REVIEWS_PER_DAY).toBe(15);
    const book = withCompletedLessonWords(emptyWordbook, [many(32)], { "u09-many": ["S1"] }, today);
    const due = (i: number) => book.words[`u09-many|voca:w${i}`]?.due;
    expect([due(0), due(14)]).toEqual(["2026-11-26", "2026-11-26"]);
    expect([due(15), due(29)]).toEqual(["2026-11-27", "2026-11-27"]);
    expect([due(30), due(31)]).toEqual(["2026-11-28", "2026-11-28"]);
    for (const record of Object.values(book.words)) {
      expect(record.firstSeen).toBe(today);
      expect(wordStatusOf(record, today)).toBe("new");
    }
  });

  test("WB7. 이미 있던 줄은 세지 않고 날짜도 그대로 — 새로 더하는 줄만 나눈다, 다시 돌아도 날짜가 바뀌지 않음", () => {
    const before = withCardsSeen(emptyWordbook, "u09-many", ["voca:w0"], "2026-11-01");
    const once = withCompletedLessonWords(before, [many(17)], { "u09-many": ["S1"] }, today);
    expect(once.words["u09-many|voca:w0"]).toBe(before.words["u09-many|voca:w0"]);
    expect(once.words["u09-many|voca:w1"]?.due).toBe("2026-11-26");
    expect(once.words["u09-many|voca:w15"]?.due).toBe("2026-11-26");
    expect(once.words["u09-many|voca:w16"]?.due).toBe("2026-11-27");
    const more = many(40);
    const again = withCompletedLessonWords(once, [more], { "u09-many": ["S1"] }, "2026-11-30");
    for (let i = 0; i < 17; i += 1)
      expect(again.words[`u09-many|voca:w${i}`]).toBe(once.words[`u09-many|voca:w${i}`]);
    expect(again.words["u09-many|voca:w17"]?.due).toBe("2026-12-01");
  });
});
