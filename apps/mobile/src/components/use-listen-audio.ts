import { useEffect, useRef, useState } from "@lynx-js/react";

import { pauseAudio, playAudio, resumeAudio, stopAudio } from "../lib/audio";
import type { SlowPlaybackSupport } from "../lib/audio";
import { playbackRateOf, SLOW_PLAYBACK_RATE } from "../lib/listen-pace";
import type { ListenPace, PlaybackRate } from "../lib/listen-pace";
import { playbackActionFor, playbackStateAfterPlay } from "../lib/listen-playback";
import type { ListeningPlaybackState } from "../lib/listen-playback";
import type { LessonAudio, ListenCue, ListenItemResult } from "../lib/question-audio";
import { playSound } from "../lib/sound-effects";

// 듣기 문항의 재생 주인입니다. 자동 재생 · 다시 듣기 · 「천천히」 · 문항 보고를 문항 키로 관리합니다.
//
// 재생 상태의 주인은 여기 `useState` 하나입니다 — `lib/audio.ts`에도 두면 진실이 둘이 되고 어긋나는 순간을
// 판정할 수단이 없습니다(ADR-0017 D3). 자동 재생의 dep은 문항 키입니다: 같은 음성이 두 문항 연속이어도 둘째가
// 자동 재생됩니다. 지금 속도 · 자동 재생 옵션은 ref로 읽어 문항이 뜰 때 한 번만 반영합니다.

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

type ItemTally = {
  replayCount: number;
  slowReplayCount: number;
  slowTurnedOn: boolean;
  reported: boolean;
};

const freshTally = (): ItemTally => ({
  replayCount: 0,
  slowReplayCount: 0,
  slowTurnedOn: false,
  reported: false,
});

export function useListenAudio(cue: ListenCue | null, lesson: LessonAudio): ListenAudioControl {
  const [playback, setPlayback] = useState<ListeningPlaybackState>("idle");
  const lessonRef = useRef(lesson);
  lessonRef.current = lesson;
  const cueRef = useRef(cue);
  cueRef.current = cue;
  const tallyRef = useRef<ItemTally>(freshTally());

  const key = cue?.key;
  const source = cue?.audio.source;

  useEffect(() => {
    tallyRef.current = freshTally();
    if (source === undefined) {
      setPlayback("idle");
      return undefined;
    }
    if (lessonRef.current.autoPlay === "on") {
      const rate = playbackRateOf(lessonRef.current.pace);
      setPlayback(playbackStateAfterPlay(playAudio(source, () => setPlayback("idle"), rate)));
    } else {
      setPlayback("idle");
    }
    // 정리 하나가 문항 변경 · 완료 · 출구 · 탭 전환을 모두 집습니다.
    return () => stopAudio();
  }, [key, source]);

  const start = (rate: PlaybackRate): void => {
    "background only";
    if (source === undefined) return;
    setPlayback(playbackStateAfterPlay(playAudio(source, () => setPlayback("idle"), rate)));
  };
  const currentRate = (): PlaybackRate => playbackRateOf(lessonRef.current.pace);

  const toggle = (): void => {
    "background only";
    if (source === undefined) return;
    playSound("button");
    switch (playbackActionFor(playback)) {
      case "pause":
        pauseAudio();
        setPlayback("paused");
        return;
      case "resume":
        resumeAudio();
        setPlayback("playing");
        return;
      case "play":
        start(currentRate());
    }
  };

  // 다시 듣기는 언제나 「처음부터」이고, 누른 것만 속도별로 셉니다(자동 재생 · 켤 때의 재생은 세지 않음).
  const replay = (): void => {
    "background only";
    if (source === undefined) return;
    playSound("button");
    if (lessonRef.current.pace === "slow") tallyRef.current.slowReplayCount += 1;
    else tallyRef.current.replayCount += 1;
    start(currentRate());
  };

  // 켜면 그 자리에서 0.85로 처음부터 다시 들려 주고, 끌 때는 재생을 건드리지 않습니다(갑작스러운 소리 없음).
  const togglePace = (): void => {
    "background only";
    if (source === undefined) return;
    playSound("button");
    const turningOn = lessonRef.current.pace === "normal";
    lessonRef.current.onTogglePace();
    if (turningOn) {
      tallyRef.current.slowTurnedOn = true;
      start(SLOW_PLAYBACK_RATE);
    }
  };

  const answered = (result: ListenItemResult): void => {
    "background only";
    const current = cueRef.current;
    const tally = tallyRef.current;
    if (current === null || tally.reported) return;
    tally.reported = true;
    lessonRef.current.onListenItemAnswered({
      ref: current.audio.ref,
      result,
      pace: lessonRef.current.pace,
      slowTurnedOn: tally.slowTurnedOn,
      replayCount: tally.replayCount,
      slowReplayCount: tally.slowReplayCount,
    });
  };

  return {
    playback,
    pace: lesson.pace,
    slowPlayback: lesson.slowPlayback,
    toggle,
    replay,
    togglePace,
    answered,
  };
}
