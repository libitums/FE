// 음성 정보 파일(audio/manifest.json)의 해석입니다 - 순수 함수만 두어 두 스레드에 실려도 안전합니다.
import { contentAudioPathOf } from "./content-audio";

/** 음성 정보 파일의 스키마 이름입니다. 이 값과 정확히 같을 때만 읽습니다. */
export const AUDIO_MANIFEST_SCHEMA = "audio-manifest-1";
/** 버킷 기준 상대 경로입니다. */
export const AUDIO_MANIFEST_PATH = "audio/manifest.json";

/** 음성 하나의 길이(ms) - 둘 다 양의 정수입니다. `speechEndMs`는 말소리가 끝나는 때(끝 무음 앞)입니다. */
export type AudioTiming = { readonly durationMs: number; readonly speechEndMs?: number };
/** 음성 id(`u01-water/pre-3`) → 길이. */
export type AudioTimingTable = ReadonlyMap<string, AudioTiming>;

const AUDIO_DIR_PREFIX = "audio/";

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** 항목 하나 - 값이 하나라도 틀리면 `null`(반쪽 항목을 살리지 않습니다). */
function timingOf(value: unknown): AudioTiming | null {
  if (!isRecord(value) || !isPositiveInt(value.duration_ms)) return null;
  const speechEnd = value.speech_end_ms;
  if (speechEnd === undefined) return { durationMs: value.duration_ms };
  return isPositiveInt(speechEnd)
    ? { durationMs: value.duration_ms, speechEndMs: speechEnd }
    : null;
}

/**
 * 원문을 표로 바꿉니다. JSON이 아니거나 스키마가 다르거나 `audio`가 객체가 아니면 `null`(파일을 쓰지 않음),
 * id 규약 밖 키 · 값이 양의 정수가 아닌 항목은 그 항목만 버립니다. 던지지 않습니다.
 */
export function parseAudioManifest(text: string | null): AudioTimingTable | null {
  if (text === null) return null;
  const root = parseJson(text);
  if (!isRecord(root) || root.schema !== AUDIO_MANIFEST_SCHEMA || !isRecord(root.audio)) {
    return null;
  }
  const table = new Map<string, AudioTiming>();
  for (const key of Object.keys(root.audio)) {
    if (key.startsWith(AUDIO_DIR_PREFIX) || contentAudioPathOf(key) === null) continue;
    const timing = timingOf(root.audio[key]);
    if (timing !== null) table.set(key, timing);
  }
  return table;
}

/** 맞출 길이 - `speechEndMs`가 있고 `durationMs` 이하면 그것, 아니면 `durationMs`. 항목이 없으면 `null`. */
export function audioSyncLengthMs(timing: AudioTiming | null): number | null {
  if (timing === null) return null;
  const { durationMs, speechEndMs } = timing;
  return speechEndMs !== undefined && speechEndMs <= durationMs ? speechEndMs : durationMs;
}
