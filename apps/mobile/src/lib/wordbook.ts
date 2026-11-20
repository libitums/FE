// 기기 단어장(ADR-0169) — 단어 카드(VOCAB_CARD)로 만난 콘텐츠 `voca:` ref의 기록입니다. 처음 본 날 · 맞힘 · 틀림을 적고, 간단한
// 간격 반복(상자 0~4, 간격 1 · 3 · 7 · 14 · 30일)으로 다음 복습 날을 정합니다. 기록에는 ref만 두고 글 · 뜻은 카탈로그에서 읽습니다.
// 저장은 계정마다 `libitum.wordbook.<userId>`, 비회원은 `libitum.wordbook.guest` — 로그인 때 그 계정 칸으로 합칩니다(ADR-0111 방식).
// 서버로 보내지 않습니다(기존 서버 저장소가 이 기록을 덮지 않음, ADR-0169 D5).

import type { LocalDay } from "./learning-progress.contract";
import { getItem, isStorageAvailable, removeItem, setItem } from "./storage";

export type WordAnswer = "correct" | "incorrect";
export type WordStatus = "new" | "review" | "known";

export type WordbookRecord = {
  readonly episodeId: string;
  readonly ref: string;
  readonly firstSeen: LocalDay;
  readonly correct: number;
  readonly incorrect: number;
  /** 간격 반복 상자 — 0부터. */
  readonly box: number;
  /** 다음 복습 날. */
  readonly due: LocalDay;
  readonly last: WordAnswer | null;
};

export type Wordbook = { readonly words: Readonly<Record<string, WordbookRecord>> };

export const emptyWordbook: Wordbook = { words: {} };

/** 상자 번호 → 다음 복습까지 날 수. 새 단어 · 틀린 단어는 상자 0(내일). */
export const REVIEW_INTERVAL_DAYS: readonly number[] = [1, 3, 7, 14, 30];

const VOCA = "voca:";
const dayPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function wordbookKeyOf(episodeId: string, ref: string): string {
  return `${episodeId}|${ref}`;
}

const pad = (value: number) => (value < 10 ? `0${value}` : String(value));

/** 기기 시각의 날짜(`YYYY-MM-DD`). */
export function localDayOf(date: Date): LocalDay {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 날짜에 날 수를 더합니다. 형식이 틀리면 그대로. */
export function addDays(day: LocalDay, days: number): LocalDay {
  const matched = dayPattern.exec(day);
  if (matched === null) return day;
  // 정오로 만듭니다 — 자정에 일광 절약 시간이 바뀌는 시간대에서도 날짜가 밀리지 않게(리뷰).
  const date = new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]) + days, 12);
  return localDayOf(date);
}

const intervalOf = (box: number) =>
  REVIEW_INTERVAL_DAYS[Math.min(box, REVIEW_INTERVAL_DAYS.length - 1)] ?? 1;

export function withCardsSeen(
  book: Wordbook,
  episodeId: string,
  refs: readonly string[],
  today: LocalDay,
): Wordbook {
  let words = book.words;
  for (const ref of refs) {
    if (ref.indexOf(VOCA) !== 0 || ref.length === VOCA.length) continue;
    const key = wordbookKeyOf(episodeId, ref);
    if (words[key] !== undefined) continue;
    words = {
      ...words,
      [key]: {
        episodeId,
        ref,
        firstSeen: today,
        correct: 0,
        incorrect: 0,
        box: 0,
        due: addDays(today, intervalOf(0)),
        last: null,
      },
    };
  }
  return words === book.words ? book : { words };
}

export function withAnswer(
  book: Wordbook,
  episodeId: string,
  ref: string,
  answer: WordAnswer,
  today: LocalDay,
): Wordbook {
  const key = wordbookKeyOf(episodeId, ref);
  const record = book.words[key];
  if (record === undefined) return book;
  const box = answer === "correct" ? Math.min(record.box + 1, REVIEW_INTERVAL_DAYS.length - 1) : 0;
  const next: WordbookRecord = {
    ...record,
    correct: record.correct + (answer === "correct" ? 1 : 0),
    incorrect: record.incorrect + (answer === "incorrect" ? 1 : 0),
    box,
    due: addDays(today, intervalOf(box)),
    last: answer,
  };
  return { words: { ...book.words, [key]: next } };
}

export function wordStatusOf(record: WordbookRecord, today: LocalDay): WordStatus {
  if (record.due <= today || record.last === "incorrect") return "review";
  return record.correct + record.incorrect === 0 ? "new" : "known";
}

const byFirstSeen = (a: WordbookRecord, b: WordbookRecord) =>
  a.firstSeen < b.firstSeen ? -1 : a.firstSeen > b.firstSeen ? 1 : 0;

/** 단어장의 줄 — 처음 본 순서(같은 날이면 적은 순서). */
export function wordbookRecordsOf(book: Wordbook): readonly WordbookRecord[] {
  return Object.keys(book.words)
    .map((key) => book.words[key] as WordbookRecord)
    .sort(byFirstSeen);
}

export function reviewQueueOf(book: Wordbook, today: LocalDay): readonly WordbookRecord[] {
  return wordbookRecordsOf(book).filter((record) => record.due <= today);
}

export function wordbookCountsOf(
  book: Wordbook,
  today: LocalDay,
): { readonly words: number; readonly due: number } {
  return { words: Object.keys(book.words).length, due: reviewQueueOf(book, today).length };
}

/** 비회원 기록을 계정 기록에 합칩니다 — 같은 단어는 수를 더하고, 처음 본 날은 이른 쪽, 상자 · 복습 날은 계정 쪽. */
export function mergeWordbooks(user: Wordbook, guest: Wordbook): Wordbook {
  const words: Record<string, WordbookRecord> = { ...user.words };
  for (const key of Object.keys(guest.words)) {
    const theirs = guest.words[key] as WordbookRecord;
    const mine = words[key];
    words[key] =
      mine === undefined
        ? theirs
        : {
            ...mine,
            firstSeen: theirs.firstSeen < mine.firstSeen ? theirs.firstSeen : mine.firstSeen,
            correct: mine.correct + theirs.correct,
            incorrect: mine.incorrect + theirs.incorrect,
          };
  }
  return { words };
}

const isDay = (value: unknown): value is string =>
  typeof value === "string" && dayPattern.test(value);
const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

function recordFrom(raw: unknown): WordbookRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r["episodeId"] !== "string" || typeof r["ref"] !== "string") return null;
  if (!isDay(r["firstSeen"]) || !isDay(r["due"])) return null;
  if (!isCount(r["correct"]) || !isCount(r["incorrect"]) || !isCount(r["box"])) return null;
  const last = r["last"];
  if (last !== null && last !== "correct" && last !== "incorrect") return null;
  return {
    episodeId: r["episodeId"],
    ref: r["ref"],
    firstSeen: r["firstSeen"],
    correct: r["correct"],
    incorrect: r["incorrect"],
    box: r["box"],
    due: r["due"],
    last,
  };
}

/** 저장 값 디코드 — 모양이 틀린 줄만 버리고, 통째로 깨졌으면 빈 단어장. */
export function wordbookFrom(raw: unknown): Wordbook {
  if (typeof raw !== "object" || raw === null) return emptyWordbook;
  const words = (raw as Record<string, unknown>)["words"];
  if (typeof words !== "object" || words === null) return emptyWordbook;
  const out: Record<string, WordbookRecord> = {};
  for (const key of Object.keys(words)) {
    const record = recordFrom((words as Record<string, unknown>)[key]);
    if (record !== null && key === wordbookKeyOf(record.episodeId, record.ref)) out[key] = record;
  }
  return { words: out };
}

export function wordbookStorageKey(accountId: string): string {
  return `libitum.wordbook.${accountId}`;
}

export function loadWordbook(accountId: string): Wordbook {
  try {
    if (!isStorageAvailable()) return emptyWordbook;
    return wordbookFrom(JSON.parse(getItem(wordbookStorageKey(accountId)) ?? "null"));
  } catch {
    return emptyWordbook;
  }
}

export function saveWordbook(accountId: string, book: Wordbook): void {
  try {
    if (isStorageAvailable()) setItem(wordbookStorageKey(accountId), JSON.stringify(book));
  } catch {
    // 적지 못하면 이번 기록만 잃습니다 — 학습을 막지 않습니다.
  }
}

export function clearWordbook(accountId: string): void {
  try {
    if (isStorageAvailable()) removeItem(wordbookStorageKey(accountId));
  } catch {
    // 지우지 못해도 던지지 않습니다.
  }
}

/** 로그인 성공 직후 — 비회원 단어장을 그 계정 칸으로 합치고 비회원 칸을 지웁니다. 던지지 않습니다. */
export function adoptGuestWordbook(userId: string): void {
  const guest = loadWordbook("guest");
  if (Object.keys(guest.words).length === 0) return;
  saveWordbook(userId, mergeWordbooks(loadWordbook(userId), guest));
  clearWordbook("guest");
}
