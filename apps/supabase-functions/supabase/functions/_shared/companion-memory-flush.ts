// 쉬는 대화의 기억 마저 뽑기(마이그레이션 20261123). 기억은 유저 메시지가 `settings.memory_every`개 모일 때 묶어서 뽑아(20261120), 묶음이
// 차기 전에 대화가 멈추면 그 몇 턴은 다음 대화까지 남는다 — 다른 캐릭터가 공유 기억을 늦게 받는다. 예약 작업이 `companion-proactive`에
// `{ mode: "memory_flush", batch }`로 부르면 `settings.memory_flush_idle`(기본 30분) 넘게 조용한 대화를 골라 남은 메시지를 묶음이 차지 않아도
// 뽑는다. 요약은 하지 않는다(요약은 기록 창 밖 메시지만이라 쉬는 동안 바뀔 것이 없다).
//
// 예약: pg_cron + pg_net으로 10분마다(README 「쉬는 대화의 기억」). 서버 키만 받는다.

import type { ChatSendDeps } from "./chat-send.contract.ts";
import { runMemoryBatch } from "./companion-memory.ts";
import { callRpc } from "./companion-rpc.ts";
import { createUsageCollector, usageLine } from "./companion-usage.ts";

/** 대화 하나의 기억 작업 제한 시간 — 턴 뒤 작업과 같다. */
const flushTimeoutMs = 30_000;

type FlushCandidate = {
  userId: string;
  characterId: string;
  conversationId: string;
  memoryEnabled: boolean;
  minor: boolean;
};

export type FlushOutcome = FlushCandidate & {
  /** extracted(작업을 적용했거나 바꿀 것이 없음) · empty(뽑을 메시지가 사라짐) · disabled(장기 메모리 꺼짐 — 표시만 옮김) · failed. */
  result: "extracted" | "empty" | "disabled" | "failed";
  added?: number;
  updated?: number;
  forgotten?: number;
  protected?: number;
  usage?: string;
};

export async function flushIdleMemories(
  deps: ChatSendDeps,
  limit: number,
): Promise<FlushOutcome[]> {
  const env = deps.env!;
  const candidates = await callRpc<FlushCandidate[]>(
    deps.outbound,
    env,
    "companion_memory_flush_candidates",
    { p_now: new Date(deps.nowMs()).toISOString(), p_limit: limit },
  );
  const outcomes: FlushOutcome[] = [];
  for (const candidate of candidates) {
    const usage = createUsageCollector();
    try {
      const result = await runMemoryBatch(
        deps.outbound,
        env,
        deps.llm!.withUsage?.(usage.record) ?? deps.llm!,
        { ...candidate, existingMemories: [], flush: true },
        flushTimeoutMs,
      );
      const line = usageLine(usage.summary());
      outcomes.push({
        ...candidate,
        result: !result.batch ? "empty" : candidate.memoryEnabled ? "extracted" : "disabled",
        added: result.added,
        updated: result.updated,
        forgotten: result.forgotten,
        protected: result.protected,
        ...(line === "" ? {} : { usage: line }),
      });
    } catch {
      outcomes.push({ ...candidate, result: "failed" });
    }
  }
  return outcomes;
}
