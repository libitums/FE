// 음성 백그라운드 작업: ElevenLabs 1회(엔진 오류만 한 번 다시) → Storage(`<user_id>/<media_id>.mp3`) → complete.
// 던지지 않는다. 예상 못 한 오류도 failed로 닫는다(예약 해제).

import { elevenSpeech, uploadMedia } from "./companion-media-engines.ts";
import type { MediaEnv } from "./companion-media-env.ts";
import {
  defaultStorageTimeoutMs,
  defaultTextTimeoutMs,
  finish,
  type MediaRunDeps,
  type Result,
  short,
  type Status,
  withRetry,
} from "./companion-media-job.ts";

export type VoiceJob = {
  readonly mediaId: string;
  readonly userId: string;
  readonly characterId: string;
  readonly voiceId: string;
  readonly model: string;
  readonly text: string;
};

export async function runVoice(deps: MediaRunDeps, env: MediaEnv, job: VoiceJob): Promise<void> {
  const kind = "voice";
  const started = deps.nowMs();
  const meta: Record<string, unknown> = {
    aiGenerated: true,
    engine: "elevenlabs",
    model: job.model,
    voiceId: job.voiceId,
    chars: job.text.length,
  };
  const done = (status: Status, result: Result) =>
    finish(deps, env, kind, job.mediaId, status, {
      ...result,
      meta: { ...meta, ms: deps.nowMs() - started },
    });
  try {
    if (env.elevenKey === null)
      return await done("failed", { failure: "engine_failed", error: "key missing" });
    let audio: Uint8Array;
    try {
      const spoken = await withRetry(() =>
        elevenSpeech(deps.fetch, env.elevenKey!, job, deps.textTimeoutMs ?? defaultTextTimeoutMs),
      );
      audio = spoken.value;
      meta["retries"] = spoken.retries;
    } catch (error) {
      meta["retries"] = (error as { retries?: number }).retries ?? 0;
      return await done("failed", { failure: "engine_failed", error: short(error) });
    }
    const path = `${job.userId}/${job.mediaId}.mp3`;
    try {
      await uploadMedia(
        deps.fetch,
        env,
        path,
        audio,
        "audio/mpeg",
        deps.storageTimeoutMs ?? defaultStorageTimeoutMs,
      );
    } catch (error) {
      return await done("failed", { failure: "storage_failed", error: short(error) });
    }
    return await done("complete", { path, mime: "audio/mpeg", bytes: audio.length });
  } catch (error) {
    return await done("failed", { failure: "engine_failed", error: short(error) });
  }
}
