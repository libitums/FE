// 미션 턴 하나의 스트림(ADR-0160, PRD §3.4). `mission-turn-handler.ts`가 판 확인 · 학습자 메시지 저장을 끝낸 뒤 부릅니다.
//
// 1단계 턴(`chat-send-turn.ts`)의 부품을 그대로 씁니다 — 입력 검사(`moderateInput`) · 답 생성(`startReply`) · 출력 검사와 다시 만들기
// (`outputChecker` · `recoverReply`) · 번역(`startTranslation`). 시스템 프롬프트는 미션 전용(`missionSystemPrompt`)이고, 상태 줄은 미션
// 모양(`parseMissionState`)으로 읽습니다. 추천 답변 칩 · 기억 추출 · 이야기 · 학습 삽입 지시 · 친밀도는 없습니다.
// 출력 검사는 지금의 나이 규칙 그대로 — 성인은 받는 대로, 미성년자 · 나이 모름은 검사 뒤에 한꺼번에.
// 저장(`companion_mission_finish_turn`)이 돌려준 판 상태가 진실이고 `mission` 이벤트는 그 값으로 씁니다. 코어 `advanceMission`은 대조용입니다.
// 이벤트: start → notice* → delta* → correction → translation* → mission → done(creditsSpent 0). 위기면 crisis → done.

import type {
  ChatSendDeps,
  ChatSendEnv,
  CompanionLlm,
  Feedback,
  ModerationVerdict,
  Segment,
} from "./chat-send.contract.ts";
import type { ModerationRecord, TurnStatusName } from "./chat-send-finish.ts";
import type { Sink } from "./chat-send-http.ts";
import {
  defaultFeedbackTimeoutMs,
  historyFrom,
  moderateInput,
  startReply,
} from "./chat-send-reply.ts";
import { applyTranslation, startTranslation, translationContext } from "./chat-send-translate.ts";
import { outputChecker, recoverReply } from "./chat-send-turn-recover.ts";
import {
  CONTRACT_VERSION,
  STREAM_ERRORS,
  type MissionTurnRequest,
  type StreamErrorCode,
} from "./companion-contract/index.ts";
import { systemSplit } from "./companion-llm.ts";
import { emptyFeedback } from "./companion-llm-prompts.ts";
import { callRpc } from "./companion-rpc.ts";
import { crisisResourcesFor } from "./companion-safety.ts";
import type { SegmentDelta } from "./companion-segments.ts";
import { withUsageMeta, type UsageCollector } from "./companion-usage.ts";
import { missionFeedbackRequest } from "./mission-context.ts";
import { missionCounterpartBase, type MissionDefinition } from "./mission-definition.ts";
import { type DbMissionState } from "./mission-http.ts";
import { missionSystemPrompt } from "./mission-prompt.ts";
import type { MissionBeginRow } from "./mission-turn-row.ts";
import { advanceMission, parseMissionState, type MissionProgress } from "./mission-state.ts";

/** 입력 검사에 걸린 미션 턴의 고정 안내 — 미션에는 「성격대로 거절」이 없다. 장면 밖 말이 아니게 짧게 둔다. */
export const missionBlockedLine =
  "죄송하지만 그 말씀에는 답할 수 없어요. 하던 이야기로 돌아갈까요?";

export type MissionTurnContext = {
  readonly deps: ChatSendDeps;
  readonly env: ChatSendEnv;
  readonly llm: CompanionLlm;
  readonly sink: Sink;
  readonly body: MissionTurnRequest;
  readonly userId: string;
  readonly row: MissionBeginRow;
  readonly mission: MissionDefinition;
  /** 이번 턴 앞의 판 상태(DB 값을 코어 모양으로). */
  readonly progress: MissionProgress;
  readonly assistantMessageId: string;
  readonly playground: boolean;
  readonly usage: UsageCollector;
};

type FinishRow = {
  readonly result: "ok";
  readonly state: DbMissionState;
  readonly newlyDone: readonly string[];
  readonly ended: "goals" | "turn_limit" | null;
};

/** 교정 — 1단계와 같은 프롬프트 · 제한 시간, 상대는 미션의 호칭과 역할. 실패 · 시간 초과는 `unavailable`. */
function startMissionFeedback(context: MissionTurnContext, abort: AbortController) {
  const { deps, llm, body, mission, row } = context;
  const timeoutMs = deps.feedbackTimeoutMs ?? defaultFeedbackTimeoutMs;
  const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(timeoutMs)]);
  const unavailable = emptyFeedback("unavailable", body.text);
  const request = missionFeedbackRequest(mission, {
    text: body.text,
    l1: row.profile.l1,
    history: historyFrom(row),
    signal,
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    llm.feedback(request).catch(() => unavailable),
    new Promise<Feedback>((resolve) => {
      timer = setTimeout(() => resolve(unavailable), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

export async function runMissionTurn(context: MissionTurnContext): Promise<string> {
  const { deps, env, llm, sink, body, row, mission } = context;
  const ageBand = row.profile.ageBand;
  const moderation: ModerationRecord[] = [];
  const withUsage = (assistant: Record<string, unknown>) => withUsageMeta(assistant, context.usage);
  const finish = (
    status: TurnStatusName,
    assistant: Record<string, unknown> | null,
    extra: { feedback?: Feedback; mission?: unknown } = {},
  ) =>
    callRpcFinish(context, {
      p_user_message_id: row.userMessageId,
      p_status: status,
      p_assistant: assistant,
      p_moderation: moderation,
      p_notices: status === "failed" ? [] : row.notices,
      p_feedback: extra.feedback ?? null,
      p_mission: extra.mission ?? null,
    });
  const sendMission = (state: DbMissionState, ended: FinishRow["ended"]) =>
    sink.send({
      event: "mission",
      data: {
        conversationId: row.conversationId,
        goals: state.goals.map(({ id, done }) => ({ id, done })),
        turnsLeft: state.turnsLeft,
        ended,
      },
    });
  const done = () =>
    sink.send({
      event: "done",
      data: { assistantMessageId: context.assistantMessageId, creditsSpent: 0, balance: null },
    });
  const abort = new AbortController();
  const fail = async (code: StreamErrorCode, status: "blocked" | "failed") => {
    abort.abort();
    sink.send({ event: "error", data: { code, retryable: STREAM_ERRORS[code].retryable } });
    await finish(status, null).catch(() => undefined);
    return code;
  };

  sink.send({
    event: "start",
    data: {
      contractVersion: CONTRACT_VERSION,
      conversationId: row.conversationId,
      userMessageId: row.userMessageId,
      assistantMessageId: context.assistantMessageId,
      speechLevel: "polite",
    },
  });
  for (const kind of row.notices) sink.send({ event: "notice", data: { kind } });

  const history = historyFrom(row);
  const prompt = missionSystemPrompt({
    mission,
    progress: context.progress,
    l1: row.profile.l1,
    expressions: row.learning.expressions,
    base: missionCounterpartBase(mission, row.persona),
  });
  const system = `${prompt.stable}${systemSplit}${prompt.dynamic}`;
  let reply = startReply(context, history, system, abort);
  const feedback = startMissionFeedback(context, abort);
  let correctionSent = false;
  const sendCorrection = (value: Feedback) => {
    if (correctionSent) return;
    correctionSent = true;
    sink.send({ event: "correction", data: { userMessageId: row.userMessageId, ...value } });
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
      data: crisisResourcesFor(body.client_region ?? row.profile.region ?? null),
    });
    const meta = { ageBand, playground: context.playground };
    await finish("crisis", withUsage({ id: context.assistantMessageId, segments: [], meta }));
    done();
    return "crisis";
  }
  if (input.action === "block") {
    abort.abort();
    const segments: Segment[] = [{ kind: "speech", text: missionBlockedLine }];
    sink.send({ event: "delta", data: { segment: 0, kind: "speech", text: missionBlockedLine } });
    const meta = { blocked: input.category, ageBand, playground: context.playground };
    const saved = await finish("blocked", { id: context.assistantMessageId, segments, meta });
    sendMission(saved.state, saved.ended);
    done();
    return "blocked";
  }

  const sendDelta = (delta: SegmentDelta) => sink.send({ event: "delta", data: delta });
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
  const translate = (segments: readonly Segment[]) =>
    startTranslation(
      llm,
      env,
      {
        segments: [...segments],
        l1: row.profile.l1,
        timeoutMs: deps.translationTimeoutMs,
        context: translationContext([...history, { role: "user", text: body.text }]),
        persona: { name: mission.counterpart.label },
      },
      abort.signal,
    );
  let translation = translate(result.segments);
  let recovered: string | null = null;
  if (ageBand !== "adult") {
    const check = outputChecker({ deps, llm, body, gate: { ageBand } }, moderation);
    let output: ModerationVerdict;
    try {
      output = await check(result.segments);
    } catch {
      return fail("upstream_unavailable", "failed");
    }
    if (output.action !== "allow") {
      const again = await recoverReply(
        { deps, llm, body, gate: { ageBand } },
        { history, system, abort, check, category: output.category },
      );
      if (again === null) return fail("guardrail_blocked", "blocked");
      ({ reply, result } = again);
      recovered = output.category;
      translation = translate(result.segments);
    }
    reply.goLive(sendDelta);
  }

  const [feedbackResult, translated] = await Promise.all([feedback, translation]);
  sendCorrection(feedbackResult);
  const segments = applyTranslation(sink, deps.log, result.segments, translated);
  const turnState = result.stateText === null ? null : parseMissionState(result.stateText);
  const stateLine = result.stateText === null ? "missing" : turnState === null ? "broken" : "ok";
  const expected = advanceMission(mission, context.progress, turnState);
  let saved: FinishRow;
  try {
    saved = await finish(
      "complete",
      withUsage({
        id: context.assistantMessageId,
        segments,
        meta: {
          model: llm.model,
          ageBand,
          firstDeltaMs: result.firstDeltaMs,
          totalMs: result.totalMs,
          missionState: turnState,
          stateLine,
          translation: translated.status,
          playground: context.playground,
          ...(recovered === null ? {} : { guardrailRecovered: { category: recovered } }),
        },
      }),
      {
        feedback: feedbackResult,
        mission:
          turnState === null
            ? null
            : {
                goals_done: turnState.goalsDone,
                off_task: turnState.offTask,
                closing: turnState.closing,
              },
      },
    );
  } catch {
    sink.send({ event: "error", data: { code: "internal_error", retryable: true } });
    return "internal_error";
  }
  // SQL이 진실 — 코어 전이와 어긋나면 로그만 남긴다.
  const savedDone = saved.state.goals.filter((goal) => goal.done).map((goal) => goal.id);
  if (
    saved.ended !== expected.ended ||
    savedDone.join(",") !== expected.progress.goalsDone.join(",")
  )
    deps.log({ event: "chat_send", status: "stream", outcome: "mission_state_mismatch" });
  sendMission(saved.state, saved.ended);
  done();
  return `complete state=${stateLine}${saved.ended === null ? "" : ` ended=${saved.ended}`}`;
}

async function callRpcFinish(
  context: MissionTurnContext,
  args: Record<string, unknown>,
): Promise<FinishRow> {
  const row = await callRpc<FinishRow | { result: string }>(
    context.deps.outbound,
    context.env,
    "companion_mission_finish_turn",
    { p_user_id: context.userId, ...args, p_now: new Date(context.deps.nowMs()).toISOString() },
  );
  if (row.result !== "ok") throw new Error(`mission finish ${row.result}`);
  return row as FinishRow;
}
