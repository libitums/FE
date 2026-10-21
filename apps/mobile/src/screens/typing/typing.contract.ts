// 타자 입력 활동의 계약입니다. 타입만 둡니다.

import type { LessonAudio, QuestionAudio } from "../../lib/question-audio";
import type { SafeAreaInsets } from "../../lib/safe-area";
import type { ActivityFinish, LessonPosition } from "../learning/activity-finish";

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
  /** 문항 음성입니다 — 받아쓰기는 듣기 갈래, 한국어로 쓰기는 판정 뒤 재생 갈래, 없으면 `null`(받아쓰기면 꺼진 재생 조작이 섭니다). */
  readonly audio: QuestionAudio | null;
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
  /** 카탈로그 레슨 안의 위치입니다. 주지 않으면 이 활동이 한 세션입니다. */
  readonly lesson?: LessonPosition;
  /** 레슨의 소리 설정(속도 · 자동 재생 · 보고)입니다. 없으면 단독 활동의 기본값입니다. */
  readonly lessonAudio?: LessonAudio;
  /** 호스트 안전 영역(`wiring.safeAreaInsets`)입니다. 이 활동에서 셸은 위만 비우므로 화면이 아래 · 좌 · 우를 집니다. */
  readonly insets: SafeAreaInsets;
};

export type TypingCopy = {
  readonly instruction: string;
  readonly answerField: (typed: string) => string;
  readonly answerFieldEmpty: string;
  readonly answerReveal: (answer: string) => string;
};

export type TypingTestId =
  | "typing-activity"
  | "typing-activity-body"
  | "typing-activity-content"
  | "typing-activity-cue"
  | "typing-activity-cue-support"
  | "typing-activity-hint"
  | "typing-activity-audio"
  | "typing-activity-listen"
  | "typing-activity-listen-again"
  | "typing-activity-listen-slow"
  | "typing-activity-answer"
  | "typing-activity-reveal"
  | "typing-activity-complete";
