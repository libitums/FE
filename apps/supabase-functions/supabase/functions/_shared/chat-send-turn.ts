// 턴 하나의 스트림(API §2.1 판정 12 ~ 15 · §4 순서 규칙). 핸들러가 판정 · 예약 · 유저 메시지 저장을 끝낸 뒤 부릅니다.
//
// 입력 검사 · 메인 답변 · 피드백(M2)을 동시에 시작합니다. 피드백은 답이 나가도 되는 것이 확인된 뒤(성인은 입력 검사 뒤,
// 미성년자 · 나이 모름은 출력 검사 뒤) 준비되는 대로 `correction`으로 보내고, `done` 전에는 반드시 한 번 보냅니다.
// 저장(finish)이 친밀도 → 말투(M3)와 크레딧 확정/해제(M4)까지 한 트랜잭션으로 하고, 그 결과로 `state` · `done`을 씁니다.

import type {
  AgeBand,
  BegunTurn,
  ChatSendDeps,
  ChatSendEnv,
  CompanionLlm,
  Feedback,
  GateResult,
  LearningContext,
  ModerationVerdict,
  PersonaCard,
} from "./chat-send.contract.ts";
import type { Sink } from "./chat-send-http.ts";
import { defaultLlmTimeoutMs, historyFrom, startFeedback, startReply } from "./chat-send-reply.ts";
import type { AfterTurnInput } from "./companion-after-turn.ts";
import { chooseBranch, nextTopicState, topicStateFrom } from "./companion-branching.ts";
import {
  CONTRACT_VERSION,
  STREAM_ERRORS,
  type ChatSendRequest,
  type SpeechLevel,
  type StreamErrorCode,
} from "./companion-contract/index.ts";
import { systemSplit } from "./companion-llm.ts";
import { companionSystemPrompt } from "./companion-prompt.ts";
import { callRpc } from "./companion-rpc.ts";
import { crisisResourcesFor } from "./companion-safety.ts";
import { segmentsToPlain, type SegmentDelta } from "./companion-segments.ts";

export type TurnContext = {
  deps: ChatSendDeps;
  env: ChatSendEnv;
  llm: CompanionLlm;
  sink: Sink;
  body: ChatSendRequest;
  userId: string;
  gate: Extract<GateResult, { result: "ok" }>;
  turn: BegunTurn;
  learning: LearningContext;
  assistantMessageId: string;
  playground: boolean;
  historyLimit: number;
};

type ModerationRecord = {
  layer: "input" | "output_sync";
  category: string;
  action: "allow" | "block" | "crisis";
};
type Finished = {
  speechLevel: SpeechLevel;
  speechLevelChanged: boolean;
  creditsSpent: number;
  balance: number | null;
};

export async function runTurn(
  context: TurnContext,
): Promise<{ outcome: string; afterTurn: AfterTurnInput | null }> {
  const { deps, env, llm, sink, body, gate, turn } = context;
  const ageBand: AgeBand = gate.ageBand;
  const moderation: ModerationRecord[] = [];
  const persona: PersonaCard = turn.persona ?? { name: body.character_id };
  const topicState = topicStateFrom(turn.topicState);
  const branch = chooseBranch(topicState, {
    userText: body.text,
    persona,
    expressions: context.learning.expressions,
    random: deps.random ?? Math.random,
  });
  const prompt = companionSystemPrompt({
    persona,
    speechLevel: turn.speechLevel,
    ageBand,
    l1: gate.l1,
    expressions: context.learning.expressions,
    summary: turn.summary,
    feedbackMode: gate.feedbackMode,
    memories: turn.memories.map((memory) => memory.content),
    directive: branch.directive,
  });
  const done = (finished: Finished) =>
    sink.send({
      event: "done",
      data: {
        assistantMessageId: context.assistantMessageId,
        creditsSpent: finished.creditsSpent,
        balance: finished.balance,
      },
    });

  const finish = (
    status: "complete" | "blocked" | "crisis" | "failed",
    assistant: Record<string, unknown> | null,
    extra: { feedback?: Feedback; intimacyDelta?: number; topicState?: unknown } = {},
  ) =>
    callRpc<Finished>(deps.outbound, env, "companion_finish_turn", {
      p_user_message_id: turn.userMessageId,
      p_status: status,
      p_assistant: assistant,
      p_moderation: moderation,
      p_notices: status === "failed" ? [] : gate.notices,
      p_now: new Date(deps.nowMs()).toISOString(),
      p_feedback: extra.feedback ?? null,
      p_intimacy_delta: extra.intimacyDelta ?? 0,
      p_topic_state: extra.topicState ?? null,
      p_hold_id: turn.holdId,
    });
  const fail = async (code: StreamErrorCode, status: "blocked" | "failed") => {
    abort.abort();
    sink.send({ event: "error", data: { code, retryable: STREAM_ERRORS[code].retryable } });
    try {
      await finish(status, null);
    } catch {
      // 저장 실패는 정리 작업(오래된 pending · 열린 예약)이 푼다.
    }
    return { outcome: code, afterTurn: null };
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
  const feedback = startFeedback(context, abort);
  let correctionSent = false;
  const sendCorrection = (value: Feedback) => {
    if (correctionSent) return;
    correctionSent = true;
    sink.send({ event: "correction", data: { userMessageId: turn.userMessageId, ...value } });
  };

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
    return fail("upstream_unavailable", "failed");
  }
  moderation.push({ layer: "input", category: input.category, action: input.action });

  if (input.action === "crisis") {
    abort.abort();
    sink.send({
      event: "crisis",
      data: crisisResourcesFor(body.client_region ?? gate.region ?? null),
    });
    const finished = await finish("crisis", {
      id: context.assistantMessageId,
      origin: "crisis",
      segments: [],
      meta: { ageBand },
    });
    done(finished);
    return { outcome: "crisis", afterTurn: null };
  }
  if (input.action === "block") return fail("guardrail_blocked", "blocked");

  const sendDelta = (delta: SegmentDelta) => sink.send({ event: "delta", data: delta });
  // 성인은 받는 대로(사후 검사 작업은 아직 없다), 미성년자 · 나이 모름은 출력 검사 뒤에.
  if (ageBand === "adult") {
    reply.goLive(sendDelta);
    void feedback.then(sendCorrection);
  }

  let result: Awaited<typeof reply.done>;
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

  const feedbackResult = await feedback;
  sendCorrection(feedbackResult);

  let finished: Finished;
  try {
    finished = await finish(
      "complete",
      {
        id: context.assistantMessageId,
        origin: "turn",
        segments: result.segments,
        meta: {
          model: llm.model,
          ageBand,
          firstDeltaMs: result.firstDeltaMs,
          totalMs: result.totalMs,
          expressions: context.learning.expressions.map((entry) => entry.id),
          branch: branch.action,
          turnState: result.state,
          feedbackMode: gate.feedbackMode,
          trial: turn.trial,
          playground: context.playground,
        },
      },
      {
        feedback: feedbackResult,
        intimacyDelta: result.state?.intimacyDelta ?? 0,
        topicState: nextTopicState(topicState, {
          userText: body.text,
          turnState: result.state,
          action: branch.action,
        }),
      },
    );
  } catch {
    sink.send({ event: "error", data: { code: "internal_error", retryable: true } });
    return { outcome: "internal_error", afterTurn: null };
  }
  sink.send({
    event: "state",
    data: { speechLevel: finished.speechLevel, speechLevelChanged: finished.speechLevelChanged },
  });
  done(finished);
  return {
    outcome: "complete",
    afterTurn: {
      userId: context.userId,
      characterId: body.character_id,
      conversationId: turn.conversationId,
      userMessageId: turn.userMessageId,
      userText: body.text,
      reply: segmentsToPlain(result.segments),
      memoryEnabled: gate.memoryEnabled,
      minor: ageBand !== "adult",
      existingMemories: turn.memories.map((memory) => memory.content),
      historyLimit: context.historyLimit,
    },
  };
}
