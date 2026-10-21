import type { SlowPlaybackSupport } from "../lib/audio";
import type { ListeningPlaybackState } from "../lib/listen-playback";
import type { ListenPace } from "../lib/listen-pace";
import type { LessonAudio, ListenCue, ListenItemResult } from "../lib/question-audio";

// 듣기 문항의 재생 주인입니다. 자동 재생 · 다시 듣기 · 「천천히」 · 문항 보고를 문항 키로 관리합니다.

export type ListenAudioControl = {
  readonly playback: ListeningPlaybackState;
  /** `lesson.pace` 그대로입니다. */
  readonly pace: ListenPace;
  /** `lesson.slowPlayback` 그대로입니다. */
  readonly slowPlayback: SlowPlaybackSupport;
  /** 재생/일시정지 — 듣기 화면만 씁니다. */
  readonly toggle: () => void;
  /** 처음부터, 지금 속도로 다시 듣습니다. */
  readonly replay: () => void;
  readonly togglePace: () => void;
  /** 문항당 처음 한 번만 보고합니다. */
  readonly answered: (result: ListenItemResult) => void;
};

export function useListenAudio(_cue: ListenCue | null, lesson: LessonAudio): ListenAudioControl {
  return {
    playback: "idle",
    pace: lesson.pace,
    slowPlayback: lesson.slowPlayback,
    toggle: () => {},
    replay: () => {},
    togglePace: () => {},
    answered: () => {},
  };
}
