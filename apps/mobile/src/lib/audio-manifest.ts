// 음성 정보 파일(audio/manifest.json)의 해석입니다 - 순수 함수만 두어 두 스레드에 실려도 안전합니다.

/** 음성 정보 파일의 스키마 이름입니다. 이 값과 정확히 같을 때만 읽습니다. */
export const AUDIO_MANIFEST_SCHEMA = "audio-manifest-1";
/** 버킷 기준 상대 경로입니다. */
export const AUDIO_MANIFEST_PATH = "audio/manifest.json";

/** 음성 하나의 길이(ms) - 둘 다 양의 정수입니다. `speechEndMs`는 말소리가 끝나는 때(끝 무음 앞)입니다. */
export type AudioTiming = { readonly durationMs: number; readonly speechEndMs?: number };
/** 음성 id(`u01-water/pre-3`) → 길이. */
export type AudioTimingTable = ReadonlyMap<string, AudioTiming>;

/**
 * 원문을 표로 바꿉니다. JSON이 아니거나 스키마가 다르거나 `audio`가 객체가 아니면 `null`(파일을 쓰지 않음),
 * id 규약 밖 키 · 값이 양의 정수가 아닌 항목은 그 항목만 버립니다. 던지지 않습니다.
 */
export function parseAudioManifest(text: string | null): AudioTimingTable | null {
  void text;
  return null;
}

/** 맞출 길이 - `speechEndMs`가 있고 `durationMs` 이하면 그것, 아니면 `durationMs`. 항목이 없으면 `null`. */
export function audioSyncLengthMs(timing: AudioTiming | null): number | null {
  void timing;
  return null;
}
