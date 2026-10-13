// 단어 카드 활동의 계약입니다. 타입만 둡니다.

import type { ActivityFinish, LessonPosition } from "../learning/activity-finish";

export type VocabCardExample = {
  readonly text: string;
  readonly romanization: string | null;
  readonly translation: string | null;
};

export type VocabCardQuestion = {
  readonly word: string;
  readonly romanization: string | null;
  readonly meaning: string;
  /** 예문이 없거나 표제어와 같으면 `null`입니다. */
  readonly example: VocabCardExample | null;
};

export type VocabCardSessionState = { readonly cardIndex: number };

export type VocabCardSessionAction = { readonly type: "nextCard" };

/** 아래 버튼이 하는 일입니다 — 다음 카드 / 다음 활동으로 넘김 / 결과 보기. */
export type VocabCardStep = "advance" | "hand-off" | "finish";

export type VocabCardActivityProps = {
  readonly questions: readonly VocabCardQuestion[];
  readonly gemCount: number;
  readonly onExit: () => void;
  readonly onFinish: ActivityFinish;
  /** 카탈로그 레슨 안의 위치입니다. 주지 않으면 이 활동이 한 세션입니다. */
  readonly lesson?: LessonPosition;
};

export type VocabCardCopy = {
  readonly instruction: string;
  readonly badge: string;
  readonly exampleTitle: string;
  readonly pronunciation: (romanization: string) => string;
  readonly meaning: (meaning: string) => string;
  readonly example: (text: string) => string;
};

export type VocabCardTestId =
  | "vocab-card-content"
  | "vocab-card-badge"
  | "vocab-card-word"
  | "vocab-card-romanization"
  | "vocab-card-meaning"
  | "vocab-card-example"
  | "vocab-card-example-title"
  | "vocab-card-example-text"
  | "vocab-card-example-support"
  | "vocab-card-example-romanization"
  | "vocab-card-example-translation";
