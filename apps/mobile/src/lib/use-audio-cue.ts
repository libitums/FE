import { useEffect, useRef } from "@lynx-js/react";

import { playAudio, stopAudio } from "./audio";

// 화면이 「지금 나야 할 소리」를 값으로 내면 재생 · 정지를 맡는 훅입니다.
// 소리의 끝 · 실패를 흐름이 읽지 않으므로 완료 콜백은 비어 있고, 소리가 없으면 아무 일도 하지 않습니다.

/** 지금 나야 할 소리 하나. `key`가 바뀌어야 다시 재생합니다. `delayMs`가 있으면 그만큼 뒤에 시작합니다. */
export type AudioCue = { readonly key: string; readonly source: string; readonly delayMs?: number };
export type AudioCueControl = { readonly stop: () => void };

export function useAudioCue(cue: AudioCue | null): AudioCueControl {
  const key = cue?.key;
  const source = cue?.source;
  const delayMs = cue?.delayMs ?? 0;
  // 틈을 두고 기다리는 재생을 거두는 함수입니다. 기다리는 소리가 없으면 `null`.
  const cancelPending = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (key === undefined || source === undefined) return undefined;
    if (delayMs <= 0) {
      playAudio(source, () => {});
      // 재생 결과가 불가능이어도 정지는 같은 결과(무동작)라 반환값에 기대지 않습니다.
      return () => stopAudio();
    }
    // 틈을 두는 소리(정답 뒤 음성, ADR-0172)는 기다리는 중에 사라지면 타이머만 지웁니다 — 아직 내지 않은 소리를 멈추려다
    // 다른 소리(다음 문항의 듣기)를 끊지 않게 합니다.
    let started = false;
    const timer = setTimeout(() => {
      started = true;
      cancelPending.current = null;
      playAudio(source, () => {});
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
