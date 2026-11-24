// 학습 문항 음성의 어휘와 순수 판정입니다. 듣기 여섯 유형은 `ListenAudio`, 나머지 여섯 유형은
// 판정 뒤 한 번 들려 주는 `AnswerEchoAudio`를 가집니다. 자기 음성이 없는 유형도 정답 원문이 에피소드에 녹음돼
// 있으면 `AnswerEchoAudio`를, 대답 고르기는 `ListenAudio.echo`를 가집니다(ADR-0172).

import type { SlowPlaybackSupport } from "./audio";
import type { LearningItem } from "./episode-content.model";
import type { ListenPace } from "./listen-pace";
import type { SessionOptions } from "./session-options";
import type { AudioCue } from "./use-audio-cue";

/** 칩 소리가 난 활동입니다(ADR-0188). */
export type ChipSoundSurface = "word_choice" | "sentence_order";

/** 레슨이 다시 듣기 · 칩 소리를 썼다는 알림입니다 — 측정만 합니다(판정 · 점수와 무관, ADR-0188). */
export type LessonSoundUse =
  | { readonly kind: "answer-replayed" }
  | { readonly kind: "chip-sound"; readonly surface: ChipSoundSurface };

export type ListenItemType = Extract<
  LearningItem["type"],
  "LISTEN_SELECT" | "MIN_PAIR_AB" | "REPLY_SELECT" | "LISTEN_BUILD" | "DICTATION" | "SHADOW"
>;
export type AnswerEchoItemType = Extract<
  LearningItem["type"],
  | "TRANSLATE_TO_KO"
  | "TRANSLATE_TO_EN"
  | "WORD_ORDER"
  | "SYLLABLE_BUILD"
  | "SPEAK_WORD"
  | "IMG_MATCH"
>;

export type ListenItemRef = {
  readonly itemId: string;
  readonly itemType: ListenItemType;
};
export type ListenAudio = {
  readonly kind: "listen";
  readonly source: string;
  readonly ref: ListenItemRef;
  /** 판정 뒤 한 번 들려 줄 정답 음성입니다(대답 고르기의 정답 대답, ADR-0172). 없으면 키가 없습니다. */
  readonly echo?: AnswerEchoAudio;
};
export type AnswerEchoAudio = {
  readonly kind: "answer-echo";
  readonly source: string;
  /** 말소리 길이(ms, 음성 정보 파일). 모르면 키가 없습니다 — 저절로 넘어가는 틈에 씁니다(ADR-0172). */
  readonly speechMs?: number;
};
export type QuestionAudio = ListenAudio | AnswerEchoAudio;

export type AutoPlayAudio = "on" | "off";

export type ListenItemResult = "correct" | "incorrect" | "practiced" | "skipped";
export type ListenItemReport = {
  readonly ref: ListenItemRef;
  readonly result: ListenItemResult;
  readonly pace: ListenPace;
  readonly slowTurnedOn: boolean;
  readonly replayCount: number;
  readonly slowReplayCount: number;
};

export type LessonAudio = {
  readonly pace: ListenPace;
  readonly slowPlayback: SlowPlaybackSupport;
  readonly autoPlay: AutoPlayAudio;
  readonly onTogglePace: () => void;
  readonly onListenItemAnswered: (report: ListenItemReport) => void;
  /** 다시 듣기 · 칩 소리를 썼을 때(측정만, ADR-0188). 없으면 재지 않습니다. */
  readonly onSoundUsed?: (use: LessonSoundUse) => void;
};

export function autoPlayAudioOf(options: SessionOptions): AutoPlayAudio {
  return options["auto-play-audio"] ? "on" : "off";
}

/** 레슨 밖(테스트 · 단독 활동)의 소리 설정입니다. */
export function standaloneLessonAudio(options: SessionOptions): LessonAudio {
  return {
    pace: "normal",
    slowPlayback: "unsupported",
    autoPlay: autoPlayAudioOf(options),
    onTogglePace: () => {},
    onListenItemAnswered: () => {},
  };
}

export type ListenCue = { readonly key: string; readonly audio: ListenAudio };

export function listenCueOf(
  questionKey: string,
  audio: QuestionAudio | null | undefined,
): ListenCue | null {
  return audio?.kind === "listen" ? { key: questionKey, audio } : null;
}

/**
 * 판정 효과음(`correct_answer` 0.74초 · `wrong_answer` 0.46초가 들리는 길이) 뒤에 정답 음성을 시작하는 틈입니다
 * (ADR-0172). 두 소리는 서로 다른 호스트 모듈이라 같이 시작하면 겹칩니다.
 */
export const ANSWER_ECHO_DELAY_MS = 800;

/** 판정이 난 순간에만 서는 정답 뒤 재생 신호입니다. */
export function answerEchoCueOf(
  questionKey: string,
  audio: QuestionAudio | null | undefined,
  judged: boolean,
  autoPlay: AutoPlayAudio,
): AudioCue | null {
  if (!judged || autoPlay === "off") return null;
  const echo = echoOf(audio);
  if (echo === undefined) return null;
  return { key: `${questionKey}:echo`, source: echo.source, delayMs: ANSWER_ECHO_DELAY_MS };
}

function echoOf(audio: QuestionAudio | null | undefined): AnswerEchoAudio | undefined {
  return audio?.kind === "answer-echo" ? audio : audio?.echo;
}

/** 정답 음성이 끝난 뒤 넘어가기 전 여유와 기다림의 상한입니다(ms). */
const ANSWER_ECHO_TAIL_MS = 400;
const ANSWER_ECHO_MAX_HOLD_MS = 6000;

/**
 * 판정 뒤 저절로 넘어가는 화면의 기다림(ms)입니다 — 정답 음성이 날 때 그 말소리가 끝날 때까지(틈 + 길이 + 여유,
 * 상한 6초) 늘립니다. 길이를 모르거나 · 정답 음성이 없거나 · 자동 재생이 꺼지면 `baseMs` 그대로입니다(ADR-0172 D4).
 */
export function advanceAfterAnswerMs(
  baseMs: number,
  audio: QuestionAudio | null | undefined,
  autoPlay: AutoPlayAudio,
): number {
  const speechMs = echoOf(audio)?.speechMs;
  if (speechMs === undefined || autoPlay === "off") return baseMs;
  const hold = Math.min(
    ANSWER_ECHO_DELAY_MS + speechMs + ANSWER_ECHO_TAIL_MS,
    ANSWER_ECHO_MAX_HOLD_MS,
  );
  return Math.max(baseMs, hold);
}
