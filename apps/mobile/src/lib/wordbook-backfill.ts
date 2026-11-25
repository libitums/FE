// 끝낸 레슨의 단어 채움(ADR-0169 개정 2026-11-25) — 단어장은 레슨 중 단어 카드를 볼 때만 쌓여서, 단어장이 나오기 전에 끝낸 레슨과
// 재설치 · 다른 기기 뒤의 끝낸 레슨 단어가 비어 있었습니다. 진행(회원이면 서버 동기화)의 끝낸 유닛에 있는 단어 카드 ref를 없는 것만
// 새 단어로 더합니다 — 이미 있는 줄 · 별 · 복습 기록은 건드리지 않습니다(멱등). 순수 함수만 둡니다.

import { isCatalogUnitDone } from "./catalog-progress";
import type { CatalogProgress } from "./catalog-progress";
import type { CatalogEntry } from "./episode-catalog";
import type { LocalDay } from "./learning-progress.contract";
import { addDays, emptyWordbook, isWordbookRef, withCardsSeen, wordbookKeyOf } from "./wordbook";
import type { Wordbook, WordbookRecord } from "./wordbook";

/**
 * 채운 단어의 하루 복습 수(사용자 결정 2026-11-25) — 한꺼번에 내일 복습에 올라오지 않게, 새로 더하는 줄만 내일부터 하루 이만큼씩
 * 레슨 순서대로 나눕니다. 그날 이미 예정된 기존 단어는 세지 않습니다.
 */
export const BACKFILL_REVIEWS_PER_DAY = 15;

export type CompletedLessonWord = { readonly episodeId: string; readonly ref: string };

/** 끝낸 유닛의 단어 카드 ref — 카탈로그 순서 · 유닛 순서 · 문항 순서, 중복 없음. */
export function completedLessonWordsOf(
  catalog: readonly CatalogEntry[],
  progress: CatalogProgress,
): readonly CompletedLessonWord[] {
  const words: CompletedLessonWord[] = [];
  for (const entry of catalog) {
    if (entry.status !== "ready") continue;
    const refs: string[] = [];
    for (const unit of entry.episode.units) {
      if (!isCatalogUnitDone(progress, entry.id, unit.id)) continue;
      // 레슨이 `withCardsSeen`에 넘기는 것과 같은 규칙 — 단어 카드의 `voca:` ref(render-catalog-activity · learning-trail).
      for (const item of unit.items)
        if (item.type === "VOCAB_CARD" && item.ref !== undefined && isWordbookRef(item.ref))
          if (refs.indexOf(item.ref) < 0) refs.push(item.ref);
    }
    for (const ref of refs) words.push({ episodeId: entry.id, ref });
  }
  return words;
}

/**
 * 끝낸 레슨의 단어 중 단어장에 없는 것만 새 단어(처음 본 날 = `today`, 답 없음 = New)로 더합니다. 다음 복습은 내일부터
 * `BACKFILL_REVIEWS_PER_DAY`개씩 나눠 잡습니다. 더할 것이 없으면 같은 객체.
 */
export function withCompletedLessonWords(
  book: Wordbook,
  catalog: readonly CatalogEntry[],
  progress: CatalogProgress,
  today: LocalDay,
): Wordbook {
  // 한 번만 복사합니다 — 전 레슨을 끝낸 사람(단어 수백 개)도 단어마다 단어장 전체를 다시 펼치지 않게.
  let words: Record<string, WordbookRecord> | null = null;
  let added = 0;
  for (const word of completedLessonWordsOf(catalog, progress)) {
    const key = wordbookKeyOf(word.episodeId, word.ref);
    if (book.words[key] !== undefined) continue;
    const record = withCardsSeen(emptyWordbook, word.episodeId, [word.ref], today).words[key];
    if (record === undefined) continue;
    if (words === null) words = { ...book.words };
    const day = 1 + Math.floor(added / BACKFILL_REVIEWS_PER_DAY);
    words[key] = { ...record, due: addDays(today, day) };
    added += 1;
  }
  return words === null ? book : { words };
}
