// 그림 보고 낱말 말하기 활동(카탈로그 SPEAK_WORD)의 계약입니다. 타입만 둡니다.

import type { ItemAnswerReporter } from "../../lib/item-answer";
import type { MicPermissionContext } from "../../lib/mic-permission-event.contract";
import type { SpokenAnswerJudgement } from "../../lib/speaking-judge";
import type { NonEmpty } from "../../lib/non-empty";
import type { AnswerEchoAudio, LessonAudio } from "../../lib/question-audio";
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
  /** 판정 뒤 한 번 들려 주는 정답 음성입니다. 없으면 키가 없습니다. */
  readonly audio?: AnswerEchoAudio;
};

/**
 * 지나간 문항마다 들은 글자(건너뜀은 null)를 적고, 지금 문항의 판정은 결말과 함께 받아 둡니다 — 렌더 중에는 채점하지
 * 않습니다(채점 함수는 배경 스레드 전용, ADR-0201 개정 ⟨렌더 밖 판정⟩). 세션 결과는 끝낼 때(탭 핸들러) 다시 잽니다.
 */
export type SpeakWordSessionState = {
  readonly questionIndex: number;
  readonly phase: SpeechAttemptPhase;
  readonly availability: SpeechAvailability;
  readonly heard: readonly (string | null)[];
  /** 국면이 heard일 때의 판정입니다. 그 밖에는 null. */
  readonly judgement: SpokenAnswerJudgement | null;
};

export type SpeakWordSessionAction =
  /** ready · unavailable(dictation-off) → listening. */
  | { readonly type: "start" }
  /**
   * listening일 때만 — heard면 heard 목록에 글자를 더하고 국면 heard · 판정 `judgement`, 불가면 국면 unavailable +
   * availability 갱신. `judgement`는 결말 콜백이 `speakWordJudgementOf`로 잽니다(heard가 아니면 null).
   */
  | {
      readonly type: "outcome";
      readonly outcome: SpeechAttemptOutcome;
      readonly judgement: SpokenAnswerJudgement | null;
    }
  /** ready · unavailable → heard 목록에 null, 다음 문항. */
  | { readonly type: "skip" }
  /** heard → 다음 문항. */
  | { readonly type: "next" }
  /** 권한이 다시 열림(설정에서 돌아옴 · 사전 안내 허용) — 잠금을 풀고 불가(blocked) 국면이면 준비로(ADR-0206 D3). */
  | { readonly type: "reopen" };

export type SpeakWordActivityProps = {
  readonly questions: readonly SpeakWordQuestion[];
  readonly onExit: () => void;
  readonly onFinish: ActivityFinish;
  readonly lesson?: LessonPosition;
  /** 레슨의 소리 설정(자동 재생)입니다. 없으면 단독 활동의 기본값입니다. */
  readonly lessonAudio?: LessonAudio;
  /** 문항이 처음 판정되는 순간 한 번 부릅니다(측정). */
  readonly onItemAnswered?: ItemAnswerReporter;
  /** 마이크 권한 안내의 레슨 맥락(ADR-0206) — 없으면 레슨 밖 · 이벤트 없음입니다. */
  readonly mic?: MicPermissionContext;
};

/** 그림 틀 — 상태대로 빈 틀 · 그림 · 뜻 글자를 그립니다(상태 없음). 이름표는 없습니다(정답은 `AnswerReveal`). */
export type SpeakWordPictureProps = {
  readonly url: string;
  /** 틀 비율입니다 — regular 5:4, compact 4:3. 없으면 4:3. */
  readonly ratio?: "5-4" | "4-3";
  readonly meaning: string;
  readonly state: PictureLoadState;
  readonly onLoad: () => void;
  readonly onError: () => void;
};

export type SpeakWordCopy = {
  /** 콘텐츠 지시문이 없을 때의 지시문입니다. */
  readonly instruction: string;
  /** 불가(blocked · failed) 안내 줄 — Skip으로 이어 가라고 말합니다(다음 자리를 말하지 않음). */
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
