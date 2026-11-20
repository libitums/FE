import { describe, expect, test } from "vitest";

import type { CatalogEntry } from "../lib/episode-catalog";
import { emptyWordbook, withAnswer, withCardsSeen } from "../lib/wordbook";
import { meaningPoolOf, reviewChoicesOf, wordbookEntriesOf } from "./wordbook-entries";

// `unit` 계층: 단어장 기록 → 화면 줄(UI 언어 카탈로그에서 글 · 뜻 · 예문 · 음성) · 복습 보기(ADR-0169).

const water = {
  status: "ready",
  id: "u01-water",
  order: 1,
  title: "물",
  version: "1",
  source: "bundled",
  warnings: [],
  episode: {
    title: "물",
    titleEn: "At the guesthouse",
    words: [
      { id: "voca:a1", ko: "물", roman: "mul", glossEn: "water", role: "target" },
      { id: "voca:b2", ko: "주세요", roman: "juseyo", glossEn: "please give", role: "target" },
      { id: "voca:c3", ko: "방", roman: "bang", glossEn: "room", role: "target" },
    ],
    units: [
      {
        id: "S1",
        items: [
          {
            id: "s1-01",
            type: "VOCAB_CARD",
            ref: "voca:b2",
            context: { ko: "주세요", roman: "juseyo" },
            example: { ko: "물 주세요.", roman: "mul juseyo.", en: "Water, please." },
            cardKind: "word",
            audioUrl: "u01-water/s1-01-word-r2",
          },
        ],
      },
    ],
  },
} as unknown as CatalogEntry;

const day = "2026-11-20";

describe("줄", () => {
  test("WE1. 처음 본 순서대로 · 글 · 로마자 · 뜻 · 에피소드 · 상태 · 예문 · 음성", () => {
    let book = withCardsSeen(emptyWordbook, "u01-water", ["voca:a1", "voca:b2"], day);
    book = withAnswer(book, "u01-water", "voca:b2", "correct", day);
    const entries = wordbookEntriesOf(book, [water], day);
    expect(entries.map((e) => [e.ko, e.roman, e.meaning, e.episodeOrder, e.status])).toEqual([
      ["물", "mul", "water", 1, "new"],
      ["주세요", "juseyo", "please give", 1, "known"],
    ]);
    expect(entries[1]?.example).toEqual({
      ko: "물 주세요.",
      roman: "mul juseyo.",
      meaning: "Water, please.",
    });
    expect(entries[1]?.audioId).toBe("u01-water/s1-01-word-r2");
    expect(entries[0]?.example).toBeNull();
    expect(entries[0]?.episodeTitle).toBe("At the guesthouse");
  });

  test("WE2. 카탈로그에 없는 에피소드 · 단어는 줄에서 빠진다", () => {
    const book = withCardsSeen(emptyWordbook, "gone", ["voca:a1"], day);
    expect(wordbookEntriesOf(book, [water], day)).toEqual([]);
  });
});

describe("복습 보기", () => {
  test("WE3. 뜻 재료는 카탈로그 단어 뜻(중복 없음)", () => {
    expect(meaningPoolOf([water])).toEqual(["water", "please give", "room"]);
  });

  test("WE4. 보기 셋 — 정답 하나 + 다른 뜻 둘, 자리는 seed로 바뀐다", () => {
    const pool = ["water", "please give", "room", "hello"];
    const choices = reviewChoicesOf("please give", pool, 0);
    expect(choices).toHaveLength(3);
    expect(choices.filter((c) => c === "please give")).toHaveLength(1);
    expect(new Set(choices).size).toBe(3);
    const positions = [0, 1, 2, 3, 4, 5].map((seed) =>
      reviewChoicesOf("please give", pool, seed).indexOf("please give"),
    );
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  test("WE5. 재료가 모자라면 있는 만큼", () => {
    expect(reviewChoicesOf("water", ["water", "room"], 0).slice().sort()).toEqual([
      "room",
      "water",
    ]);
  });
});
