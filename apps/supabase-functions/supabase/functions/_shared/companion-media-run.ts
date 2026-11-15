// 스냅샷의 백그라운드 작업. 요청이 pending 행을 만든 뒤(`companion_media_begin`) 여기서 만들고 `companion_media_finish`로 닫는다.
//
// 스냅샷(lab `run_snapshot` · `run_one`과 같은 순서):
//   기준 이미지 읽기 → 프롬프트 노드(Haiku, 안전 판단 포함) → 이미지 엔진 1회(엔진 오류만 한 번 다시, 거절은 다시 하지 않는다)
//   → 검사 노드(Haiku 비전) → 통과한 것만 Storage에 올리고 complete. 차단 · 검사 탈락은 blocked, 오류는 failed — 둘 다 예약 해제.
//   검사에 떨어진 그림은 올리지 않는다(유저에게 보이지 않을 그림을 남기지 않는다).
// 음성은 `companion-media-voice.ts`, 같이 쓰는 닫기 · 재시도는 `companion-media-job.ts`.
//
// 시간 예산(`companion-media-budget.ts`): 단계마다 남은 예산에서 뒤 단계 몫을 남긴 만큼만 기다리고, 모자라면 시도하지 않고 그 단계 실패로 닫는다.
// 쓴 제한 시간은 `meta.timeouts`에 남는다(운영 진단).
//
// 던지지 않는다. 예상 못 한 오류도 failed로 닫는다. 닫기(RPC)마저 실패하면 행은 pending으로 남고 시간 초과 정리가 예약을 푼다.

import type { Segment } from "./chat-send.contract.ts";
import type { SnapshotSelf } from "./companion-contract/index.ts";
import {
  claudeTool,
  downloadRef,
  EngineError,
  type Image,
  imageBlock,
  openaiImageEdit,
  uploadMedia,
} from "./companion-media-engines.ts";
import type { MediaEnv } from "./companion-media-env.ts";
import { SNAPSHOT_PHASES } from "./companion-media-budget.ts";
import {
  type Aspect,
  CHECK_TOOL,
  checkSystem,
  type ContextLine,
  imagePrompt,
  PROMPT_TOOL,
  promptContent,
  promptHash,
  promptSystem,
  SIZES,
  type SnapshotPrompt,
  snapshotPromptFrom,
  type SnapshotVerdict,
  verdictFrom,
} from "./companion-snapshot-prompts.ts";
import {
  budgetExhausted,
  budgetFor,
  finish,
  type MediaRunDeps,
  type Result,
  short,
  type Status,
  withRetry,
} from "./companion-media-job.ts";

export type SnapshotJob = {
  readonly mediaId: string;
  readonly userId: string;
  readonly characterId: string;
  readonly characterName: string;
  readonly look: string;
  readonly ageBand: "adult" | "minor" | "unknown";
  readonly snapshotSelf: SnapshotSelf;
  readonly segments: readonly Segment[];
  readonly context: readonly ContextLine[];
  readonly refs: readonly string[];
  readonly engine: string;
  readonly quality: string;
  /** 설정 `snapshot_aspect`: 3:2 · 1:1 고정, auto면 프롬프트 노드가 고른다. */
  readonly aspect: Aspect | "auto";
};

export async function runSnapshot(
  deps: MediaRunDeps,
  env: MediaEnv,
  job: SnapshotJob,
): Promise<void> {
  const kind = "snapshot";
  const started = deps.nowMs();
  const budget = budgetFor(deps);
  const timeouts: Record<string, number | number[]> = {};
  const phase = (name: keyof typeof SNAPSHOT_PHASES, capMs?: number) => {
    const timeout = budget.timeoutFor(SNAPSHOT_PHASES[name], capMs);
    if (timeout === null) throw budgetExhausted();
    timeouts[name] = timeout;
    return timeout;
  };
  const usage: Record<string, unknown> = {};
  const meta: Record<string, unknown> = {
    aiGenerated: true,
    engine: "openai-images-edit",
    model: job.engine,
    quality: job.quality,
    nodeModel: env.snapshotModel,
    snapshotSelf: job.snapshotSelf,
    usage,
    timeouts,
  };
  const done = (status: Status, result: Result) =>
    finish(deps, env, kind, job.mediaId, status, {
      ...result,
      meta: { ...meta, ms: deps.nowMs() - started },
    });

  try {
    if (env.anthropicKey === null || env.openaiKey === null) {
      return await done("failed", { failure: "engine_failed", error: "keys missing" });
    }
    let refs: Image[];
    try {
      const timeout = phase("refs", deps.storageTimeoutMs);
      refs = await Promise.all(
        job.refs.slice(0, 4).map((name) => downloadRef(deps.fetch, env, name, timeout)),
      );
    } catch (error) {
      return await done("failed", { failure: "refs_missing", error: short(error) });
    }

    // 1. 프롬프트 노드
    let prompt: SnapshotPrompt | null;
    try {
      const timeout = phase("prompt", deps.textTimeoutMs);
      const call = await claudeTool(
        deps.fetch,
        env.anthropicKey,
        env.snapshotModel,
        {
          system: promptSystem(job.ageBand),
          tool: PROMPT_TOOL,
          content: promptContent(job),
          maxTokens: 1024,
        },
        timeout,
      );
      usage["prompt"] = call.usage;
      prompt = snapshotPromptFrom(call.input);
    } catch (error) {
      return await done("failed", { failure: "prompt_failed", error: short(error) });
    }
    if (prompt === null)
      return await done("failed", { failure: "prompt_failed", error: "bad prompt shape" });
    const aspect: Aspect = job.aspect === "auto" ? prompt.aspect : job.aspect;
    const size = SIZES[aspect];
    const text = imagePrompt(prompt, job.snapshotSelf);
    meta["size"] = size;
    meta["promptHash"] = await promptHash(text);
    if (prompt.safety === "block") {
      return await done("blocked", {
        failure: "prompt_blocked",
        prompt,
        aspect,
        error: `prompt node: ${prompt.reason}`.slice(0, 300),
      });
    }

    // 2. 이미지 엔진 — 한 번. 엔진 오류만, 예산이 남으면 한 번 다시.
    let png: Uint8Array;
    const imageTimeouts: number[] = [];
    timeouts["image"] = imageTimeouts;
    try {
      const drawn = await withRetry(
        (timeout) => {
          imageTimeouts.push(timeout);
          return openaiImageEdit(
            deps.fetch,
            env.openaiKey!,
            { model: job.engine, refs, prompt: text, size, quality: job.quality },
            timeout,
          );
        },
        () => budget.timeoutFor(SNAPSHOT_PHASES.image, deps.imageTimeoutMs),
      );
      png = drawn.value.png;
      usage["image"] = drawn.value.usage;
      meta["retries"] = drawn.retries;
    } catch (error) {
      meta["retries"] = (error as { retries?: number }).retries ?? 0;
      if (error instanceof EngineError && error.refused) {
        return await done("blocked", {
          failure: "engine_refused",
          prompt,
          aspect,
          error: short(error),
        });
      }
      return await done("failed", {
        failure: "engine_failed",
        prompt,
        aspect,
        error: short(error),
      });
    }

    // 3. 검사 노드 — 기준 이미지 첫 장과 나란히.
    let verdict: SnapshotVerdict | null;
    try {
      const timeout = phase("check", deps.textTimeoutMs);
      const call = await claudeTool(
        deps.fetch,
        env.anthropicKey,
        env.snapshotModel,
        {
          system: checkSystem(job.ageBand),
          tool: CHECK_TOOL,
          content: [
            imageBlock(refs[0]!),
            imageBlock({ bytes: png, mime: "image/png" }),
            { type: "text", text: "Image 1: reference. Image 2: snapshot. Give the verdict." },
          ],
          maxTokens: 600,
        },
        timeout,
      );
      usage["check"] = call.usage;
      verdict = verdictFrom(call.input);
    } catch (error) {
      return await done("failed", { failure: "check_error", prompt, aspect, error: short(error) });
    }
    if (verdict === null)
      return await done("failed", {
        failure: "check_error",
        prompt,
        aspect,
        error: "bad verdict shape",
      });
    if (!verdict.pass)
      return await done("blocked", { failure: "check_failed", prompt, verdict, aspect });

    // 4. 저장(PNG 그대로 — C2PA 보존)
    const path = `${job.userId}/${job.mediaId}.png`;
    try {
      const timeout = phase("upload", deps.storageTimeoutMs);
      await uploadMedia(deps.fetch, env, path, png, "image/png", timeout);
    } catch (error) {
      return await done("failed", {
        failure: "storage_failed",
        prompt,
        verdict,
        aspect,
        error: short(error),
      });
    }
    return await done("complete", {
      path,
      mime: "image/png",
      bytes: png.length,
      aspect,
      prompt,
      verdict,
    });
  } catch (error) {
    return await done("failed", { failure: "engine_failed", error: short(error) });
  }
}
