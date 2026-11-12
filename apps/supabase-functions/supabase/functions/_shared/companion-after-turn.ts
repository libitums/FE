// 턴 뒤 작업: 장기 메모리 추출(M3)과 대화 요약(단기 메모리). 스트림이 끝난 뒤 `waitUntil`로 돌고, 실패해도 턴에는 영향이 없다.
// 같은 작업이 두 번 돌아도 결과가 같다 — 기억은 원본 메시지마다 한 번, 요약은 덮어쓰기(API §2.2).
// 기억은 턴마다가 아니라 유저 메시지가 `settings.memory_every`개 모일 때 묶어서 뽑는다(마이그레이션 20261120). 최근 메시지는 어차피
// 지난 대화로 답 모델에 들어가므로 이 캐릭터와의 대화에는 잃는 것이 없고, 다른 캐릭터가 공유 기억을 받는 때만 몇 턴 늦어진다 —
// 묶음이 차기 전에 대화가 멈추면 예약 작업이 마저 뽑는다(`companion-memory-flush.ts`, 20261123).
// [제안] pgmq 큐 대신 턴 끝에서 바로 돈다. 작업이 무거워지거나 재시도가 필요해지면 `companion-job-worker`로 옮긴다.

import type { ChatSendEnv, CompanionLlm } from "./chat-send.contract.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { callRpc } from "./companion-rpc.ts";
import {
  type MemoryBatchInput,
  type MemoryBatchResult,
  runMemoryBatch,
  type StoredMessage,
  toHistory,
} from "./companion-memory.ts";

export type AfterTurnInput = Omit<MemoryBatchInput, "flush"> & {
  /** 요약 뒤에도 남기는 최근 메시지 수. */
  readonly historyKeep: number;
};

type SummarySource = {
  summary: string | null;
  until: string;
  messages: StoredMessage[];
} | null;

export async function runAfterTurn(
  outbound: Outbound,
  env: ChatSendEnv,
  llm: CompanionLlm,
  input: AfterTurnInput,
  timeoutMs: number,
): Promise<MemoryBatchResult & { summarized: boolean }> {
  const memories = await runMemoryBatch(outbound, env, llm, input, timeoutMs);
  const source = await callRpc<SummarySource>(outbound, env, "companion_summary_source", {
    p_conversation_id: input.conversationId,
    p_keep: input.historyKeep,
  });
  if (source === null) return { ...memories, summarized: false };
  const summary = await llm.summarize({
    previous: source.summary,
    messages: toHistory(source.messages),
    signal: AbortSignal.timeout(timeoutMs),
  });
  await callRpc(outbound, env, "companion_save_summary", {
    p_conversation_id: input.conversationId,
    p_summary: summary,
    p_until: source.until,
  });
  return { ...memories, summarized: true };
}
