// 따라 읽기 활동(카탈로그 SHADOW)의 계약입니다. 타입만 둡니다.

import type {
  SpeechAttemptOutcome,
  SpeechAttemptPhase,
  SpeechAvailability,
} from "../../lib/speech-attempt";
import type { ActivityFinish, LessonPosition } from "../learning/activity-finish";

export type ReadAloudQuestion = {
  /** 따라 읽을 한국어 문장(치환 · trim) — 비지 않습니다. 부호를 그대로 둡니다. */
  readonly sentence: string;
  /** 같은 묶음의 로마자 — 없거나 비면 null. */
  readonly romanization: string | null;
  /** 같은 묶음의 영어 — 없거나 비면 null. */
  readonly translation: string | null;
};

export type ReadAloudSessionState = {
  readonly questionIndex: number;
  readonly phase: SpeechAttemptPhase;
  readonly availability: SpeechAvailability;
  /** 불가 국면에서 Skip으로 넘긴 문항 수입니다. */
  readonly skippedCount: number;
};

export type ReadAloudSessionAction =
  /** ready · heard · unavailable(dictation-off) → listening. 그 밖은 같은 참조. */
  | { readonly type: "start" }
  /** listening일 때만 — 결말을 국면으로, availability 갱신. */
  | { readonly type: "outcome"; readonly outcome: SpeechAttemptOutcome }
  /** ready · heard → 다음 문항. */
  | { readonly type: "next" }
  /** unavailable → 다음 문항 + skippedCount 1. */
  | { readonly type: "skip" };

/** 넘기는 버튼이 하는 일 — 다음 문항 / 다음 활동으로 넘김 / 결과 보기. */
export type ReadAloudStep = "advance" | "hand-off" | "finish";

export type ReadAloudActivityProps = {
  readonly questions: readonly ReadAloudQuestion[];
  readonly gemCount: number;
  readonly onExit: () => void;
  readonly onFinish: ActivityFinish;
  /** 카탈로그 레슨 안의 위치입니다. 주지 않으면 이 활동이 한 세션입니다. */
  readonly lesson?: LessonPosition;
};

export type ReadAloudCopy = {
  /** 판정 배지 자리의 중립 표식 — 채점하지 않는 연습임을 말합니다. */
  readonly badge: string;
  /** 인식 뒤 안내 줄 · 낭독 — 앞에서부터 맞은 낱말 수 / 문장 낱말 수. */
  readonly matched: (matched: number, total: number) => string;
  /** 로마자 줄의 낭독 이름입니다. */
  readonly pronunciation: (romanization: string) => string;
};

export type ReadAloudTestId =
  | "read-aloud-content"
  | "read-aloud-badge"
  | "read-aloud-sentence"
  | `read-aloud-chunk-${number}`
  | "read-aloud-romanization"
  | "read-aloud-translation"
  | "read-aloud-waves"
  | "read-aloud-hint"
  | "read-aloud-secondary"
  | "read-aloud-listen"
  | "read-aloud-listen-again"
  | "read-aloud-listen-slow";
