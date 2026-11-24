// 스냅샷의 백그라운드 작업. 요청이 pending 행을 만든 뒤(`companion_media_begin`) 여기서 만들고 `companion_media_finish`로 닫는다.
//
// 스냅샷(lab `run_snapshot` · `run_one`과 같은 순서):
//   기준 이미지 읽기 + 프롬프트 노드(Haiku, 안전 판단 포함)를 동시에 → 이미지 엔진 1회(엔진 오류만 한 번 다시, 거절은 다시 하지 않는다)
//   → (검사 노드를 켰거나 성인이 아닐 때) 검사 노드(Haiku 비전) → Storage에 올리고 complete. 차단 · 검사 탈락은 blocked, 오류는 failed — 둘 다 예약 해제.
//   검사에 떨어진 그림은 올리지 않는다. 검사 노드는 성인에게만 기본으로 끈다(`env.snapshotCheck`, ADR-0152) — 미성년자 · 나이 모름은
//   늘 돈다. 끄면 안전은 프롬프트 노드의 판단과 이미지 엔진 자체의 거절이 맡고, 동일성 · 깨진 글자 · 학습자 얼굴은 보지 않는다(`meta.check = "skipped"`).
// 그릴 것을 정하는 앞 단계(v1 프롬프트 노드 · v2m 장면 설계, ADR-0179)는 `companion-media-snapshot-plan.ts`.
// 음성은 `companion-media-voice.ts`, 같이 쓰는 닫기 · 재시도는 `companion-media-job.ts`. 엔진 스위치(complexity · 중간 그림 · 기준 그림)는 env.
//
// 시간 예산(`companion-media-budget.ts`): 단계마다 남은 예산에서 뒤 단계 몫을 남긴 만큼만 기다리고, 모자라면 시도하지 않고 그 단계 실패로 닫는다.
// 쓴 제한 시간은 `meta.timeouts`에, 단계마다 실제로 걸린 시간은 `meta.timings`(ms)에 남는다(운영 진단). `refs` · `prompt`는 동시에 돌아
// 둘의 합이 아니라 큰 쪽이 벽시계 시간이다. `image`는 다시 시도까지 합친 시간, 실패한 단계도 걸린 만큼 남는다.
//
// 던지지 않는다. 예상 못 한 오류도 failed로 닫는다. 닫기(RPC)마저 실패하면 행은 pending으로 남고 시간 초과 정리가 예약을 푼다.

import { claudeTool, EngineError, type Image, uploadMedia } from "./companion-media-engines.ts";
import type { MediaEnv } from "./companion-media-env.ts";
import { openaiImageEdit } from "./companion-media-openai.ts";
import { snapshotPreview } from "./companion-media-preview.ts";
import { SNAPSHOT_PHASES } from "./companion-media-budget.ts";
import {
  type Aspect,
  promptHash,
  SIZES,
  type SnapshotPrompt,
  type SnapshotVerdict,
  verdictFrom,
} from "./companion-snapshot-prompts.ts";
import { type StoredPlan, type V2Verdict, v2VerdictFrom } from "./companion-snapshot-v2.ts";
import {
  checkRequest,
  planV1,
  planV2,
  prepareV2,
  recordOutfitCandidate,
  type SnapshotJob,
} from "./companion-media-snapshot-plan.ts";
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

export type { SnapshotJob } from "./companion-media-snapshot-plan.ts";

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
  const timings: Record<string, number> = {};
  const timed = async <T>(name: string, work: () => Promise<T>): Promise<T> => {
    const from = deps.nowMs();
    try {
      return await work();
    } finally {
      timings[name] = deps.nowMs() - from;
    }
  };
  const usage: Record<string, unknown> = {};
  const meta: Record<string, unknown> = {
    aiGenerated: true,
    engine: "openai-images-edit",
    model: job.engine,
    quality: job.quality,
    nodeModel: env.snapshotModel,
    snapshotSelf: job.snapshotSelf,
    refsMode: env.snapshotRefs,
    complexity: env.snapshotComplexity,
    partialImages: env.snapshotPartialImages,
    usage,
    timeouts,
    timings,
  };
  const preview = snapshotPreview(deps, env, job, timings);
  const done = async (status: Status, result: Result) => {
    await preview.clear();
    return finish(deps, env, kind, job.mediaId, status, {
      ...result,
      meta: { ...meta, ms: deps.nowMs() - started },
    });
  };

  try {
    if (env.anthropicKey === null || env.openaiKey === null) {
      return await done("failed", { failure: "engine_failed", error: "keys missing" });
    }
    // v2m(ADR-0179): 스위치가 켜졌고(시험 계정만이면 시험 계정이고) 그 인물의 묶음이 있으면 장면 설계로. 아니면 아래 v1 그대로.
    const v2 =
      env.snapshotPipeline === "v1" ? null : await prepareV2(deps, env, job, phase, timed, meta);
    let refs: Image[];
    let prompt: SnapshotPrompt | StoredPlan;
    let aspect: Aspect;
    let text: string;
    if (v2 !== null) {
      const drawn = await planV2(deps, env, job, v2, phase, timed, usage);
      if ("failure" in drawn) return await done("failed", drawn);
      ({ refs, prompt, aspect, text } = drawn);
    } else {
      const drawn = await planV1(deps, env, job, phase, timed, usage);
      if ("failure" in drawn) return await done("failed", drawn);
      ({ refs, prompt, aspect, text } = drawn);
    }
    const size = SIZES[aspect];
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

    // 2. 이미지 엔진 — 한 번. 엔진 오류만, 예산이 남으면 한 번 다시. 중간 그림은 미리보기로 올린다(덤 — 실패해도 계속).
    let png: Uint8Array;
    preview.start();
    const imageTimeouts: number[] = [];
    timeouts["image"] = imageTimeouts;
    try {
      const drawn = await timed("image", () =>
        withRetry(
          (timeout) => {
            imageTimeouts.push(timeout);
            return openaiImageEdit(
              deps.fetch,
              env.openaiKey!,
              {
                model: job.engine,
                refs,
                prompt: text,
                size,
                quality: job.quality,
                complexity: env.snapshotComplexity,
                partialImages: env.snapshotPartialImages,
                onPartial: preview.onPartial,
              },
              timeout,
            );
          },
          () => budget.timeoutFor(SNAPSHOT_PHASES.image, deps.imageTimeoutMs),
        ),
      );
      png = drawn.value.png;
      usage["image"] = drawn.value.usage;
      meta["partials"] = drawn.value.partials;
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

    // 3. 검사 노드 — 켰을 때 또는 미성년자 · 나이 모름이면 늘, 기준 이미지 첫 장과 나란히.
    let verdict: SnapshotVerdict | V2Verdict | null = null;
    if (!env.snapshotCheck && job.ageBand === "adult") {
      meta["check"] = "skipped";
    } else {
      try {
        const timeout = phase("check", deps.textTimeoutMs);
        const call = await timed("check", () =>
          claudeTool(
            deps.fetch,
            env.anthropicKey!,
            env.snapshotModel,
            checkRequest(job, v2, refs[0]!, png, prompt),
            timeout,
          ),
        );
        usage["check"] = call.usage;
        verdict = v2 === null ? verdictFrom(call.input) : v2VerdictFrom(call.input);
      } catch (error) {
        return await done("failed", {
          failure: "check_error",
          prompt,
          aspect,
          error: short(error),
        });
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
    }

    // 4. 저장(PNG 그대로 — C2PA 보존)
    const path = `${job.userId}/${job.mediaId}.png`;
    try {
      const timeout = phase("upload", deps.storageTimeoutMs);
      await timed("upload", () => uploadMedia(deps.fetch, env, path, png, "image/png", timeout));
    } catch (error) {
      return await done("failed", {
        failure: "storage_failed",
        prompt,
        verdict,
        aspect,
        error: short(error),
      });
    }
    if (v2 !== null) await recordOutfitCandidate(deps, env, job, prompt as StoredPlan);
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
