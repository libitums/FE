// 여정맵 Letters 추천(ADR-0169) — 문턱 설정 · 어려움 신호 → 이유 · 띄울지 판정 · 기기 기록.
// 레슨 중에는 띄우지 않습니다(사용자 결정 2026-11-20) — 신호는 레슨 자취(`app/learning-trail.ts`)가 모으고, 여정맵에 돌아와
// 다른 안내 · 레슨 완료 연출이 끝난 뒤 한 번 봅니다. 기록은 기기 범위 `libitum.letters`(서버로 가지 않음).

import type { LocalDay } from "./learning-progress.contract";
import { getItem, isStorageAvailable, setItem } from "./storage";

/** 문턱은 이 한 곳에서만 정합니다(사용자 지시). */
export const lettersRecommendConfig = {
  /** 한 레슨에서 한글 읽기 문항을 이만큼 틀리면 「어려웠다」. */
  hangulWrong: 3,
  /** 같은 문항을 이만큼 연속으로 틀리면 「어려웠다」(첫 답 + 다시 풀기). */
  repeatWrong: 2,
  /** 전체 노출 상한. */
  maxShows: 2,
  /** Keep going을 이만큼 누르면 더 띄우지 않음. */
  maxKeepGoing: 2,
  /** 지도가 한가해진 뒤 레슨 완료 연출(발자국)이 끝나기를 기다리는 시간. */
  delayMs: 1200,
} as const;

export type LettersRecommendConfig = typeof lettersRecommendConfig;

export type LessonEnd = "finished" | "failed" | "exited";
export type LettersRecommendReason = "hard" | "failed";

export type StruggleSignal = {
  readonly hangulWrong: number;
  /** 같은 문항 연속 틀림의 최댓값. */
  readonly repeatWrong: number;
  readonly end: LessonEnd;
};

export type LettersRecord = {
  readonly lettersOpened: boolean;
  readonly shows: number;
  readonly lastShownDay: LocalDay | null;
  readonly keepGoing: number;
};

export const emptyLettersRecord: LettersRecord = {
  lettersOpened: false,
  shows: 0,
  lastShownDay: null,
  keepGoing: 0,
};

/** 한글 읽기 문항 — 음절 조립 · 듣고 문장 만들기 · 빈칸(타일 · 보기). 콘텐츠 유형으로 가릅니다(학습형은 여러 유형이 나눠 씀). */
export const HANGUL_READING_ITEM_TYPES: readonly string[] = [
  "SYLLABLE_BUILD",
  "LISTEN_BUILD",
  "CLOZE",
  "CLOZE_CHOICE",
];

export function isHangulReadingItem(itemType: string): boolean {
  return HANGUL_READING_ITEM_TYPES.indexOf(itemType) >= 0;
}

/** 끝난 레슨의 신호 → 추천 이유. 실패 · 나가기는 failed, 끝냈는데 문턱을 넘으면 hard, 아니면 없음. */
export function recommendReasonOf(
  signal: StruggleSignal,
  config: LettersRecommendConfig = lettersRecommendConfig,
): LettersRecommendReason | null {
  if (signal.end !== "finished") return "failed";
  if (signal.hangulWrong >= config.hangulWrong || signal.repeatWrong >= config.repeatWrong)
    return "hard";
  return null;
}

/** 띄워도 되는가 — Letters를 열었거나 · 오늘 이미 봤거나 · 상한만큼 봤거나 · Keep going을 상한만큼 눌렀으면 아니오. */
export function canRecommendLetters(
  record: LettersRecord,
  today: LocalDay,
  config: LettersRecommendConfig = lettersRecommendConfig,
): boolean {
  return (
    !record.lettersOpened &&
    record.lastShownDay !== today &&
    record.shows < config.maxShows &&
    record.keepGoing < config.maxKeepGoing
  );
}

export function withShown(record: LettersRecord, today: LocalDay): LettersRecord {
  return { ...record, shows: record.shows + 1, lastShownDay: today };
}

export function withKeepGoing(record: LettersRecord): LettersRecord {
  return { ...record, keepGoing: record.keepGoing + 1 };
}

export function withLettersOpened(record: LettersRecord): LettersRecord {
  return record.lettersOpened ? record : { ...record, lettersOpened: true };
}

const count = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;

export function lettersRecordFrom(raw: unknown): LettersRecord {
  if (typeof raw !== "object" || raw === null) return emptyLettersRecord;
  const r = raw as Record<string, unknown>;
  const day = r["lastShownDay"];
  return {
    lettersOpened: r["lettersOpened"] === true,
    shows: count(r["shows"]),
    lastShownDay: typeof day === "string" ? day : null,
    keepGoing: count(r["keepGoing"]),
  };
}

export const lettersStorageKey = "libitum.letters";

export function loadLettersRecord(): LettersRecord {
  try {
    if (!isStorageAvailable()) return emptyLettersRecord;
    return lettersRecordFrom(JSON.parse(getItem(lettersStorageKey) ?? "null"));
  } catch {
    return emptyLettersRecord;
  }
}

export function saveLettersRecord(record: LettersRecord): void {
  try {
    if (isStorageAvailable()) setItem(lettersStorageKey, JSON.stringify(record));
  } catch {
    // 적지 못해도 이번 실행은 화면 상태로 지킵니다.
  }
}
