// 장기 메모리 묶음 하나 — 원문 받기(`companion_memory_source`) → 추출 모델이 작업 고르기(더하기 · 고치기 · 잊기) → 적용
// (`companion_apply_memory_ops`) → 표시 옮기기(`companion_mark_memories`). 턴 뒤 작업(`companion-after-turn.ts`)과 쉬는 대화의 마저 뽑기
// (`companion-memory-flush.ts`)가 같이 씁니다(마이그레이션 20261123).
//
// 기존 기억은 짧은 번호(m1, m2 …)로 모델에 보이고 여기서 기억 id로 바꿉니다. 유저가 고친 기억(locked)에 대한 작업은 서버가 건드리지
// 않고 `protected`로 셉니다. 옛 DB(기존 기억을 주지 않음)면 턴 맥락의 기억 글만 번호 없이 보여 더하기만 됩니다.

import type { ChatSendEnv, CompanionLlm, HistoryEntry, Segment } from "./chat-send.contract.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { callRpc } from "./companion-rpc.ts";

/** 기억 묶음 하나에 넣는 메시지 수의 상한(표시가 없는 오래된 대화가 한꺼번에 몰리지 않게). */
const memorySourceLimit = 40;

export type StoredMessage = {
  role: "user" | "assistant";
  text: string | null;
  segments: Segment[];
  /** 유저 메시지의 입력 출처(20261122 — `companion_memory_source`만 준다). `suggestion`이면 칩을 그대로 고른 말. */
  inputSource?: string | null;
};

/** `companion_memory_source`의 반환 — 아직 묶음이 차지 않았으면 null. `existing`은 20261123부터. */
type MemorySource = {
  until: string;
  sourceMessageId: string;
  messages: StoredMessage[];
  existing?: { id: string; content: string; shared: boolean; userEdited: boolean }[];
} | null;

/** `companion_apply_memory_ops`의 반환. */
export type AppliedMemories = {
  added: number;
  updated: number;
  forgotten: number;
  evicted: number;
  skipped: number;
  protected: number;
  full: boolean;
};

export type MemoryBatchResult = AppliedMemories & { readonly batch: boolean };

const nothing: AppliedMemories = {
  added: 0,
  updated: 0,
  forgotten: 0,
  evicted: 0,
  skipped: 0,
  protected: 0,
  full: false,
};

export const toHistory = (messages: readonly StoredMessage[]): HistoryEntry[] =>
  messages.flatMap((entry): HistoryEntry[] =>
    entry.role === "user"
      ? entry.text === null
        ? []
        : [
            entry.inputSource === "suggestion"
              ? { role: "user", text: entry.text, picked: true }
              : { role: "user", text: entry.text },
          ]
      : [{ role: "assistant", segments: entry.segments }],
  );

export type MemoryBatchInput = {
  readonly userId: string;
  readonly characterId: string;
  readonly conversationId: string;
  readonly memoryEnabled: boolean;
  readonly minor: boolean;
  /** 옛 DB용 — 원문이 기존 기억을 주지 않으면 이 글만 보인다. */
  readonly existingMemories: readonly string[];
  /** 참이면 묶음이 차지 않아도 뽑는다(쉬는 대화). */
  readonly flush?: boolean;
};

export async function runMemoryBatch(
  outbound: Outbound,
  env: ChatSendEnv,
  llm: CompanionLlm,
  input: MemoryBatchInput,
  timeoutMs: number,
): Promise<MemoryBatchResult> {
  const batch = await callRpc<MemorySource>(outbound, env, "companion_memory_source", {
    p_conversation_id: input.conversationId,
    p_limit: memorySourceLimit,
    ...(input.flush ? { p_flush: true } : {}),
  });
  if (batch === null) return { ...nothing, batch: false };
  let applied = nothing;
  // 미국 12 ~ 15세 · 미국 나이 모름은 추출 자체를 돌리지 않는다(PRD §3.9) — 표시만 옮겨 다음 묶음에 다시 들어오지 않게 한다.
  if (input.memoryEnabled) {
    const known =
      batch.existing ??
      input.existingMemories.map((content) => ({
        id: null,
        content,
        shared: false,
        userEdited: false,
      }));
    const refs = known.map((memory, index) => ({ ...memory, ref: `m${index + 1}` }));
    const ops = await llm.extractMemories({
      messages: toHistory(batch.messages),
      existing: refs.map(({ ref, content, shared, userEdited }) => ({
        ref,
        content,
        shared,
        locked: userEdited,
      })),
      minor: input.minor,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const idOf = new Map(refs.map((memory) => [memory.ref, memory.id]));
    const stored = ops.flatMap((op): Record<string, unknown>[] => {
      if (op.op === "add") return [op];
      const id = idOf.get(op.ref);
      if (id === undefined || id === null) return [];
      return op.op === "update"
        ? [{ op: op.op, id, content: op.content, reason: op.reason }]
        : [{ op: op.op, id, reason: op.reason }];
    });
    if (stored.length > 0)
      applied = await callRpc<AppliedMemories>(outbound, env, "companion_apply_memory_ops", {
        p_user_id: input.userId,
        p_character_id: input.characterId,
        p_source_message_id: batch.sourceMessageId,
        p_ops: stored,
      });
  }
  await callRpc(outbound, env, "companion_mark_memories", {
    p_conversation_id: input.conversationId,
    p_until: batch.until,
  });
  return { ...applied, batch: true };
}

/** 로그 한 줄의 기억 부분. */
export const memoryLine = (result: MemoryBatchResult) =>
  `memory_batch=${result.batch} memories=${result.added} updated=${result.updated} forgotten=${result.forgotten} protected=${result.protected} evicted=${result.evicted} memory_full=${result.full}`;
