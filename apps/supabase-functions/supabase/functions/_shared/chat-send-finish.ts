// 턴의 끝: 저장(`companion_finish_turn` — 피드백 · 친밀도 → 말투 · 화제 · 제재 · 예약 확정/해제를 한 트랜잭션)과 그 결과로 쓰는
// `state` · `done`. 보통 답 · 위기 · 거절 · 실패가 같은 저장과 같은 끝 이벤트를 쓰게 `chat-send-turn.ts`에서 떼어 둡니다.

import type { BegunTurn, ChatSendDeps, ChatSendEnv, Feedback } from "./chat-send.contract.ts";
import type { Sink } from "./chat-send-http.ts";
import type { AfterTurnInput } from "./companion-after-turn.ts";
import type { RefusalStage, ReplySuggestion, SpeechLevel } from "./companion-contract/index.ts";
import { callRpc } from "./companion-rpc.ts";

/** `companion_turn_status`의 반환 — 턴 시작 때 반복 위반 수(지금 창 안) · 상한, 기억이 가득 찼는지(마이그레이션 20261117). */
export type TurnStatus = {
  readonly strikes: number;
  readonly strikeLimit: number;
  readonly memoryFull: boolean;
};

export type ModerationRecord = {
  layer: "input" | "output_sync";
  category: string;
  action: "allow" | "block" | "crisis";
};

export type Finished = {
  speechLevel: SpeechLevel;
  speechLevelChanged: boolean;
  creditsSpent: number;
  balance: number | null;
};

/** 턴의 결과. `afterTurn`은 스트림을 닫은 뒤의 기억 추출 · 요약, `suggestions`는 그 앞에 저장할 칩(`done`을 늦추지 않게 닫은 뒤 저장). */
export type TurnOutcome = {
  readonly outcome: string;
  readonly afterTurn: AfterTurnInput | null;
  readonly suggestions?: readonly ReplySuggestion[] | null;
};

export type TurnStatusName = "complete" | "blocked" | "crisis" | "failed";

type FinishContext = {
  readonly deps: ChatSendDeps;
  readonly env: ChatSendEnv;
  readonly sink: Sink;
  readonly gate: { readonly notices: readonly string[] };
  readonly turn: Pick<BegunTurn, "userMessageId" | "holdId">;
  readonly assistantMessageId: string;
  readonly status: TurnStatus | null;
};

/** 저장 · `state` · `done`. `moderation`은 턴이 검사 결과를 더해 가는 목록이고 저장 때 그대로 실린다. */
export function turnFinisher(context: FinishContext, moderation: readonly ModerationRecord[]) {
  const { deps, env, sink, gate, turn } = context;
  return {
    finish: (
      status: TurnStatusName,
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
      }),
    /** 기억 가득 참은 턴 시작 때 읽은 값이다 — 읽지 못했으면 싣지 않는다. */
    sendState: (finished: Finished) =>
      sink.send({
        event: "state",
        data: {
          speechLevel: finished.speechLevel,
          speechLevelChanged: finished.speechLevelChanged,
          ...(context.status === null ? {} : { memoryFull: context.status.memoryFull }),
        },
      }),
    done: (finished: Finished, refusal?: RefusalStage) =>
      sink.send({
        event: "done",
        data: {
          assistantMessageId: context.assistantMessageId,
          creditsSpent: finished.creditsSpent,
          balance: finished.balance,
          ...(refusal === undefined ? {} : { refusal: { stage: refusal } }),
        },
      }),
  };
}
