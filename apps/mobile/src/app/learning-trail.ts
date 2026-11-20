// 레슨이 남기는 자취입니다(ADR-0169) — 단어장 기록(단어 카드로 만난 단어 · 채점 문항의 첫 답)과 Letters 추천의 어려움 신호.
// 레슨 결선(`catalog-item-report-wiring` · `catalog-lesson-finish` · `catalog-lesson-wiring`)이 부르고, 여정맵의 추천 훅이
// 끝난 레슨의 신호를 한 번 꺼냅니다. 신호는 메모리에만 둡니다(앱을 끄면 사라짐 — 다음 레슨에 다시 모입니다).

import type { AnswerResult } from "../lib/answer-result";
import { isHangulReadingItem } from "../lib/letters-recommend";
import type { LessonEnd, StruggleSignal } from "../lib/letters-recommend";
import { withAnswer, withCardsSeen } from "../lib/wordbook";
import type { Wordbook } from "../lib/wordbook";
import type { LocalDay } from "../lib/learning-progress.contract";

export type LearningTrailPort = {
  readonly today: () => LocalDay;
  /** 단어장을 읽고 고쳐 씁니다 — 지금 계정(비회원이면 guest)의 칸. */
  readonly updateWordbook: (update: (book: Wordbook) => Wordbook) => void;
};

export type LearningTrail = {
  /** 단어 카드 활동이 끝났을 때 — 보인 카드의 콘텐츠 ref. */
  readonly cardsSeen: (episodeId: string, refs: readonly (string | undefined)[]) => void;
  /** 채점 문항의 첫 판정. */
  readonly itemAnswered: (
    episodeId: string,
    item: { readonly itemId: string; readonly itemType: string; readonly contentRef?: string },
    outcome: AnswerResult | "skipped",
  ) => void;
  /** 다시 풀기에서 그 문항을 또 틀림. */
  readonly repeatWrong: (itemType: string) => void;
  readonly lessonEnded: (end: LessonEnd) => void;
  /** 끝난 레슨의 신호를 한 번 꺼냅니다(꺼내면 비웁니다). */
  readonly takeSignal: () => StruggleSignal | null;
};

export function createLearningTrail(port: LearningTrailPort): LearningTrail {
  let hangulWrong = 0;
  let repeatWrong = 0;
  let pending: StruggleSignal | null = null;
  return {
    cardsSeen: (episodeId, refs) => {
      const seen = refs.filter((ref): ref is string => typeof ref === "string");
      if (seen.length === 0) return;
      const today = port.today();
      port.updateWordbook((book) => withCardsSeen(book, episodeId, seen, today));
    },
    itemAnswered: (episodeId, item, outcome) => {
      if (outcome === "skipped") return;
      if (outcome === "incorrect" && isHangulReadingItem(item.itemType)) {
        hangulWrong += 1;
        repeatWrong = Math.max(repeatWrong, 1);
      }
      const ref = item.contentRef;
      if (ref === undefined) return;
      const today = port.today();
      port.updateWordbook((book) => withAnswer(book, episodeId, ref, outcome, today));
    },
    repeatWrong: (itemType) => {
      if (isHangulReadingItem(itemType)) repeatWrong = Math.max(repeatWrong, 2);
    },
    lessonEnded: (end) => {
      pending = { hangulWrong, repeatWrong, end };
      hangulWrong = 0;
      repeatWrong = 0;
    },
    takeSignal: () => {
      const signal = pending;
      pending = null;
      return signal;
    },
  };
}
