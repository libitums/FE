import { useEffect, useRef } from "@lynx-js/react";

import { playAudio, stopAudio } from "./audio";

// 화면이 「지금 나야 할 소리」를 값으로 내면 재생 · 정지를 맡는 훅입니다.
// 소리의 끝을 읽어야 하는 화면은 `onFinished`를 줍니다(롤플레이 — 한 번에 한 목소리). 재생할 수 없으면 곧바로 끝난 것으로 알립니다.
// 멈춘 소리(키가 바뀜 · `stop`)의 끝은 알리지 않습니다. 소리가 없으면 아무 일도 하지 않습니다.

/** 지금 나야 할 소리 하나. `key`가 바뀌어야 다시 재생합니다. `delayMs`가 있으면 그만큼 뒤에 시작합니다. */
export type AudioCue = {
  readonly key: string;
  readonly source: string;
  readonly delayMs?: number;
  /** 이 소리가 끝까지 갔거나(실패 포함) 재생할 수 없을 때 한 번. 멈춘 소리에는 부르지 않습니다. */
  readonly onFinished?: () => void;
};
export type AudioCueControl = { readonly stop: () => void };

export function useAudioCue(cue: AudioCue | null): AudioCueControl {
  const key = cue?.key;
  const source = cue?.source;
  const delayMs = cue?.delayMs ?? 0;
  // 틈을 두고 기다리는 재생을 거두는 함수입니다. 기다리는 소리가 없으면 `null`.
  const cancelPending = useRef<(() => void) | null>(null);
  // 끝 알림은 렌더마다 최신 함수를 봅니다 — 키가 같으면 재생을 다시 하지 않으므로 효과의 의존성에 넣지 않습니다.
  const finished = useRef<(() => void) | undefined>(undefined);
  finished.current = cue?.onFinished;
  const play = (from: string) => {
    "background only";
    if (playAudio(from, () => finished.current?.()) === "unavailable") finished.current?.();
  };

  useEffect(() => {
    if (key === undefined || source === undefined) return undefined;
    if (delayMs <= 0) {
      play(source);
      // 재생 결과가 불가능이어도 정지는 같은 결과(무동작)라 반환값에 기대지 않습니다.
      return () => stopAudio();
    }
    // 틈을 두는 소리(정답 뒤 음성, ADR-0172)는 기다리는 중에 사라지면 타이머만 지웁니다 — 아직 내지 않은 소리를 멈추려다
    // 다른 소리(다음 문항의 듣기)를 끊지 않게 합니다.
    let started = false;
    const timer = setTimeout(() => {
      started = true;
      cancelPending.current = null;
      play(source);
    }, delayMs);
    const cancel = () => {
      cancelPending.current = null;
      clearTimeout(timer);
    };
    cancelPending.current = cancel;
    return () => {
      if (started) {
        stopAudio();
      } else {
        cancel();
      }
    };
  }, [key, source, delayMs]);

  const stop = () => {
    "background only";
    // 기다리는 소리는 거두기만 합니다 — 아직 나지 않은 소리라 정지를 부르면 다른 소리(듣기)를 끊습니다.
    const cancel = cancelPending.current;
    if (cancel !== null) {
      cancel();
      return;
    }
    if (cue !== null) stopAudio();
  };
  return { stop };
}
