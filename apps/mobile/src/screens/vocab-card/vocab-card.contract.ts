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
  /**
   * 예문이 없거나 표제어와 같으면 `null`입니다. ⟨2026-10-19⟩ 카드 화면은 예문을 그리지 않습니다
   * (ADR-0073 — 정보가 너무 많다는 사용자 결정). 매핑은 그대로 두어 되돌릴 자리가 화면 하나입니다.
   */
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
  /** 카드 아래 단 하나의 버튼입니다 — 마지막 카드에서도 같은 라벨입니다. */
  readonly gotIt: string;
  /** 카드 진행 헤더의 캡션 겸 접근성 이름입니다 — `Word 4 of 7`. */
  readonly runLabel: (ordinal: number, total: number) => string;
  readonly pronunciation: (romanization: string) => string;
  readonly meaning: (meaning: string) => string;
};

export type VocabCardTestId =
  | "vocab-card-content"
  | "vocab-card-badge"
  | "vocab-card-word"
  | "vocab-card-romanization"
  | "vocab-card-meaning"
  | "vocab-card-got-it";
