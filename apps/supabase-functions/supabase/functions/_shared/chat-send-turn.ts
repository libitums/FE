// 턴 하나의 스트림(API §2.1 판정 12 ~ 15 · §4 순서 규칙). 핸들러가 판정과 유저 메시지 저장을 끝낸 뒤 부릅니다.

import type {
  AgeBand,
  BegunTurn,
  ChatSendDeps,
  ChatSendEnv,
  CompanionLlm,
  GateResult,
  LearningContext,
  ModerationVerdict,
  PersonaCard,
  Segment,
} from "./chat-send.contract.ts";
import type { Sink } from "./chat-send-http.ts";
import { defaultLlmTimeoutMs, historyFrom, startReply } from "./chat-send-reply.ts";
import {
  CONTRACT_VERSION,
  STREAM_ERRORS,
  type ChatSendRequest,
  type StreamErrorCode,
} from "./companion-contract/index.ts";
import { systemSplit } from "./companion-llm.ts";
import { companionSystemPrompt } from "./companion-prompt.ts";
import { callRpc } from "./companion-rpc.ts";
import { crisisResourcesFor } from "./companion-safety.ts";
import { segmentsToPlain, type SegmentDelta } from "./companion-segments.ts";

// ------------------------------------------------------------------ 턴

export type TurnContext = {
  deps: ChatSendDeps;
  env: ChatSendEnv;
  llm: CompanionLlm;
  sink: Sink;
  body: ChatSendRequest;
  gate: Extract<GateResult, { result: "ok" }>;
  turn: BegunTurn;
  learning: LearningContext;
  assistantMessageId: string;
  playground: boolean;
};

type ModerationRecord = {
  layer: "input" | "output_sync";
  category: string;
  action: "allow" | "block" | "crisis";
};

export async function runTurn(context: TurnContext): Promise<string> {
  const { deps, env, llm, sink, body, gate, turn } = context;
  const ageBand: AgeBand = gate.ageBand;
  const moderation: ModerationRecord[] = [];
  const persona: PersonaCard = turn.persona ?? { name: body.character_id };
  const prompt = companionSystemPrompt({
    persona,
    speechLevel: turn.speechLevel,
    ageBand,
    l1: gate.l1,
    expressions: context.learning.expressions,
    summary: turn.summary,
  });

  const finish = (
    status: "complete" | "blocked" | "crisis" | "failed",
    assistant: Record<string, unknown> | null,
  ) =>
    callRpc(deps.outbound, env, "companion_finish_turn", {
      p_user_message_id: turn.userMessageId,
      p_status: status,
      p_assistant: assistant,
      p_moderation: moderation,
      p_notices: status === "failed" ? [] : gate.notices,
      p_now: new Date(deps.nowMs()).toISOString(),
    });
  const fail = async (code: StreamErrorCode, status: "blocked" | "failed") => {
    sink.send({ event: "error", data: { code, retryable: STREAM_ERRORS[code].retryable } });
    try {
      await finish(status, null);
    } catch {
      // 저장 실패는 다음 판정에서 오래된 pending으로 풀린다.
    }
    return code;
  };

  sink.send({
    event: "start",
    data: {
      contractVersion: CONTRACT_VERSION,
      conversationId: turn.conversationId,
      userMessageId: turn.userMessageId,
      assistantMessageId: context.assistantMessageId,
      speechLevel: turn.speechLevel,
    },
  });
  for (const kind of gate.notices) sink.send({ event: "notice", data: { kind } });

  const abort = new AbortController();
  const reply = startReply(
    context,
    historyFrom(turn),
    `${prompt.stable}${systemSplit}${prompt.dynamic}`,
    abort,
  );

  let input: ModerationVerdict;
  try {
    input = await llm.moderate({
      layer: "input",
      text: body.text,
      context: null,
      ageBand,
      signal: abort.signal,
    });
  } catch {
    abort.abort();
    return fail("upstream_unavailable", "failed");
  }
  moderation.push({ layer: "input", category: input.category, action: input.action });

  if (input.action === "crisis") {
    abort.abort();
    sink.send({ event: "crisis", data: crisisResourcesFor(body.client_region ?? null) });
    await finish("crisis", {
      id: context.assistantMessageId,
      origin: "crisis",
      segments: [],
      meta: { ageBand },
    });
    sink.send({
      event: "done",
      data: { assistantMessageId: context.assistantMessageId, creditsSpent: 0, balance: null },
    });
    return "crisis";
  }
  if (input.action === "block") {
    abort.abort();
    return fail("guardrail_blocked", "blocked");
  }

  const sendDelta = (delta: SegmentDelta) => sink.send({ event: "delta", data: delta });
  // 성인은 받는 대로(사후 검사는 M1 후처리 작업 — 아직 없음), 미성년자 · 나이 모름은 출력 검사 뒤에.
  if (ageBand === "adult") reply.goLive(sendDelta);

  let result: { segments: Segment[]; firstDeltaMs: number | null; totalMs: number };
  try {
    result = await reply.done;
  } catch {
    return fail("upstream_unavailable", "failed");
  }
  if (result.segments.length === 0) return fail("upstream_unavailable", "failed");

  if (ageBand !== "adult") {
    let output: ModerationVerdict;
    try {
      output = await llm.moderate({
        layer: "output_sync",
        text: segmentsToPlain(result.segments),
        context: body.text,
        ageBand,
        signal: AbortSignal.timeout(deps.llmTimeoutMs ?? defaultLlmTimeoutMs),
      });
    } catch {
      return fail("upstream_unavailable", "failed");
    }
    moderation.push({
      layer: "output_sync",
      category: output.category,
      action: output.action === "allow" ? "allow" : "block",
    });
    if (output.action !== "allow") return fail("guardrail_blocked", "blocked");
    reply.goLive(sendDelta);
  }

  sink.send({ event: "state", data: { speechLevel: turn.speechLevel, speechLevelChanged: false } });
  try {
    await finish("complete", {
      id: context.assistantMessageId,
      origin: "turn",
      segments: result.segments,
      meta: {
        model: llm.model,
        ageBand,
        firstDeltaMs: result.firstDeltaMs,
        totalMs: result.totalMs,
        expressions: context.learning.expressions.map((entry) => entry.id),
        playground: context.playground,
      },
    });
  } catch {
    sink.send({ event: "error", data: { code: "internal_error", retryable: true } });
    return "internal_error";
  }
  sink.send({
    event: "done",
    data: { assistantMessageId: context.assistantMessageId, creditsSpent: 0, balance: null },
  });
  return "complete";
}
