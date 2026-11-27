// `/functions/v1/companion-eval` — 운영과 같은 프롬프트로 LLM 한 단계(입력 · 출력 검사 또는 피드백)만 돌려 보는 평가 창구.
// 서버 키만 받는다(ops-dashboard). DB에 쓰지 않고 크레딧도 쓰지 않는다 — 케이스마다 실제 API 비용만 든다.
//
// GET  → 지금 설정된 모델 · 고를 수 있는 모델 · LLM 종류. `?docs=1`이면 프롬프트 · 캐릭터 · 설정 문서(`companion-eval-docs.ts`).
// POST { kind, model?, judgeModel?, cases[] } → 케이스마다 `moderate()` 판정 · `feedback()` 결과 · `translate()` 한 줄 · `suggest()` 칩 셋 · 학습 표현을 넣은 답(`learning`) ·
// 운영 페르소나로 만든 답장과 그 채점(`reply`, `companion-eval-reply.ts`) · 기억 작업(`memory`, `companion-eval-memory.ts`, DB에 적용하지 않음). 케이스 하나가 실패해도
// 나머지는 돈다. 요청 모양은 턴 경로(`chat-send-turn.ts` · `chat-send-reply.ts`)와 같고, 프롬프트는 `CompanionLlm` 구현 안에 있어 그대로 쓴다.

import type {
  ChatSendEnv,
  ChatSendLogEntry,
  CompanionLlm,
  Feedback,
  ModerationVerdict,
  PersonaCard,
} from "./chat-send.contract.ts";
import { defaultFeedbackTimeoutMs, defaultLlmTimeoutMs } from "./chat-send-reply.ts";
import { defaultTranslationTimeoutMs } from "./chat-send-translate.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { companionDocs } from "./companion-eval-docs.ts";
import { StructuredUnavailable } from "./companion-llm.ts";
import { recentFeedbackHistory } from "./companion-llm-prompts.ts";
import { evalLearning, type LearningEvalOutput } from "./companion-eval-learning.ts";
import { evalMemory, type MemoryEvalOutput } from "./companion-eval-memory.ts";
import { defaultJudgeModel } from "./companion-eval-judge.ts";
import { evalReply, type ReplyEvalOutput, UnsupportedCase } from "./companion-eval-reply.ts";
import { evalSuggestions } from "./companion-eval-suggest.ts";
import type { CandidateRecord } from "./companion-suggest-select.ts";
import type { ReplySuggestion } from "./companion-contract/index.ts";
import { callRpc, isServiceKey } from "./companion-rpc.ts";
import { tierRomanceLine } from "./companion-safety.ts";
import { bodySchema, type EvalCase, type EvalKind, evalModels } from "./companion-eval-schema.ts";

export { evalModels };
import { bearerTokenFrom } from "./supabase-auth.ts";
import { mapLimited } from "./map-limited.ts";

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
  /** 번역 한 번의 제한 시간. 기본은 턴 경로와 같다(넘으면 운영에서는 번역 없이 끝난다). */
  readonly translationTimeoutMs?: number;
  /** 답장 + 채점 한 케이스의 제한 시간(reply). */
  readonly replyEvalTimeoutMs?: number;
  readonly concurrency?: number;
};

/** 답장(45초 안팎)과 채점(더 큰 모델, 생각 깊이 medium)을 합친 한 케이스의 제한 시간. */
export const defaultReplyEvalTimeoutMs = 90_000;

type CaseResult =
  | {
      id: string;
      ok: true;
      output:
        | ModerationVerdict
        | Feedback
        | { text: string }
        | { items: ReplySuggestion[]; candidates: CandidateRecord[] }
        | LearningEvalOutput
        | MemoryEvalOutput
        | ReplyEvalOutput;
      ms: number;
    }
  | { id: string; ok: false; error: string; ms: number };

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

/** 지금 설정된 단계별 모델. fake면 모두 `fake`. */
export function configuredModels(env: ChatSendEnv) {
  if (env.llm.kind === "fake")
    return {
      reply: "fake",
      feedback: "fake",
      moderation: "fake",
      translation: "fake",
      suggest: "fake",
    };
  return {
    reply: env.llm.model,
    feedback: env.llm.feedbackModel,
    moderation: env.llm.moderationModel,
    translation: env.llm.translationModel,
    suggest: env.llm.suggestModel ?? env.llm.moderationModel,
  };
}

class Timeout extends Error {}
class Mismatch extends Error {}

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
  if (error instanceof Mismatch) return "mismatch";
  if (error instanceof UnsupportedCase) return "unsupported_case";
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? `upstream_${status}` : "upstream_error";
}

type ReplyContext = {
  readonly judge: CompanionLlm;
  readonly personas: ReadonlyMap<string, PersonaCard>;
};

function runCase(
  deps: CompanionEvalDeps,
  llm: CompanionLlm,
  kind: EvalKind,
  item: EvalCase,
  reply: ReplyContext | null,
) {
  if (kind === "reply" && reply !== null)
    return withTimeout(deps.replyEvalTimeoutMs ?? defaultReplyEvalTimeoutMs, (signal) =>
      evalReply({
        llm,
        judge: reply.judge,
        item,
        personas: reply.personas,
        signal,
        judgeErrorCode: errorCode,
      }),
    );
  if (kind === "moderation") {
    return withTimeout(deps.llmTimeoutMs ?? defaultLlmTimeoutMs, (signal) =>
      llm.moderate({
        layer: item.layer ?? "input",
        text: item.text,
        context: item.context ?? null,
        ageBand: item.ageBand ?? "adult",
        romanceLine: item.romanceLine ?? tierRomanceLine(item.ageBand ?? "adult", item.romanceTier),
        signal,
      }),
    );
  }
  if (kind === "translation") {
    // 운영은 말풍선 묶음을 한 번에 보낸다. 평가는 한 줄을 대사 조각 하나로 보낸다.
    return withTimeout(deps.translationTimeoutMs ?? defaultTranslationTimeoutMs, async (signal) => {
      const lines = await llm.translate({
        segments: [{ kind: "speech", text: item.text }],
        l1: item.l1 ?? "en",
        signal,
      });
      if (lines.length !== 1) throw new Mismatch();
      return { text: lines[0]! };
    });
  }
  if (kind === "learning")
    return withTimeout(deps.llmTimeoutMs ?? defaultLlmTimeoutMs, (signal) =>
      evalLearning(llm, item, signal),
    );
  // 운영 기억 작업은 턴 뒤에 30초까지 기다린다(`companion-after-turn.ts`).
  if (kind === "memory") return withTimeout(30_000, (signal) => evalMemory(llm, item, signal));
  if (kind === "suggestions")
    return withTimeout(deps.feedbackTimeoutMs ?? defaultFeedbackTimeoutMs, (signal) =>
      evalSuggestions(llm, item, signal),
    );
  return withTimeout(deps.feedbackTimeoutMs ?? defaultFeedbackTimeoutMs, (signal) =>
    llm.feedback({
      text: item.text,
      l1: item.l1 ?? null,
      previous: item.context ?? null,
      history: recentFeedbackHistory(item.history ?? []),
      speechLevel: item.speechLevel ?? null,
      character:
        item.character == null
          ? null
          : {
              name: item.character.name,
              role: item.character.role ?? null,
              banmalFeedback: item.character.banmalFeedback ?? "better",
            },
      signal,
    }),
  );
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
    if (request.method === "GET" && new URL(request.url).searchParams.get("docs") === "1")
      return json(200, await companionDocs(env, deps.outbound, models));
    if (request.method === "GET") {
      // 대시보드가 쓰는 계약 그대로 — 번역 · 추천 칩 모델은 싣지 않는다(문서 화면 `?docs=1`에는 있다).
      const { translation: _translation, suggest: _suggest, ...contractModels } = models;
      return json(200, { models: contractModels, allowed: evalModels, llm: env.llm.kind });
    }

    let raw: unknown;
    try {
      raw = JSON.parse(await request.text());
    } catch {
      return json(400, { error: "invalid_request" });
    }
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return json(400, { error: "invalid_request" });
    const { kind, cases } = parsed.data;
    // 기억 추출은 운영에서 검사 모델로 돈다(`companion-llm.ts`의 extractMemories).
    const step =
      kind === "suggestions"
        ? "suggest"
        : kind === "learning" || kind === "reply"
          ? "reply"
          : kind === "memory"
            ? "moderation"
            : kind;
    const model = parsed.data.model ?? models[step];
    const llm = deps.llmFor(model);
    const judgeModel = kind === "reply" ? (parsed.data.judgeModel ?? defaultJudgeModel) : null;
    // 답장은 운영과 같은 페르소나 카드로 — DB를 못 읽으면(적용 전 · 오류) 케이스의 이름만 쓴다(결과의 `persona: "case"`).
    const reply: ReplyContext | null =
      judgeModel === null
        ? null
        : {
            judge: deps.llmFor(judgeModel),
            personas: new Map(
              (
                (await callRpc<{ id: string; persona: PersonaCard }[]>(
                  deps.outbound,
                  env,
                  "companion_inspect_characters",
                  {},
                ).catch(() => null)) ?? []
              ).map((character) => [character.id, character.persona]),
            ),
          };

    const results = await mapLimited(
      cases,
      deps.concurrency ?? defaultConcurrency,
      async (item): Promise<CaseResult> => {
        const started = deps.nowMs();
        try {
          const output = await runCase(deps, llm, kind, item, reply);
          return { id: item.id, ok: true, output, ms: deps.nowMs() - started };
        } catch (error) {
          return { id: item.id, ok: false, error: errorCode(error), ms: deps.nowMs() - started };
        }
      },
    );
    deps.log({
      event: "companion_eval",
      status: 200,
      outcome: `${kind} ${model}${judgeModel ? ` judge=${judgeModel}` : ""} ok=${results.filter((result) => result.ok).length}/${results.length}`,
    });
    return json(200, judgeModel ? { kind, model, judgeModel, results } : { kind, model, results });
  };
}
