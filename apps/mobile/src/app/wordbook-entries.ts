// 단어장 기록을 화면 줄로 풉니다(ADR-0169) — 기록에는 ref만 있고 글 · 뜻 · 예문 · 음성은 UI 언어로 바꾼 카탈로그(ADR-0091)에서
// 읽습니다. 그래서 UI 언어를 바꾸면 뜻도 바뀝니다. 카탈로그에서 사라진 에피소드 · 단어는 줄에서 빠집니다(기록은 남김).

import type { CatalogEntry } from "../lib/episode-catalog";
import type { LearningItem } from "../lib/episode-content.model";
import type { LocalDay } from "../lib/learning-progress.contract";
import { wordbookKeyOf, wordbookRecordsOf, wordStatusOf } from "../lib/wordbook";
import type { Wordbook, WordbookRecord, WordStatus } from "../lib/wordbook";

export type WordbookExample = {
  readonly ko: string;
  readonly roman: string;
  readonly meaning: string;
};

export type WordbookEntry = {
  readonly key: string;
  readonly record: WordbookRecord;
  readonly ko: string;
  readonly roman: string;
  readonly meaning: string;
  /** 에피소드 순서(카탈로그 `order`). */
  readonly episodeOrder: number;
  readonly episodeTitle: string;
  readonly status: WordStatus;
  readonly example: WordbookExample | null;
  /** 단어 카드의 낱말 음성 id. */
  readonly audioId: string | null;
};

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;
type VocabCard = Extract<LearningItem, { type: "VOCAB_CARD" }>;

function cardOf(entry: ReadyEntry, ref: string): VocabCard | null {
  for (const unit of entry.episode.units)
    for (const item of unit.items) if (item.type === "VOCAB_CARD" && item.ref === ref) return item;
  return null;
}

export function wordbookEntriesOf(
  book: Wordbook,
  catalog: readonly CatalogEntry[],
  today: LocalDay,
): readonly WordbookEntry[] {
  const entries: WordbookEntry[] = [];
  for (const record of wordbookRecordsOf(book)) {
    const entry = catalog.find(
      (candidate): candidate is ReadyEntry =>
        candidate.status === "ready" && candidate.id === record.episodeId,
    );
    const word = entry?.episode.words.find((candidate) => candidate.id === record.ref);
    if (entry === undefined || word === undefined) continue;
    const card = cardOf(entry, record.ref);
    const example = card?.example;
    entries.push({
      key: wordbookKeyOf(record.episodeId, record.ref),
      record,
      ko: word.ko,
      roman: word.roman,
      meaning: word.glossEn,
      episodeOrder: entry.order,
      episodeTitle: entry.episode.titleEn ?? entry.title,
      status: wordStatusOf(record, today),
      example:
        example === undefined
          ? null
          : { ko: example.ko, roman: example.roman ?? "", meaning: example.en ?? "" },
      audioId: card?.audioUrl ?? null,
    });
  }
  return entries;
}

/** 오답 보기 재료 — 카탈로그 모든 단어의 뜻(중복 없음, UI 언어). */
export function meaningPoolOf(catalog: readonly CatalogEntry[]): readonly string[] {
  const pool: string[] = [];
  for (const entry of catalog) {
    if (entry.status !== "ready") continue;
    for (const word of entry.episode.words)
      if (word.glossEn !== "" && pool.indexOf(word.glossEn) < 0) pool.push(word.glossEn);
  }
  return pool;
}

/** 복습 보기 셋 — 정답 뜻 + 다른 뜻 둘(재료가 모자라면 있는 만큼), 자리는 `seed`로 정합니다. */
export function reviewChoicesOf(
  answer: string,
  pool: readonly string[],
  seed: number,
): readonly string[] {
  const others = pool.filter((meaning) => meaning !== answer);
  const start = others.length === 0 ? 0 : Math.abs(seed) % others.length;
  const distractors: string[] = [];
  for (let i = 0; i < others.length && distractors.length < 2; i += 1)
    distractors.push(others[(start + i) % others.length] as string);
  const at = Math.abs(seed) % (distractors.length + 1);
  return [...distractors.slice(0, at), answer, ...distractors.slice(at)];
}
