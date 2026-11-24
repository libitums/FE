import { expect, test } from "vitest";

import type { CatalogEntry } from "../lib/episode-catalog";
import { emptyWordbook, withCardsSeen, withStarred } from "../lib/wordbook";
import { myStoryChoicesOf } from "./my-stories-choices";

// `unit` 계층(MS-U11 ~ U12): 올릴 거리(ADR-0179) — 단어장 단어(별 단 것 먼저, 그다음 최근 본 것) · 배운 레슨의 단어 카드(예문 있는 것만).

const episode = (id: string, order: number, title: string, refs: string[]) =>
  ({
    status: "ready",
    id,
    order,
    title,
    version: "1",
    source: "bundled",
    warnings: [],
    episode: {
      title,
      titleEn: title,
      words: refs.map((ref) => ({
        id: ref,
        ko: `${ref}-ko`,
        roman: `${ref}-ro`,
        glossEn: `${ref}-en`,
        role: "target",
      })),
      units: [
        {
          id: "S1",
          items: refs.map((ref, n) => ({
            id: `${id}-${n}`,
            type: "VOCAB_CARD",
            ref,
            context: { ko: `${ref}-ko` },
            ...(n === 0 ? {} : { example: { ko: `${ref} 예문`, en: `${ref} example` } }),
            cardKind: "word",
          })),
        },
      ],
    },
  }) as unknown as CatalogEntry;

const catalog = [
  episode("u01", 1, "Arrival", ["voca:a", "voca:b"]),
  episode("u02", 2, "Cafés", ["voca:c", "voca:d"]),
  episode("u03", 3, "Not yet", ["voca:e", "voca:f"]),
];

test("MS-U11. 단어장 — 별 단 것 먼저, 그다음 처음 본 날 최근 순 · 카탈로그에 없는 단어는 빠짐", () => {
  let book = withCardsSeen(emptyWordbook, "u01", ["voca:a", "voca:b"], "2026-11-01");
  book = withCardsSeen(book, "u02", ["voca:c", "voca:zz"], "2026-11-10");
  book = withStarred(book, "u01", "voca:b", true, "2026-11-12");
  const { words } = myStoryChoicesOf(book, catalog, "2026-11-20");
  expect(words.map((w) => w.key)).toEqual(["u01:voca:b", "u02:voca:c", "u01:voca:a"]);
  expect(words[0]).toEqual({
    key: "u01:voca:b",
    kind: "word",
    word: { episodeId: "u01", ref: "voca:b" },
    ko: "voca:b-ko",
    roman: "voca:b-ro",
    meaning: "voca:b-en",
    example: { ko: "voca:b 예문", meaning: "voca:b example" },
    source: "Arrival",
  });
});

test("MS-U12. 레슨 카드 — 단어장에 기록이 있는 레슨만, 예문 있는 카드만, 에피소드 순서", () => {
  let book = withCardsSeen(emptyWordbook, "u02", ["voca:c"], "2026-11-10");
  book = withCardsSeen(book, "u01", ["voca:a"], "2026-11-01");
  const { cards } = myStoryChoicesOf(book, catalog, "2026-11-20");
  expect(
    cards.map((group) => [group.episodeId, group.title, group.cards.map((c) => c.key)]),
  ).toEqual([
    ["u01", "Arrival", ["card:u01:voca:b"]],
    ["u02", "Cafés", ["card:u02:voca:d"]],
  ]);
  expect(cards[0]?.cards[0]).toMatchObject({ kind: "card", example: { ko: "voca:b 예문" } });
});

test("MS-U13. 서버 한도를 넘는 거리는 빼고, 긴 예문은 떼어 보낸다(리뷰 m5)", () => {
  const long = episode("u09", 9, "Long", ["voca:l", "voca:m"]) as unknown as {
    episode: {
      words: { id: string; ko: string; glossEn: string }[];
      units: { items: { example?: { ko: string; en: string } }[] }[];
    };
  };
  long.episode.words[0]!.ko = "가".repeat(41);
  long.episode.units[0]!.items[1]!.example = { ko: "나".repeat(121), en: "x" };
  const book = withCardsSeen(emptyWordbook, "u09", ["voca:l", "voca:m"], "2026-11-01");
  const { words, cards } = myStoryChoicesOf(book, [long as unknown as CatalogEntry], "2026-11-20");
  expect(words.map((w) => w.key)).toEqual(["u09:voca:m"]);
  expect(words[0]?.example).toBeNull();
  expect(cards).toEqual([]);
});
