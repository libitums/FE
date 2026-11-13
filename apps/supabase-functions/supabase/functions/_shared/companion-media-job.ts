// 스냅샷 · 음성 백그라운드 작업이 같이 쓰는 것: 의존성 · 닫기(`companion_media_finish`) · 엔진 오류 재시도.

import type { SnapshotPrompt, SnapshotVerdict, Aspect } from "./companion-snapshot-prompts.ts";
import { EngineError, type Fetch } from "./companion-media-engines.ts";
import type { MediaEnv } from "./companion-media-env.ts";
import { callRpc } from "./companion-rpc.ts";
import type { Outbound } from "./delete-account.contract.ts";

/** 엔진 오류에 다시 하는 횟수(lab: 한 번). */
export const engineRetries = 1;
export const defaultImageTimeoutMs = 300_000;
export const defaultTextTimeoutMs = 90_000;
export const defaultStorageTimeoutMs = 30_000;

export type MediaRunDeps = {
  readonly fetch: Fetch;
  readonly outbound: Outbound;
  readonly nowMs: () => number;
  readonly log: (entry: {
    event: "companion_media";
    kind: string;
    status: string;
    outcome?: string;
  }) => void;
  readonly imageTimeoutMs?: number;
  readonly textTimeoutMs?: number;
  readonly storageTimeoutMs?: number;
};

export type Status = "complete" | "blocked" | "failed";
export type Result = {
  path?: string;
  mime?: string;
  bytes?: number;
  aspect?: Aspect | null;
  prompt?: SnapshotPrompt | null;
  verdict?: SnapshotVerdict | null;
  meta?: Record<string, unknown>;
  failure?: string;
  error?: string;
};

export async function finish(
  deps: MediaRunDeps,
  env: MediaEnv,
  kind: string,
  mediaId: string,
  status: Status,
  result: Result,
): Promise<void> {
  const args = {
    p_media_id: mediaId,
    p_status: status,
    p_result: result,
    p_now: new Date(deps.nowMs()).toISOString(),
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await callRpc(deps.outbound, env, "companion_media_finish", args);
      deps.log({
        event: "companion_media",
        kind,
        status,
        ...(result.failure ? { outcome: result.failure } : {}),
      });
      return;
    } catch {
      // 한 번 더. 그래도 안 되면 시간 초과 정리가 예약을 푼다.
    }
  }
  deps.log({ event: "companion_media", kind, status: "finish_failed", outcome: status });
}

/** 엔진 호출을 엔진 오류일 때만 한 번 다시 한다. 거절 · 다시 할 수 없는 오류는 바로 던진다. */
export async function withRetry<T>(call: () => Promise<T>): Promise<{ value: T; retries: number }> {
  let retries = 0;
  for (;;) {
    try {
      return { value: await call(), retries };
    } catch (error) {
      if (!(error instanceof EngineError) || !error.retryable || retries >= engineRetries) {
        throw Object.assign(error as Error, { retries });
      }
      retries += 1;
    }
  }
}

export const short = (error: unknown) => String((error as Error)?.message ?? error).slice(0, 300);
