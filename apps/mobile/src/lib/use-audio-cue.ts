import { useEffect } from "@lynx-js/react";

import { playAudio, stopAudio } from "./audio";

// 화면이 「지금 나야 할 소리」를 값으로 내면 재생 · 정지를 맡는 훅입니다.
// 소리의 끝 · 실패를 흐름이 읽지 않으므로 완료 콜백은 비어 있고, 소리가 없으면 아무 일도 하지 않습니다.

/** 지금 나야 할 소리 하나. `key`가 바뀌어야 다시 재생합니다. */
export type AudioCue = { readonly key: string; readonly source: string };
export type AudioCueControl = { readonly stop: () => void };

export function useAudioCue(cue: AudioCue | null): AudioCueControl {
  const key = cue?.key;
  const source = cue?.source;

  useEffect(() => {
    if (key === undefined || source === undefined) return undefined;
    playAudio(source, () => {});
    // 재생 결과가 불가능이어도 정지는 같은 결과(무동작)라 반환값에 기대지 않습니다.
    return () => stopAudio();
  }, [key, source]);

  const stop = () => {
    "background only";
    if (cue !== null) stopAudio();
  };
  return { stop };
}
