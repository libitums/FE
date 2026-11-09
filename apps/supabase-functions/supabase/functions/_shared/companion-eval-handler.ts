// `/functions/v1/companion-eval` — 운영과 같은 프롬프트로 LLM 한 단계(입력 · 출력 검사 또는 피드백)만 돌려 보는 평가 창구.
// 서버 키만 받는다(ops-dashboard). DB에 쓰지 않고 크레딧도 쓰지 않는다 — 케이스마다 실제 API 비용만 든다.
//
// GET  → 지금 설정된 모델 · 고를 수 있는 모델 · LLM 종류.
// POST { kind, model?, cases[] } → 케이스마다 `moderate()` 판정 또는 `feedback()` 결과. 케이스 하나가 실패해도 나머지는 돈다.
// 요청 모양은 턴 경로(`chat-send-turn.ts` · `chat-send-reply.ts`)와 같고, 프롬프트는 `CompanionLlm` 구현 안에 있어 그대로 쓴다.

import { z } from "zod";

import type {
  ChatSendEnv,
  ChatSendLogEntry,
  CompanionLlm,
  Feedback,
  ModerationVerdict,
} from "./chat-send.contract.ts";
import { defaultFeedbackTimeoutMs, defaultLlmTimeoutMs } from "./chat-send-reply.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { StructuredUnavailable } from "./companion-llm.ts";
import { isServiceKey } from "./companion-rpc.ts";
import { bearerTokenFrom } from "./supabase-auth.ts";

/** 고를 수 있는 모델. 대시보드가 이 목록으로 선택지를 그린다. */
export const evalModels = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"] as const;
const defaultConcurrency = 4;

export type CompanionEvalDeps = {
  readonly env: ChatSendEnv | null;
  readonly outbound: Outbound;
  /** 모든 단계를 주어진 모델로 돌리는 LLM 계층(`companionLlmWithModel`). */
  readonly llmFor: ((model: string) => CompanionLlm) | null;
  readonly nowMs: () => number;
  readonly log: (entry: ChatSendLogEntry) => void;
  /** 검사 한 번의 제한 시간. 기본은 턴 경로와 같다. */
  readonly llmTimeoutMs?: number;
  /** 피드백 한 번의 제한 시간. 기본은 턴 경로와 같다(넘으면 운영에서는 `unavailable`). */
  readonly feedbackTimeoutMs?: number;
  readonly concurrency?: number;
};

const caseSchema = z.object({
  id: z.string().min(1).max(64),
  text: z.string().min(1).max(2000),
  ageBand: z.enum(["adult", "minor", "unknown"]).optional(),
  layer: z.enum(["input", "output_sync"]).optional(),
  l1: z.string().min(1).max(35).nullable().optional(),
  // 검사: 출력 검사 때 앞선 유저 메시지. 피드백: 바로 앞 캐릭터 말.
  context: z.string().max(2000).nullable().optional(),
});
const bodySchema = z.object({
  kind: z.enum(["moderation", "feedback"]),
  model: z.enum(evalModels).optional(),
  cases: z.array(caseSchema).min(1).max(20),
});
type EvalCase = z.infer<typeof caseSchema>;
type EvalKind = z.infer<typeof bodySchema>["kind"];

type CaseResult =
  | { id: string; ok: true; output: ModerationVerdict | Feedback; ms: number }
  | { id: string; ok: false; error: string; ms: number };

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

/** 지금 설정된 단계별 모델. fake면 모두 `fake`. */
export function configuredModels(env: ChatSendEnv) {
  if (env.llm.kind === "fake") return { reply: "fake", feedback: "fake", moderation: "fake" };
  return {
    reply: env.llm.model,
    feedback: env.llm.feedbackModel,
    moderation: env.llm.moderationModel,
  };
}

class Timeout extends Error {}

/** 구현이 신호를 따르지 않아도 제한 시간에 끝나게 타이머와 겨룹니다(`startFeedback`과 같은 방식). */
async function withTimeout<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run(controller.signal),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Timeout());
        }, ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function errorCode(error: unknown): string {
  if (error instanceof Timeout) return "timeout";
  if (error instanceof StructuredUnavailable) return "structured_unavailable";
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? `upstream_${status}` : "upstream_error";
}

function runCase(deps: CompanionEvalDeps, llm: CompanionLlm, kind: EvalKind, item: EvalCase) {
  if (kind === "moderation") {
    return withTimeout(deps.llmTimeoutMs ?? defaultLlmTimeoutMs, (signal) =>
      llm.moderate({
        layer: item.layer ?? "input",
        text: item.text,
        context: item.context ?? null,
        ageBand: item.ageBand ?? "adult",
        signal,
      }),
    );
  }
  return withTimeout(deps.feedbackTimeoutMs ?? defaultFeedbackTimeoutMs, (signal) =>
    llm.feedback({
      text: item.text,
      l1: item.l1 ?? null,
      previous: item.context ?? null,
      signal,
    }),
  );
}

/** 순서를 지키며 동시에 `limit`개까지 돌립니다. */
async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export function createCompanionEvalHandler(
  deps: CompanionEvalDeps,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== "GET" && request.method !== "POST")
      return json(405, { error: "method_not_allowed" }, { Allow: "GET, POST" });
    if (deps.env === null || deps.llmFor === null)
      return json(500, { error: "server_misconfigured" });
    const env = deps.env;
    const token = bearerTokenFrom(request.headers.get("authorization"));
    if (token === null || !(await isServiceKey(deps.outbound, env, token)))
      return json(401, { error: "invalid_session" });

    const models = configuredModels(env);
    if (request.method === "GET")
      return json(200, { models, allowed: evalModels, llm: env.llm.kind });

    let raw: unknown;
    try {
      raw = JSON.parse(await request.text());
    } catch {
      return json(400, { error: "invalid_request" });
    }
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return json(400, { error: "invalid_request" });
    const { kind, cases } = parsed.data;
    const model = parsed.data.model ?? (kind === "feedback" ? models.feedback : models.moderation);
    const llm = deps.llmFor(model);

    const results = await mapLimited(
      cases,
      deps.concurrency ?? defaultConcurrency,
      async (item): Promise<CaseResult> => {
        const started = deps.nowMs();
        try {
          const output = await runCase(deps, llm, kind, item);
          return { id: item.id, ok: true, output, ms: deps.nowMs() - started };
        } catch (error) {
          return { id: item.id, ok: false, error: errorCode(error), ms: deps.nowMs() - started };
        }
      },
    );
    deps.log({
      event: "companion_eval",
      status: 200,
      outcome: `${kind} ${model} ok=${results.filter((result) => result.ok).length}/${results.length}`,
    });
    return json(200, { kind, model, results });
  };
}
