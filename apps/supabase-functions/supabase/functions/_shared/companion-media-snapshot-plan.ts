// 스냅샷 작업(`companion-media-run.ts`)의 앞 단계 — 그릴 것을 정한다. v1은 프롬프트 노드(ADR-0146), v2m은 장면 설계 + 미리 합친
// 기준 그림 한 장(ADR-0179). 새 옷 후보 기록도 여기, 검사 노드 요청은 `companion-media-snapshot-check.ts`. 시간 예산 · 닫기는 부르는 쪽이 한다.

import type { Segment } from "./chat-send.contract.ts";
import type { SnapshotSelf } from "./companion-contract/index.ts";
import { claudeTool, downloadRef, downloadRefJson, type Image } from "./companion-media-engines.ts";
import type { MediaEnv } from "./companion-media-env.ts";
import type { SNAPSHOT_PHASES } from "./companion-media-budget.ts";
import {
  type Aspect,
  type ContextLine,
  imagePrompt,
  messageLine,
  PROMPT_TOOL,
  promptContent,
  promptSystem,
  type SnapshotPrompt,
  snapshotPromptFrom,
} from "./companion-snapshot-prompts.ts";
import {
  bundleDir,
  compose,
  type Manifest,
  manifestFrom,
  mentionedSubjects,
  normalizePlan,
  PLAN_TOOL,
  planContent,
  planSystem,
  type RecentPlan,
  route,
  type RoutedSubject,
  slugFromRefs,
  type StoredPlan,
  suggestion,
} from "./companion-snapshot-v2.ts";
import { callRpc } from "./companion-rpc.ts";
import { type MediaRunDeps, short } from "./companion-media-job.ts";

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

export type PhaseFn = (name: keyof typeof SNAPSHOT_PHASES, capMs?: number) => number;
export type TimedFn = <T>(name: string, work: () => Promise<T>) => Promise<T>;
export type V2Ready = { readonly manifest: Manifest; readonly recent: readonly RecentPlan[] };
export type Drawn<P> = {
  refs: Image[];
  prompt: P;
  aspect: Aspect;
  text: string;
  /** v2m: 인물 그림 뒤에 실제로 붙인 고정 대상(`refs[1..]`과 같은 순서). */
  subjects?: readonly RoutedSubject[];
};
export type Failed = { failure: string; error: string };

/**
 * v2m으로 그릴 수 있는지: 그 인물의 묶음(manifest.json)과 시험 계정 여부 · 최근 계획을 동시에 읽는다. 못 그리면 null(→ v1) — 까닭은
 * `meta.v2`에 남긴다(`no_slug` · `not_tester` · `no_bundle` · `bad_bundle` · `bundle_error` · `context_error`).
 */
export async function prepareV2(
  deps: MediaRunDeps,
  env: MediaEnv,
  job: SnapshotJob,
  phase: PhaseFn,
  timed: TimedFn,
  meta: Record<string, unknown>,
): Promise<V2Ready | null> {
  const fallback = (why: string) => {
    meta["pipeline"] = "v1";
    meta["v2"] = why;
    return null;
  };
  const slug = slugFromRefs(job.refs);
  if (slug === null) return fallback("no_slug");
  const timeout = phase("refs", deps.storageTimeoutMs);
  const [bundle, context] = await timed("v2", () =>
    Promise.allSettled([
      downloadRefJson(deps.fetch, env, `${bundleDir(slug)}/manifest.json`, timeout),
      callRpc<{ tester?: boolean; recent?: unknown[] } | null>(
        deps.outbound,
        env,
        "companion_snapshot_v2_context",
        { p_user_id: job.userId, p_character_id: job.characterId },
      ),
    ]),
  );
  const tester = context.status === "fulfilled" && context.value?.tester === true;
  if (env.snapshotPipeline === "v2m-test" && !tester)
    return fallback(context.status === "rejected" ? "context_error" : "not_tester");
  if (bundle.status === "rejected") return fallback("bundle_error");
  if (bundle.value === null) return fallback("no_bundle");
  const manifest = manifestFrom(bundle.value);
  if (manifest === null) return fallback("bad_bundle");
  const recent =
    context.status === "fulfilled" && Array.isArray(context.value?.recent)
      ? (context.value.recent.filter((p) => typeof p === "object" && p !== null) as RecentPlan[])
      : [];
  meta["pipeline"] = "v2m";
  return { manifest, recent };
}

/**
 * 장면 설계 → 라우팅 → 기준 그림 한 장(+ 고정 대상 그림 2장까지, ADR-0179 D8) → 조립. 실패는 그대로 닫을 결과(failure)로.
 * 대상 그림은 인물 그림과 동시에 `refs` 예산 안에서 받는다. 못 받은 대상은 빼고 그린다(`meta.subjectsMissing`) — 인물 그림만 `refs_missing`.
 */
export async function planV2(
  deps: MediaRunDeps,
  env: MediaEnv,
  job: SnapshotJob,
  v2: V2Ready,
  phase: PhaseFn,
  timed: TimedFn,
  usage: Record<string, unknown>,
  meta: Record<string, unknown>,
): Promise<Drawn<StoredPlan> | Failed> {
  const suggest = suggestion(v2.recent);
  const promptTimeout = phase("prompt", deps.textTimeoutMs);
  let call;
  try {
    call = await timed("prompt", () =>
      claudeTool(
        deps.fetch,
        env.anthropicKey!,
        env.snapshotModel,
        {
          system: planSystem(job.ageBand),
          tool: PLAN_TOOL,
          content: planContent({ ...job, manifest: v2.manifest, recent: v2.recent, suggest }),
          maxTokens: 1024,
        },
        promptTimeout,
      ),
    );
  } catch (error) {
    return { failure: "prompt_failed", error: short(error) };
  }
  usage["prompt"] = call.usage;
  const plan = normalizePlan(call.input, v2.manifest, job.snapshotSelf);
  if (plan === null) return { failure: "prompt_failed", error: "bad plan shape" };
  const routed = route(v2.manifest, plan);
  const stored: StoredPlan = {
    ...plan,
    suggested: suggest,
    outfit_name: routed.outfitName,
    ref: routed.ref,
    figure: v2.manifest.figureKeep,
  };
  if (plan.subjects.length === 0) {
    // 놓친 대상을 재려고 남긴다 — 붙이지는 않는다.
    const mentioned = mentionedSubjects(v2.manifest, messageLine(job.segments));
    if (mentioned.length) meta["subjectsMentioned"] = mentioned;
  }
  const aspect: Aspect = job.aspect === "auto" ? plan.aspect : job.aspect;
  const figure = v2.manifest.figureKeep;
  if (plan.safety === "block")
    return {
      refs: [],
      prompt: stored,
      aspect,
      text: compose(plan, job.snapshotSelf, routed, figure),
    };
  let loaded: PromiseSettledResult<Image>[];
  try {
    const refsTimeout = phase("refs", deps.storageTimeoutMs);
    loaded = await timed("refs", () =>
      Promise.allSettled(
        [routed.ref, ...routed.subjects.map((s) => s.ref)].map((name) =>
          downloadRef(deps.fetch, env, name, refsTimeout),
        ),
      ),
    );
  } catch (error) {
    return { failure: "refs_missing", error: short(error) };
  }
  const [person, ...rest] = loaded;
  if (person!.status === "rejected")
    return { failure: "refs_missing", error: short(person!.reason) };
  const refs = [person!.value];
  const attached: RoutedSubject[] = [];
  const missing: { id: string; error: string }[] = [];
  rest.forEach((result, i) => {
    const subject = routed.subjects[i]!;
    if (result.status === "fulfilled") {
      refs.push(result.value);
      attached.push(subject);
    } else missing.push({ id: subject.id, error: short(result.reason) });
  });
  if (routed.subjects.length) meta["subjects"] = attached.map((s) => s.id);
  if (missing.length) meta["subjectsMissing"] = missing;
  const text = compose(plan, job.snapshotSelf, routed, figure, attached);
  return { refs, prompt: stored, aspect, text, subjects: attached };
}

/** 옷장에 없는 옷을 골랐으면 후보로 기록만 한다(운영 대시보드 크론이 모아 그린다). 실패해도 스냅샷은 그대로 — 던지지 않는다. */
export async function recordOutfitCandidate(
  deps: MediaRunDeps,
  env: MediaEnv,
  job: SnapshotJob,
  plan: StoredPlan,
): Promise<void> {
  if (plan.new_outfit === null || plan.outfit_change === "none") return;
  try {
    await callRpc(deps.outbound, env, "companion_snapshot_outfit_candidate", {
      p_character_id: job.characterId,
      p_name: plan.new_outfit_name,
      p_description: plan.new_outfit,
      p_outfit_change: plan.outfit_change,
      p_media_id: job.mediaId,
    });
  } catch {
    // 후보 기록은 덤이다.
  }
}

/** v1(ADR-0146): 기준 이미지 읽기 + 프롬프트 노드를 동시에 → 이미지 프롬프트. 실패는 그대로 닫을 결과(failure)로. */
export async function planV1(
  deps: MediaRunDeps,
  env: MediaEnv,
  job: SnapshotJob,
  phase: PhaseFn,
  timed: TimedFn,
  usage: Record<string, unknown>,
): Promise<Drawn<SnapshotPrompt> | Failed> {
  // 기준 이미지 읽기와 프롬프트 노드는 서로 기다릴 것이 없어 동시에 돌립니다(프롬프트 노드는 그림이 아니라 대화 글만 봅니다).
  // 제한 시간은 둘 다 시작 전에 정합니다 — 프롬프트 노드 몫은 기준 이미지 단계가 끝난 뒤가 아니라 지금 남은 예산에서 나옵니다.
  const refsTimeout = phase("refs", deps.storageTimeoutMs);
  const promptTimeout = phase("prompt", deps.textTimeoutMs);
  // `sheet`면 표정 시트를 빼고 시트 한 장만(입력 토큰 — 사진 원가의 약 2/3 — 를 줄인다).
  const refNames =
    env.snapshotRefs === "sheet"
      ? job.refs.filter((name) => !name.endsWith("-expressions.png")).slice(0, 1)
      : job.refs.slice(0, 4);
  const [loaded, noded] = await Promise.allSettled([
    timed("refs", () =>
      Promise.all(refNames.map((name) => downloadRef(deps.fetch, env, name, refsTimeout))),
    ),
    timed("prompt", () =>
      claudeTool(
        deps.fetch,
        env.anthropicKey!,
        env.snapshotModel,
        {
          system: promptSystem(job.ageBand),
          tool: PROMPT_TOOL,
          content: promptContent(job),
          maxTokens: 1024,
        },
        promptTimeout,
      ),
    ),
  ]);
  if (noded.status === "fulfilled") usage["prompt"] = noded.value.usage;
  if (loaded.status === "rejected") return { failure: "refs_missing", error: short(loaded.reason) };
  if (noded.status === "rejected") return { failure: "prompt_failed", error: short(noded.reason) };
  const prompt = snapshotPromptFrom(noded.value.input);
  if (prompt === null) return { failure: "prompt_failed", error: "bad prompt shape" };
  const aspect = job.aspect === "auto" ? prompt.aspect : job.aspect;
  return { refs: loaded.value, prompt, aspect, text: imagePrompt(prompt, job.snapshotSelf) };
}
