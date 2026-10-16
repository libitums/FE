// 그림 보고 낱말 말하기 활동(카탈로그 SPEAK_WORD)의 계약입니다. 타입만 둡니다.

import type { NonEmpty } from "../../lib/non-empty";
import type { PictureLoadState } from "../../lib/picture-load";
import type {
  SpeechAttemptOutcome,
  SpeechAttemptPhase,
  SpeechAvailability,
} from "../../lib/speech-attempt";
import type { ActivityFinish, LessonPosition } from "../learning/activity-finish";

export type SpeakWordQuestion = {
  /** 풀린 그림 주소(`imageUrlOf` 결과) — 비지 않습니다. */
  readonly pictureUrl: string;
  /** 영어 뜻 — 틀 낭독 이름 · 뜻 줄 · 그림 실패 대체 글자. 비지 않습니다. */
  readonly meaning: string;
  /** 받는 낱말들(치환 · trim, 빈 값 제외). 판정은 `judgeSpokenWord`. 공개는 첫 정답. */
  readonly answers: NonEmpty<string>;
  /** 첫 정답의 로마자 — 없으면 null(정답 상자에 낱말만). */
  readonly romanization: string | null;
  /** 있으면 `copy.speakWord.instruction` 대신 서는 지시문입니다(콘텐츠 `prompt.en`). */
  readonly instruction?: string;
};

/** 판정을 적지 않습니다 — 지나간 문항마다 들은 글자(건너뜀은 null)만 적고 결과는 파생입니다. */
export type SpeakWordSessionState = {
  readonly questionIndex: number;
  readonly phase: SpeechAttemptPhase;
  readonly availability: SpeechAvailability;
  readonly heard: readonly (string | null)[];
};

export type SpeakWordSessionAction =
  /** ready · unavailable(dictation-off) → listening. */
  | { readonly type: "start" }
  /** listening일 때만 — heard면 heard 목록에 글자를 더하고 국면 heard, 불가면 국면 unavailable + availability 갱신. */
  | { readonly type: "outcome"; readonly outcome: SpeechAttemptOutcome }
  /** ready · unavailable → heard 목록에 null, 다음 문항. */
  | { readonly type: "skip" }
  /** heard → 다음 문항. */
  | { readonly type: "next" };

export type SpeakWordActivityProps = {
  readonly questions: readonly SpeakWordQuestion[];
  readonly gemCount: number;
  readonly onExit: () => void;
  readonly onFinish: ActivityFinish;
  readonly lesson?: LessonPosition;
};

/** 그림 틀 — 상태대로 빈 틀 · 그림 · 뜻 글자를 그립니다(상태 없음). 이름표는 없습니다(정답은 `AnswerReveal`). */
export type SpeakWordPictureProps = {
  readonly url: string;
  readonly meaning: string;
  readonly state: PictureLoadState;
  readonly onLoad: () => void;
  readonly onError: () => void;
};

export type SpeakWordCopy = {
  /** 콘텐츠 지시문이 없을 때의 지시문입니다. */
  readonly instruction: string;
  /** 불가(blocked · failed) 안내 줄 — 낱말을 건너뛰라고 말합니다. */
  readonly recognitionUnavailable: string;
};

export type SpeakWordTestId =
  | "speak-word-content"
  | "speak-word-picture"
  | "speak-word-picture-frame"
  | "speak-word-picture-image"
  | "speak-word-picture-fallback"
  | "speak-word-picture-caption"
  | "speak-word-meaning"
  | "speak-word-reveal"
  | "speak-word-waves"
  | "speak-word-hint"
  | "speak-word-secondary"
  | "speak-word-complete";
