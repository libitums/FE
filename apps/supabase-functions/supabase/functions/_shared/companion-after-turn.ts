// 턴 뒤 작업: 장기 메모리 추출(M3)과 대화 요약(단기 메모리). 스트림이 끝난 뒤 `waitUntil`로 돌고, 실패해도 턴에는 영향이 없다.
// 같은 작업이 두 번 돌아도 결과가 같다 — 기억은 원본 메시지마다 한 번, 요약은 덮어쓰기(API §2.2).
// 기억은 턴마다가 아니라 유저 메시지가 `settings.memory_every`개 모일 때 묶어서 뽑는다(마이그레이션 20261120). 최근 메시지는 어차피
// 지난 대화로 답 모델에 들어가므로 이 캐릭터와의 대화에는 잃는 것이 없고, 다른 캐릭터가 공유 기억을 받는 때만 몇 턴 늦어진다.
// [제안] pgmq 큐 대신 턴 끝에서 바로 돈다. 작업이 무거워지거나 재시도가 필요해지면 `companion-job-worker`로 옮긴다.

import type { ChatSendEnv, CompanionLlm, HistoryEntry, Segment } from "./chat-send.contract.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { callRpc } from "./companion-rpc.ts";

export type AfterTurnInput = {
  readonly userId: string;
  readonly characterId: string;
  readonly conversationId: string;
  readonly memoryEnabled: boolean;
  readonly minor: boolean;
  readonly existingMemories: readonly string[];
  /** 요약 뒤에도 남기는 최근 메시지 수. */
  readonly historyKeep: number;
};

/** `companion_add_memories`의 반환(마이그레이션 20261117) — 넣은 수 · 상한에 닿아 지운 수 · 모두 유저가 고친 기억이라 못 넣은 수. */
export type AddedMemories = { added: number; evicted: number; skipped: number; full: boolean };

/** `companion_memory_source`의 반환 — 아직 묶음이 차지 않았으면 null. */
type MemorySource = {
  until: string;
  sourceMessageId: string;
  messages: StoredMessage[];
} | null;

type StoredMessage = { role: "user" | "assistant"; text: string | null; segments: Segment[] };

/** 기억 묶음 하나에 넣는 메시지 수의 상한(표시가 없는 오래된 대화가 한꺼번에 몰리지 않게). */
const memorySourceLimit = 40;

const toHistory = (messages: readonly StoredMessage[]): HistoryEntry[] =>
  messages.flatMap((entry): HistoryEntry[] =>
    entry.role === "user"
      ? entry.text === null
        ? []
        : [{ role: "user", text: entry.text }]
      : [{ role: "assistant", segments: entry.segments }],
  );

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
): Promise<{
  memories: number;
  evicted: number;
  memoryFull: boolean;
  memoryBatch: boolean;
  summarized: boolean;
}> {
  let added: AddedMemories = { added: 0, evicted: 0, skipped: 0, full: false };
  const batch = await callRpc<MemorySource>(outbound, env, "companion_memory_source", {
    p_conversation_id: input.conversationId,
    p_limit: memorySourceLimit,
  });
  if (batch !== null) {
    // 미국 12 ~ 15세 · 미국 나이 모름은 추출 자체를 돌리지 않는다(PRD §3.9) — 표시만 옮겨 다음 묶음에 다시 들어오지 않게 한다.
    if (input.memoryEnabled) {
      const items = await llm.extractMemories({
        messages: toHistory(batch.messages),
        existing: input.existingMemories,
        minor: input.minor,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (items.length > 0) {
        added = await callRpc<AddedMemories>(outbound, env, "companion_add_memories", {
          p_user_id: input.userId,
          p_character_id: input.characterId,
          p_source_message_id: batch.sourceMessageId,
          p_items: items,
        });
      }
    }
    await callRpc(outbound, env, "companion_mark_memories", {
      p_conversation_id: input.conversationId,
      p_until: batch.until,
    });
  }

  const source = await callRpc<SummarySource>(outbound, env, "companion_summary_source", {
    p_conversation_id: input.conversationId,
    p_keep: input.historyKeep,
  });
  const memories = {
    memories: added.added,
    evicted: added.evicted,
    memoryFull: added.full,
    memoryBatch: batch !== null,
  };
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
