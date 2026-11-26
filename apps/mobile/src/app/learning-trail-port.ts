// 레슨 자취 · 더보기 화면이 쓰는 기기 단어장 칸입니다(ADR-0169) — 로그인 계정이면 `libitum.wordbook.<userId>`, 아니면 비회원 칸
// `guest`(로그인 때 `adoptGuestRecords`가 계정 칸으로 옮김). 계정 id는 저장된 세션에서 읽으므로 이벤트 핸들러 · 효과(배경 스레드)
// 에서만 부릅니다.

import { useEffect, useState } from "@lynx-js/react";

import type { CatalogProgress } from "../lib/catalog-progress";
import type { CatalogEntry } from "../lib/episode-catalog";
import { loadWordbook, localDayOf, saveWordbook } from "../lib/wordbook";
import { withCompletedLessonWords } from "../lib/wordbook-backfill";
import type { Wordbook } from "../lib/wordbook";
import { guestProgressId } from "./guest-progress";
import { createLearningTrail } from "./learning-trail";
import type { LearningTrail, LearningTrailPort } from "./learning-trail";
import { progressUserId } from "./pending-learning-progress";

/** 지금 단어장 칸의 계정 id — 로그인 사용자 id, 없으면 `guest`. */
export function wordbookAccountId(): string {
  "background only";
  return progressUserId() ?? guestProgressId;
}

export function loadCurrentWordbook(): Wordbook {
  "background only";
  return loadWordbook(wordbookAccountId());
}

export function updateCurrentWordbook(update: (book: Wordbook) => Wordbook): Wordbook {
  "background only";
  const id = wordbookAccountId();
  const book = loadWordbook(id);
  const next = update(book);
  if (next !== book) saveWordbook(id, next); // 바뀐 것이 없으면 쓰지 않습니다
  return next;
}

export function todayLocal(): string {
  return localDayOf(new Date());
}

export function deviceLearningTrailPort(): LearningTrailPort {
  return {
    today: todayLocal,
    updateWordbook: (update) => void updateCurrentWordbook(update),
    readWordbook: loadCurrentWordbook,
  };
}

/**
 * 세션마다 하나인 레슨 자취(AppSession이 부름). 진행 · 카탈로그를 받거나 바뀔 때(효과, 렌더마다 아님) 끝낸 레슨의 단어를 단어장
 * 칸에 채웁니다(ADR-0169 개정 2026-11-25) — 더할 것이 없으면 쓰지 않습니다. My words · 스토리 단어 시트가 같은 칸을 읽습니다.
 */
export function useLearningTrail(
  progress: CatalogProgress,
  catalog: readonly CatalogEntry[],
): LearningTrail {
  const [trail] = useState(() => createLearningTrail(deviceLearningTrailPort()));
  useEffect(() => {
    if (Object.keys(progress).length === 0) return;
    const today = todayLocal();
    updateCurrentWordbook((book) => withCompletedLessonWords(book, catalog, progress, today));
  }, [progress, catalog]);
  return trail;
}
