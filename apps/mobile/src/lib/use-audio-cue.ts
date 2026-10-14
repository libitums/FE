// 화면이 「지금 나야 할 소리」를 값으로 내면 재생 · 정지를 맡는 훅입니다.

/** 지금 나야 할 소리 하나. `key`가 바뀌어야 다시 재생합니다. */
export type AudioCue = { readonly key: string; readonly source: string };
export type AudioCueControl = { readonly stop: () => void };

export function useAudioCue(_cue: AudioCue | null): AudioCueControl {
  return { stop: () => {} };
}
