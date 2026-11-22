// 미션 턴(`mission-turn.ts`)의 부품 — 교정 · 목표 판정 시작과 턴의 저장(`companion_mission_finish_turn`). 줄 수 때문에 나눴다.

import type { Feedback } from "./chat-send.contract.ts";
import type { MissionEndReason } from "./companion-contract/index.ts";
import { defaultFeedbackTimeoutMs, historyFrom } from "./chat-send-reply.ts";
import { emptyFeedback } from "./companion-llm-prompts.ts";
import { callRpc } from "./companion-rpc.ts";
import { missionBrief, missionFeedbackRequest, transcriptFromHistory } from "./mission-context.ts";
import { missionJudgeTimeoutMs } from "./mission-env.ts";
import { judgedGoals, judgeUser } from "./mission-judge.ts";
import { farewellsOf, guardMissionFeedback, stripFarewells } from "./mission-guards.ts";
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
 * 판이 열려 있는 턴의 작별 인사 거르기(ADR-0177 D13). 판정(없으면 상태 줄)으로 모든 목표가 끝나는 턴이면 그대로.
 * 인사 문장을 빼고, 말이 하나도 안 남으면 `again()`으로 한 번만 다시 만들어 같은 거르기를 한다 — 그래도 말이 안 남으면 처음 답 그대로.
 */
export async function settleFarewell<T extends ReplyResult>(
  context: MissionTurnContext,
  result: T,
  judged: JudgeOutcome,
  again: () => Promise<T | null>,
): Promise<{ result: T; outcome: "kept" | "stripped" | "retried" | "unchanged" }> {
  const { mission, progress } = context;
  // 판이 이 턴에 끝나는가는 판정(없으면 답의 상태 줄 goals_done)으로 본다 — 답의 closing은 믿지 않는다(QA: Haiku가 선택 목표가 남았는데
  // closing을 켜고 인사함).
  const reported =
    (result.stateText === null ? null : parseMissionState(result.stateText))?.goalsDone ?? [];
  const now = judged === null ? reported : judged.goals;
  if (allGoalsDone(mission, [...progress.goalsDone, ...now]))
    return { result, outcome: "unchanged" };
  const first = stripFarewells(result.segments, farewellsOf(mission));
  if (!first.stripped) return { result, outcome: "unchanged" };
  if (first.speechLeft)
    return { result: { ...result, segments: first.segments }, outcome: "stripped" };
  const retry = await again().catch(() => null);
  if (retry === null) return { result, outcome: "kept" };
  const second = stripFarewells(retry.segments, farewellsOf(mission));
  if (!second.speechLeft) return { result, outcome: "kept" };
  return { result: { ...retry, segments: second.segments }, outcome: "retried" };
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
