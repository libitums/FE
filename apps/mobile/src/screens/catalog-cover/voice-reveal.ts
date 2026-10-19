import { defaultRevealIntervalMs } from "@libitums/ui-lynx/typewriter";

export const VOICE_REVEAL_MIN_INTERVAL_MS: number = defaultRevealIntervalMs;
export const VOICE_REVEAL_MAX_INTERVAL_MS = 300;

/**
 * 맞출 길이(ms)와 대사로 글자(code point) 하나의 간격 - `floor(길이 ÷ 글자 수)`를 [하한, 상한]으로 묶습니다.
 * 길이가 `null` · 비유한 · 0 이하이거나 대사가 비면 기본 간격입니다. 늘 1 이상의 정수 · 던지지 않음.
 */
export function voiceRevealIntervalMs(syncLengthMs: number | null, text: string): number {
  const count = Array.from(text).length;
  if (syncLengthMs === null || !Number.isFinite(syncLengthMs) || syncLengthMs <= 0 || count === 0) {
    return defaultRevealIntervalMs;
  }
  const perChar = Math.floor(syncLengthMs / count);
  return Math.min(VOICE_REVEAL_MAX_INTERVAL_MS, Math.max(VOICE_REVEAL_MIN_INTERVAL_MS, perChar));
}
