// 턴 뒤 작업: 장기 메모리 추출(M3)과 대화 요약(단기 메모리). 스트림이 끝난 뒤 `waitUntil`로 돌고, 실패해도 턴에는 영향이 없다.
// 같은 작업이 두 번 돌아도 결과가 같다 — 기억은 원본 메시지마다 한 번, 요약은 덮어쓰기(API §2.2).
// [제안] pgmq 큐 대신 턴 끝에서 바로 돈다. 작업이 무거워지거나 재시도가 필요해지면 `companion-job-worker`로 옮긴다.

import type { ChatSendEnv, CompanionLlm, HistoryEntry, Segment } from "./chat-send.contract.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { callRpc } from "./companion-rpc.ts";

export type AfterTurnInput = {
  readonly userId: string;
  readonly characterId: string;
  readonly conversationId: string;
  readonly userMessageId: string;
  readonly userText: string;
  readonly reply: string;
  readonly memoryEnabled: boolean;
  readonly minor: boolean;
  readonly existingMemories: readonly string[];
  readonly historyLimit: number;
};

/** `companion_add_memories`의 반환(마이그레이션 20261117) — 넣은 수 · 상한에 닿아 지운 수 · 모두 유저가 고친 기억이라 못 넣은 수. */
export type AddedMemories = { added: number; evicted: number; skipped: number; full: boolean };

type SummarySource = {
  summary: string | null;
  until: string;
  messages: { role: "user" | "assistant"; text: string | null; segments: Segment[] }[];
} | null;

export async function runAfterTurn(
  outbound: Outbound,
  env: ChatSendEnv,
  llm: CompanionLlm,
  input: AfterTurnInput,
  timeoutMs: number,
): Promise<{ memories: number; evicted: number; memoryFull: boolean; summarized: boolean }> {
  let added: AddedMemories = { added: 0, evicted: 0, skipped: 0, full: false };
  // 미국 12 ~ 15세 · 미국 나이 모름은 추출 자체를 돌리지 않는다(PRD §3.9).
  if (input.memoryEnabled) {
    const items = await llm.extractMemories({
      userText: input.userText,
      reply: input.reply,
      existing: input.existingMemories,
      minor: input.minor,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (items.length > 0) {
      added = await callRpc<AddedMemories>(outbound, env, "companion_add_memories", {
        p_user_id: input.userId,
        p_character_id: input.characterId,
        p_source_message_id: input.userMessageId,
        p_items: items,
      });
    }
  }

  const source = await callRpc<SummarySource>(outbound, env, "companion_summary_source", {
    p_conversation_id: input.conversationId,
    p_keep: input.historyLimit,
  });
  const memories = { memories: added.added, evicted: added.evicted, memoryFull: added.full };
  if (source === null) return { ...memories, summarized: false };
  const messages = source.messages.flatMap((entry): HistoryEntry[] =>
    entry.role === "user"
      ? entry.text === null
        ? []
        : [{ role: "user", text: entry.text }]
      : [{ role: "assistant", segments: entry.segments }],
  );
  const summary = await llm.summarize({
    previous: source.summary,
    messages,
    signal: AbortSignal.timeout(timeoutMs),
  });
  await callRpc(outbound, env, "companion_save_summary", {
    p_conversation_id: input.conversationId,
    p_summary: summary,
    p_until: source.until,
  });
  return { ...memories, summarized: true };
}
