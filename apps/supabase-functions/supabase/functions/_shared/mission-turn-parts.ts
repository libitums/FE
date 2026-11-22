// 미션 턴(`mission-turn.ts`)의 부품 — 교정 시작과 턴의 저장(`companion_mission_finish_turn`). 줄 수 때문에 나눴다.

import type { Feedback } from "./chat-send.contract.ts";
import type { MissionEndReason } from "./companion-contract/index.ts";
import { defaultFeedbackTimeoutMs, historyFrom } from "./chat-send-reply.ts";
import { emptyFeedback } from "./companion-llm-prompts.ts";
import { callRpc } from "./companion-rpc.ts";
import { missionFeedbackRequest } from "./mission-context.ts";
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
  ]).finally(() => clearTimeout(timer));
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
