// 내 스토리에 올릴 거리(ADR-0194) — 단어장 기록(ADR-0169)과 UI 언어 카탈로그(ADR-0091)에서 만듭니다. 순수.
// 단어장 단어만(별 단 것 먼저, 그다음 처음 본 날 최근 순) — 레슨 카드는 올리지 않습니다(사용자 결정 2026-11-25). 카탈로그에서 사라진
// 에피소드 · 단어는 빠집니다.

import type { CatalogEntry } from "../lib/episode-catalog";
import type { LocalDay } from "../lib/learning-progress.contract";
import type { Wordbook } from "../lib/wordbook";
import type { MyStoryChoice, MyStoryChoices } from "../screens/messenger-chat/my-stories.contract";
import { wordbookEntriesOf } from "./wordbook-entries";

/** 서버 `companion_post_my_story`의 길이 한도(리뷰 m5) — 넘는 거리는 목록에서 빼고, 넘는 예문은 뗍니다. */
const LIMIT = { ko: 40, roman: 80, meaning: 120, exampleKo: 120, exampleMeaning: 200 } as const;
const fits = (choice: MyStoryChoice): boolean =>
  choice.ko.length <= LIMIT.ko &&
  choice.roman.length <= LIMIT.roman &&
  choice.meaning.length <= LIMIT.meaning;
const exampleWithin = (example: MyStoryChoice["example"]): MyStoryChoice["example"] =>
  example === null ||
  example.ko.length > LIMIT.exampleKo ||
  example.meaning.length > LIMIT.exampleMeaning
    ? null
    : example;

export function myStoryChoicesOf(
  book: Wordbook,
  catalog: readonly CatalogEntry[],
  today: LocalDay,
): MyStoryChoices {
  const entries = wordbookEntriesOf(book, catalog, today);
  const ordered = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const starred =
        Number(b.entry.record.starred === true) - Number(a.entry.record.starred === true);
      if (starred !== 0) return starred;
      if (a.entry.record.firstSeen !== b.entry.record.firstSeen)
        return a.entry.record.firstSeen < b.entry.record.firstSeen ? 1 : -1;
      return a.index - b.index;
    });
  const words: MyStoryChoice[] = ordered
    .map(({ entry }): MyStoryChoice => ({
      key: `${entry.record.episodeId}:${entry.record.ref}`,
      kind: "word",
      word: { episodeId: entry.record.episodeId, ref: entry.record.ref },
      ko: entry.ko,
      roman: entry.roman,
      meaning: entry.meaning,
      example: exampleWithin(
        entry.example === null ? null : { ko: entry.example.ko, meaning: entry.example.meaning },
      ),
      source: entry.episodeTitle,
    }))
    .filter(fits);
  return { words };
}
