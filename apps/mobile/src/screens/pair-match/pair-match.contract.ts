// 짝 맞추기 활동의 계약입니다. 타입만 둡니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { ActivityFinish, LessonPosition } from "../learning/activity-finish";

export type PairMatchQuestion = {
  /** 왼쪽 열 — 한글 낱말, 콘텐츠 순서입니다. */
  readonly words: readonly [string, string, ...string[]];
  /** 오른쪽 열 — 영어 뜻, 섞인 순서입니다. 길이는 `words`와 같습니다. */
  readonly meanings: readonly [string, string, ...string[]];
  /** `answer[w]` = 낱말 `w`의 뜻이 선 `meanings` 자리입니다. */
  readonly answer: readonly number[];
};

export type PairSide = "word" | "meaning";

/** `ordinal`은 맺을 때 받은 번호(1부터)이고 풀릴 때까지 바뀌지 않습니다. */
export type PairLink = {
  readonly word: number;
  readonly meaning: number;
  readonly ordinal: number;
};

export type PairMatchPhase = "matching" | "checked";

export type PairMatchSessionState = {
  readonly questionIndex: number;
  readonly selectedWord: number | null;
  readonly selectedMeaning: number | null;
  /** 맺은 순서입니다. */
  readonly links: readonly PairLink[];
  readonly phase: PairMatchPhase;
  /** 확인한 짝(문항 순서)입니다. */
  readonly submitted: readonly (readonly PairLink[])[];
};

export type PairMatchSessionAction =
  | { readonly type: "tapTile"; readonly side: PairSide; readonly index: number }
  | { readonly type: "check"; readonly pairCount: number }
  | { readonly type: "nextQuestion" };

export type PairTileMark = "idle" | "selected" | "linked";

export type PairTileInteraction = "enabled" | "locked";

export type PairMatchTileProps = {
  readonly side: PairSide;
  readonly index: number;
  readonly text: string;
  readonly mark: PairTileMark;
  /** 맺힌 짝의 번호입니다. 맺히지 않았으면 `null`. */
  readonly pairOrdinal: number | null;
  /** 맺힌 상대의 글자입니다(낭독용). 맺히지 않았으면 `null`. */
  readonly partnerText: string | null;
  /** 확인 뒤 그 짝의 판정입니다. 확인 전 · 맺히지 않았으면 `null`. */
  readonly result: AnswerResult | null;
  readonly interaction: PairTileInteraction;
  readonly onTap: (side: PairSide, index: number) => void;
};

export type PairMatchActivityProps = {
  readonly questions: readonly PairMatchQuestion[];
  readonly gemCount: number;
  readonly onExit: () => void;
  readonly onFinish: ActivityFinish;
  /** 카탈로그 레슨 안의 위치입니다. 주지 않으면 이 활동이 한 세션입니다. */
  readonly lesson?: LessonPosition;
};

export type PairMatchCopy = {
  readonly instruction: string;
  readonly progress: (matched: number, total: number) => string;
  readonly progressLabel: (matched: number, total: number) => string;
  readonly selected: (text: string) => string;
  readonly matched: (text: string, ordinal: number, partner: string) => string;
  readonly judged: (text: string, partner: string) => string;
  readonly answerPair: (word: string, meaning: string) => string;
  readonly linked: (word: string, meaning: string, matched: number, total: number) => string;
  readonly unlinked: (text: string) => string;
  readonly missedPairs: (pairs: string) => string;
  readonly spokenPair: (word: string, meaning: string) => string;
};

export type PairMatchTestId =
  | "pair-match-content"
  | "pair-match-progress"
  | "pair-match-board"
  | "pair-match-words"
  | "pair-match-meanings"
  | `pair-match-word-${number}`
  | `pair-match-meaning-${number}`
  | "pair-match-reveal"
  | "pair-match-complete";
