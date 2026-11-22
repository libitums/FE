// 미션 턴(`mission-turn.ts`)의 부품 — 교정 · 목표 판정 시작과 턴의 저장(`companion_mission_finish_turn`). 줄 수 때문에 나눴다.

import type { Feedback } from "./chat-send.contract.ts";
import type { MissionEndReason } from "./companion-contract/index.ts";
import { defaultFeedbackTimeoutMs, historyFrom } from "./chat-send-reply.ts";
import { emptyFeedback } from "./companion-llm-prompts.ts";
import { callRpc } from "./companion-rpc.ts";
import { missionBrief, missionFeedbackRequest, transcriptFromHistory } from "./mission-context.ts";
import { missionJudgeTimeoutMs } from "./mission-env.ts";
import { judgedGoals, judgeUser } from "./mission-judge.ts";
import { guardMissionFeedback } from "./mission-guards.ts";
import { cleanReply, fallbackLineOf, stripMonologue } from "./mission-reply-clean.ts";
import { allGoalsDone, parseMissionState } from "./mission-state.ts";
import type { Segment } from "./chat-send.contract.ts";
import type { DbMissionState } from "./mission-http.ts";
import type { MissionTurnContext } from "./mission-turn-row.ts";

export type FinishRow = {
  readonly result: "ok";
  readonly state: DbMissionState;
  readonly newlyDone: readonly string[];
  readonly ended: MissionEndReason | null;
};

/** 교정 — 1단계와 같은 프롬프트 · 제한 시간, 상대는 미션의 호칭과 역할. 실패 · 시간 초과는 `unavailable`. */
export function startMissionFeedback(context: MissionTurnContext, abort: AbortController) {
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
  ])
    .then((value) => {
      // 원문에 없는 한자 · 가나 등이 든 교정은 버린다(ADR-0177 D13 — 「마실게요」 → 「마实 할게요」).
      const guarded = guardMissionFeedback(value, body.text);
      if (guarded.dropped.length > 0)
        deps.log({
          event: "chat_send",
          status: "stream",
          outcome: "mission_feedback_foreign_script",
        });
      else if (guarded.reason !== undefined)
        deps.log({
          event: "chat_send",
          status: "stream",
          outcome: `mission_feedback_${guarded.reason}`,
        });
      return guarded.feedback;
    })
    .finally(() => clearTimeout(timer));
}

type ReplyResult = {
  readonly segments: Segment[];
  readonly stateText: string | null;
  readonly firstDeltaMs: number | null;
  readonly totalMs: number;
};

/**
 * 답 다듬기(ADR-0177 D13 · D14, `mission-reply-clean.ts`) — 혼잣말 · 작별 인사 · 대신 묻기를 거른다. 이 턴에 판이 끝나는가는 판정(없으면
 * 답의 상태 줄 goals_done)으로 본다 — 답의 closing은 믿지 않는다. 말이 하나도 안 남으면 `again()`으로 한 번만 다시 만들어 같은 거르기,
 * 그래도 안 남으면 혼잣말 탓이면 미션의 안전한 한 줄, 아니면 처음 답(혼잣말만 뺀 것) 그대로.
 */
export async function settleReply<T extends ReplyResult>(
  context: MissionTurnContext,
  result: T,
  judged: JudgeOutcome,
  again: () => Promise<T | null>,
): Promise<{ result: T; outcome: string }> {
  const { mission, progress } = context;
  const endsFor = (value: T) => {
    const reported =
      (value.stateText === null ? null : parseMissionState(value.stateText))?.goalsDone ?? [];
    return allGoalsDone(mission, [
      ...progress.goalsDone,
      ...(judged === null ? reported : judged.goals),
    ]);
  };
  const clean = (value: T) =>
    cleanReply(mission, progress.goalsDone, value.segments, endsFor(value));
  const first = clean(result);
  if (first.issues.length === 0) return { result, outcome: "unchanged" };
  if (first.speechLeft)
    return { result: { ...result, segments: first.segments }, outcome: first.issues.join("+") };
  const retry = await again().catch(() => null);
  const second = retry === null ? null : clean(retry);
  if (retry !== null && second !== null && second.speechLeft)
    return {
      result: { ...retry, segments: second.segments },
      outcome: `retried:${first.issues.join("+")}`,
    };
  if (first.issues.includes("monologue"))
    return {
      result: { ...result, segments: [{ kind: "speech", text: fallbackLineOf(mission) }] },
      outcome: "fallback",
    };
  return {
    result: { ...result, segments: stripMonologue(result.segments).segments },
    outcome: "kept",
  };
}

export async function callRpcFinish(
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

/** 판정 결과 — 성공이면 이번에 이룬 목표(빈 목록 가능)와 off_task, 실패 · 시간 초과 · 판정 계층 없음이면 null. */
export type JudgeOutcome = { readonly goals: readonly string[]; readonly offTask: boolean } | null;

/**
 * 목표 판정(`mission-judge.ts`) — 답 · 교정과 병렬로 시작한다. 실패해도 턴은 이어진다(null → 답의 상태 줄로 돌아감).
 * 판정은 학습자 말만 보면 되므로 답을 기다리지 않는다.
 */
export function startMissionJudge(
  context: MissionTurnContext,
  abort: AbortController,
): Promise<JudgeOutcome> {
  const { llm, body, mission, row, progress } = context;
  const judge = llm.judgeMission;
  if (judge === undefined) return Promise.resolve(null);
  const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(missionJudgeTimeoutMs)]);
  const user = judgeUser({
    mission,
    brief: missionBrief(mission),
    goalsDone: progress.goalsDone,
    history: transcriptFromHistory(historyFrom(row)),
    text: body.text,
  });
  return judge
    .call(llm, { user, signal })
    .then((draft) => ({
      goals: judgedGoals(mission, progress.goalsDone, draft),
      offTask: draft.off_task,
    }))
    .catch(() => null);
}

/**
 * 저장할 상태 줄(`p_mission`) — 판정이 있으면 목표는 판정, 없으면 답의 자기 보고(`goalSource`). closing · off_task는 답의 상태 줄.
 * 답의 상태 줄이 없고 판정도 없으면 null(진척 없음 — 지금과 같다).
 */
export function missionTurnPayload(
  priorDone: readonly string[],
  turnState: { goalsDone: readonly string[]; offTask: boolean; closing: boolean } | null,
  judged: JudgeOutcome,
) {
  if (turnState === null && judged === null) return null;
  return {
    goals_done:
      judged === null ? [...(turnState?.goalsDone ?? [])] : [...priorDone, ...judged.goals],
    off_task: turnState?.offTask ?? judged?.offTask ?? false,
    closing: turnState?.closing ?? false,
  };
}
