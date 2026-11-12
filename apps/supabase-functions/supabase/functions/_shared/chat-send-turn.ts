// 턴 하나의 스트림(API §2.1 판정 12 ~ 15 · §4 순서 규칙). 핸들러가 판정 · 예약 · 유저 메시지 저장을 끝낸 뒤 부릅니다.
// 입력 검사 · 메인 답변 · 피드백을 동시에 시작해, 피드백은 답이 나가도 되는 것이 확인된 뒤 `correction`으로 `done` 전에 한 번 보내고, 답 조각이 다
// 모이면 L1 번역(`chat-send-translate.ts`) · 추천 답변 칩(`chat-send-suggest.ts`, 스위치 켬)을 남은 기다림과 동시에 돌려 `state` 앞에 보냅니다.
// 저장(finish)이 친밀도 → 말투 · 크레딧 확정/해제를 한 트랜잭션으로 하고 그 결과로 `state` · `done`을 씁니다. 입력 검사에 걸리면 반복 위반
// 단계에 따라 성격대로 거절하거나(`chat-send-refusal.ts`) `guardrail_blocked`로 끝냅니다.

import type { AgeBand, Feedback, ModerationVerdict, PersonaCard } from "./chat-send.contract.ts";
import type { TurnContext } from "./chat-send-context.ts";
import {
  type Finished,
  type ModerationRecord,
  type TurnOutcome,
  turnFinisher,
} from "./chat-send-finish.ts";
import { refusalStage } from "./chat-send-refusal.ts";
import { turnRefuser } from "./chat-send-turn-refuse.ts";
import {
  defaultLlmTimeoutMs,
  historyFrom,
  moderateInput,
  skippedFeedback,
  startFeedback,
  startReply,
} from "./chat-send-reply.ts";
import {
  chipTarget,
  learnedTargets,
  learningDay,
  learningOutcome,
  learningSettingsFrom,
  recordTurnLearning,
  resolveLearning,
  withLearnedUse,
} from "./chat-send-learning.ts";
import {
  sendSuggestions,
  startSuggestions,
  suggestionSettings,
  suggestionsMeta,
} from "./chat-send-suggest.ts";
import { applyTranslation, startTranslation, translationContext } from "./chat-send-translate.ts";
import { chooseBranch, nextTopicState, topicStateFrom } from "./companion-branching.ts";
import {
  CONTRACT_VERSION,
  STREAM_ERRORS,
  type StreamErrorCode,
} from "./companion-contract/index.ts";
import { systemSplit } from "./companion-llm.ts";
import { companionSystemPrompt, type PromptInput } from "./companion-prompt.ts";
import { crisisResourcesFor } from "./companion-safety.ts";
import { segmentsToPlain, type SegmentDelta } from "./companion-segments.ts";
import { withUsageMeta } from "./companion-usage.ts";

export type { TurnContext };

export async function runTurn(context: TurnContext): Promise<TurnOutcome> {
  const { deps, env, llm, sink, body, gate, turn } = context;
  const ageBand: AgeBand = gate.ageBand;
  const moderation: ModerationRecord[] = [];
  const persona: PersonaCard = turn.persona ?? { name: body.character_id };
  const topicState = topicStateFrom(turn.topicState);
  const pool = context.learning.expressions;
  const today = learningDay(deps.nowMs());
  const learningSettings = learningSettingsFrom(context.learning);
  const branch = chooseBranch(topicState, {
    userText: body.text,
    persona,
    learning: {
      pool,
      episodes: context.learning.episodes,
      settings: learningSettings,
      manualEmpty: context.learning.scope?.empty === true,
      chipsOn: gate.replySuggestions === true && suggestionSettings(context.status).enabled,
      today,
    },
    random: deps.random ?? Math.random,
  });
  const target = branch.learning.target;
  const promptInput: PromptInput = {
    persona,
    speechLevel: turn.speechLevel,
    ageBand,
    l1: gate.l1,
    expressions: context.learning.expressions,
    summary: turn.summary,
    feedbackMode: gate.feedbackMode,
    memories: turn.memories.map((memory) => memory.content),
    // 이번 턴 지시는 시스템 프롬프트가 아니라 답 요청의 `directive`로 — 시스템 · 지난 대화의 캐시를 깨지 않는다.
    directive: null,
  };
  const prompt = companionSystemPrompt(promptInput);
  const withUsage = (assistant: Record<string, unknown>) => withUsageMeta(assistant, context.usage);
  const finisher = turnFinisher(context, moderation);
  const { finish, sendState, done } = finisher;
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
  // 성격대로 거절 — 걸린 글 대신 분류와 단계만 준 답을 보통 답처럼 보내고 `blocked`로 저장한다(`chat-send-turn-refuse.ts`).
  const refuse = turnRefuser(context, { persona, promptInput, moderation, finisher, withUsage });

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
  const history = historyFrom(turn);
  const reply = startReply(
    context,
    history,
    `${prompt.stable}${systemSplit}${prompt.dynamic}`,
    abort,
    branch.directive,
  );
  // 추천 답변 칩을 그대로 보냈으면 피드백 모델을 부르지 않는다(칩은 이미 자연스러운 문장). 고쳐 보냈거나 직접 입력 · 지난 칩이면 보통처럼.
  const feedback = (
    context.choice.inputSource === "suggestion"
      ? Promise.resolve(skippedFeedback(body.text))
      : startFeedback(context, abort, learnedTargets(pool, topicState))
  ).then((card) => withLearnedUse(card, pool, body.text, context.choice));
  let correctionSent = false;
  const sendCorrection = (value: Feedback) => {
    if (correctionSent) return;
    correctionSent = true;
    sink.send({ event: "correction", data: { userMessageId: turn.userMessageId, ...value } });
  };

  let input: ModerationVerdict;
  try {
    input = await moderateInput(llm, body.text, history, ageBand, abort.signal);
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
    const finished = await finish(
      "crisis",
      withUsage({
        id: context.assistantMessageId,
        origin: "crisis",
        segments: [],
        meta: { ageBand },
      }),
    );
    done(finished);
    return { outcome: "crisis", afterTurn: null };
  }
  if (input.action === "block") {
    const stage = context.status === null ? "block" : refusalStage(context.status);
    if (stage === "block") return fail("guardrail_blocked", "blocked");
    abort.abort();
    return refuse(stage, input.category);
  }

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
  // 번역은 남은 기다림(출력 검사 · 피드백)과 동시에. 검사에 걸리면 `fail`의 abort가 끊고, 걸린 답의 번역은 내보내지 않는다.
  const translation = startTranslation(
    llm,
    env,
    {
      segments: result.segments,
      l1: gate.l1,
      timeoutMs: deps.translationTimeoutMs,
      context: translationContext([...history, { role: "user", text: body.text }]),
      persona,
    },
    abort.signal,
  );
  const chips = startSuggestions(
    context,
    persona,
    result.segments,
    abort.signal,
    chipTarget(target),
  );

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

  const [feedbackResult, translated, suggested] = await Promise.all([feedback, translation, chips]);
  sendCorrection(feedbackResult);
  const segments = applyTranslation(sink, deps.log, result.segments, translated);
  const saved = sendSuggestions(sink, deps.log, context.assistantMessageId, suggested);
  const learningResult = resolveLearning(
    branch.learning,
    result.state,
    segments,
    suggested?.status === "ok" && suggested.targetShown === true,
  );
  const learned = learningOutcome({
    decision: branch.learning,
    result: learningResult,
    feedback: feedbackResult,
  });

  let finished: Finished;
  try {
    finished = await finish(
      "complete",
      withUsage({
        id: context.assistantMessageId,
        origin: "turn",
        segments,
        meta: {
          model: llm.model,
          ageBand,
          firstDeltaMs: result.firstDeltaMs,
          totalMs: result.totalMs,
          branch: branch.action,
          learning: learned.meta,
          turnState: result.state,
          feedbackMode: gate.feedbackMode,
          inputSource: context.choice.inputSource,
          translation: translated.status,
          ...suggestionsMeta(suggested),
          trial: turn.trial,
          playground: context.playground,
        },
      }),
      {
        feedback: feedbackResult,
        intimacyDelta: result.state?.intimacyDelta ?? 0,
        topicState: nextTopicState(topicState, {
          userText: body.text,
          turnState: result.state,
          action: branch.action,
          learning: learningResult,
          today,
          maxSkipStreak: learningSettings.maxSkipStreak,
        }),
      },
    );
    await recordTurnLearning(deps, env, context.userId, learned.events);
  } catch {
    sink.send({ event: "error", data: { code: "internal_error", retryable: true } });
    return { outcome: "internal_error", afterTurn: null };
  }
  sendState(finished);
  done(finished);
  return {
    outcome: "complete",
    suggestions: saved,
    afterTurn: {
      userId: context.userId,
      characterId: body.character_id,
      conversationId: turn.conversationId,
      memoryEnabled: gate.memoryEnabled,
      minor: ageBand !== "adult",
      existingMemories: turn.memories.map((memory) => memory.content),
      historyKeep: context.historyKeep,
    },
  };
}
