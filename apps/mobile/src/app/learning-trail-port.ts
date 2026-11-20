// 레슨 자취 · 더보기 화면이 쓰는 기기 단어장 칸입니다(ADR-0169) — 로그인 계정이면 `libitum.wordbook.<userId>`, 아니면 비회원 칸
// `guest`(로그인 때 `adoptGuestRecords`가 계정 칸으로 옮김). 계정 id는 저장된 세션에서 읽으므로 이벤트 핸들러 · 효과(배경 스레드)
// 에서만 부릅니다.

import { useState } from "@lynx-js/react";

import { loadWordbook, localDayOf, saveWordbook } from "../lib/wordbook";
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
  return { today: todayLocal, updateWordbook: (update) => void updateCurrentWordbook(update) };
}

/** 세션마다 하나인 레슨 자취(AppSession이 부름). */
export function useLearningTrail(): LearningTrail {
  const [trail] = useState(() => createLearningTrail(deviceLearningTrailPort()));
  return trail;
}
