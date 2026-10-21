// 학습 문항 음성의 어휘와 순수 판정입니다. 듣기 여섯 유형은 `ListenAudio`, 나머지 여섯 유형은
// 판정 뒤 한 번 들려 주는 `AnswerEchoAudio`를 가집니다.

import type { SlowPlaybackSupport } from "./audio";
import type { LearningItem } from "./episode-content.model";
import type { ListenPace } from "./listen-pace";
import type { SessionOptions } from "./session-options";
import type { AudioCue } from "./use-audio-cue";

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
};
export type AnswerEchoAudio = { readonly kind: "answer-echo"; readonly source: string };
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
};

export function autoPlayAudioOf(_options: SessionOptions): AutoPlayAudio {
  return "off";
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
  _questionKey: string,
  _audio: QuestionAudio | null | undefined,
): ListenCue | null {
  return null;
}

/** 판정이 난 순간에만 서는 정답 뒤 재생 신호입니다. */
export function answerEchoCueOf(
  _questionKey: string,
  _audio: QuestionAudio | null | undefined,
  _judged: boolean,
  _autoPlay: AutoPlayAudio,
): AudioCue | null {
  return null;
}
