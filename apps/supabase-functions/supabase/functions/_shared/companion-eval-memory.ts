// `companion-eval`의 기억 추출(`kind: "memory"`, ADR-0210). 운영 묶음(`runMemoryBatch`)처럼 대화와 기존 기억을 주고 추출 모델이 고른
// 작업을 돌려준다 — DB에 적용하지 않는다. 작업마다 쓰기 규칙을 어긴 곳(`memoryProblems`)을 붙인다.
//
// 케이스: `history`(앞 대화, `picked`는 칩을 그대로 고른 유저 말) + `text`(마지막 유저 말) · `memories`(기존 기억, m1 …) · `localDate` ·
// `ageBand`(성인이 아니면 미성년 규칙). 마지막 유저 말을 칩으로 하려면 `history` 끝에 넣고 `text`는 짧은 직접 입력으로 둔다.

import type { CompanionLlm, HistoryEntry, MemoryOp } from "./chat-send.contract.ts";
import type { EvalCase } from "./companion-eval-schema.ts";
import { memoryProblems } from "./companion-memory-prompts.ts";

export type MemoryEvalOutput = {
  readonly ops: readonly (MemoryOp & { readonly problems: readonly string[] })[];
  /** 규칙을 어긴 작업 수. */
  readonly problems: number;
};

export async function evalMemory(
  llm: CompanionLlm,
  item: EvalCase,
  signal: AbortSignal,
): Promise<MemoryEvalOutput> {
  const messages: HistoryEntry[] = [
    ...(item.history ?? []).map((entry): HistoryEntry =>
      entry.role === "user"
        ? entry.picked
          ? { role: "user", text: entry.text, picked: true }
          : { role: "user", text: entry.text }
        : { role: "assistant", segments: [{ kind: "speech", text: entry.text }] },
    ),
    { role: "user", text: item.text },
  ];
  const ops = await llm.extractMemories({
    messages,
    existing: (item.memories ?? []).map((content, index) => ({
      ref: `m${index + 1}`,
      content,
      shared: false,
      locked: false,
    })),
    ...(item.localDate ? { localDate: item.localDate } : {}),
    minor: (item.ageBand ?? "adult") !== "adult",
    signal,
  });
  const checked = ops.map((op) => ({
    ...op,
    problems: op.op === "forget" ? [] : memoryProblems(op.content),
  }));
  return { ops: checked, problems: checked.filter((op) => op.problems.length > 0).length };
}
