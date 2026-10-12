// 타자 입력 활동의 계약입니다. 타입만 둡니다.

import type { ActivityFinish } from "../learning/activity-finish";

export type TypingCueKind = "dictation" | "translation" | "pattern";

export type TypingQuestion = {
  readonly id: string;
  readonly kind: TypingCueKind;
  readonly instruction: string;
  readonly cue: string;
  readonly cueSupport: string | null;
  readonly hint: string | null;
  /** 첫째 = 공개용 정답입니다. */
  readonly answers: readonly [string, ...string[]];
  /** 오디오가 아직 연결되지 않았습니다 — 받아쓰기면 꺼진 재생 조작이 섭니다. */
  readonly audioSource: null;
};

export type TypingPhase = "typing" | "checked";

export type TypingSessionState = {
  readonly questionIndex: number;
  readonly keys: readonly string[];
  readonly shifted: boolean;
  readonly phase: TypingPhase;
  /** 확인한 입력(문항 순서)입니다. */
  readonly submitted: readonly string[];
};

export type TypingSessionAction =
  | { readonly type: "press"; readonly key: string }
  | { readonly type: "backspace" }
  | { readonly type: "shift" }
  | { readonly type: "check" }
  | { readonly type: "nextQuestion" };

export type TypingActivityProps = {
  readonly questions: readonly TypingQuestion[];
  readonly gemCount: number;
  readonly onExit: () => void;
  readonly onFinish: ActivityFinish;
};

export type TypingCopy = {
  readonly instruction: string;
  readonly answerField: (typed: string) => string;
  readonly answerFieldEmpty: string;
  readonly answerReveal: (answer: string) => string;
};

export type TypingTestId =
  | "typing-activity-content"
  | "typing-activity-cue"
  | "typing-activity-cue-support"
  | "typing-activity-hint"
  | "typing-activity-audio"
  | "typing-activity-answer"
  | "typing-activity-reveal"
  | "typing-activity-complete";
