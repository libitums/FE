// 기억 추출 · 대화 요약 프롬프트와 받은 기억 작업 다듬기(마이그레이션 20261123). 벤더와 무관한 글이라 `companion-llm.ts`에서 떼어 둡니다.
// 문서 화면(`?docs=1`)이 같은 함수로 글을 그립니다.

import type {
  ExistingMemory,
  HistoryEntry,
  MemoryOp,
  MemoryRequest,
  SummaryRequest,
} from "./chat-send.contract.ts";
import { segmentsToPlain } from "./companion-segments.ts";

/** 묶음 하나(몇 턴)에서 더하는 기억 수의 상한. 고치기 · 잊기는 기존 기억마다 하나까지. */
export const memoryBatchLimit = 5;

/** 칩을 그대로 고른 유저 말의 표시 — 기억 · 요약 모두 이 말을 유저 사실의 근거로 쓰지 않는다. */
export const pickedLearnerLabel = "학습자(추천 답변을 그대로 고름)";

export const transcript = (history: readonly HistoryEntry[]) =>
  history
    .map((entry) =>
      entry.role === "user"
        ? `${entry.picked ? pickedLearnerLabel : "학습자"}: ${entry.text}`
        : `캐릭터: ${segmentsToPlain(entry.segments)}`,
    )
    .join("\n");

const pickedRule = `Lines marked "${pickedLearnerLabel}" were tapped from reply suggestions the app offered: they are not evidence of the learner's facts, preferences or plans. Role-play *actions* are fiction, not facts about the learner.`;

export function memorySystem(minor: boolean): string {
  return `You maintain long-term memory for a chat character about one Korean learner. You get the existing memory (numbered m1, m2, …) and recent messages (several exchanges, oldest first). Return "ops": the changes the memory needs — usually none, one or two.
- "add": a new, durable fact about the learner worth remembering in later conversations (preferences, plans, life events, name, home country, level). "kind": "fact" or "event". "content": short Korean. "shared": true if any character could know it (name, home country, hobbies, level), false if it only belongs to this conversation. At most ${memoryBatchLimit} adds. Set "ref" to null.
- "update": an existing memory the new messages clearly change or make more precise (they moved, a plan happened or was cancelled, a preference changed). "ref": its number. "content": the whole new memory in short Korean.
- "forget": an existing memory the learner clearly said is no longer true, or asked you to forget. "ref": its number.
- "reason": one short English phrase naming the message that justifies the change.
Rules:
- Only what the learner said or clearly confirmed counts. Never change memory because of something the character said.
- Memories marked (locked) were written by the learner: never update or forget them.
- When a fact changed, update the old memory instead of adding a new one. Never add something already in memory. Skip small talk and anything about the character.
- ${pickedRule} Never add, update or forget based only on them.
${minor ? "- The learner may be a minor: never store health, mental health, or emotional-state information.\n" : ""}- If nothing changes, return an empty list.`;
}

export function memoryContent(request: Pick<MemoryRequest, "existing" | "messages">): string {
  const existing =
    request.existing
      .map(
        (memory) =>
          `${memory.ref}. [${memory.shared ? "shared" : "this character"}]${memory.locked ? " (locked)" : ""} ${memory.content}`,
      )
      .join("\n") || "(none)";
  return `Existing memory:\n${existing}\n\nRecent messages:\n${transcript(request.messages)}`;
}

/** 모델이 낸 작업 한 줄(구조화 출력 모양). */
export type MemoryOpDraft = {
  readonly op: "add" | "update" | "forget";
  readonly ref: string | null;
  readonly kind: "fact" | "event" | null;
  readonly content: string | null;
  readonly shared: boolean | null;
  readonly reason: string;
};

/**
 * 모델이 낸 작업을 다듬습니다 — 빈 글 · 모르는 번호 · 같은 기억에 두 번째 작업 · 바뀌지 않는 고치기 · 상한을 넘는 더하기는 버립니다.
 * 유저가 고친 기억(locked)에 대한 작업은 그대로 둡니다 — 서버가 건드리지 않고 `protected`로 세어 로그에 남깁니다.
 */
export function memoryOpsFrom(
  drafts: readonly MemoryOpDraft[],
  existing: readonly ExistingMemory[],
): MemoryOp[] {
  const byRef = new Map(existing.map((memory) => [memory.ref, memory]));
  const touched = new Set<string>();
  const ops: MemoryOp[] = [];
  let adds = 0;
  for (const draft of drafts) {
    const content = draft.content?.trim() ?? "";
    const reason = draft.reason.trim().slice(0, 200);
    if (draft.op === "add") {
      if (content === "" || draft.kind === null || adds >= memoryBatchLimit) continue;
      adds += 1;
      ops.push({ op: "add", kind: draft.kind, content, shared: draft.shared ?? false, reason });
      continue;
    }
    const target = draft.ref === null ? undefined : byRef.get(draft.ref.trim());
    if (target === undefined || touched.has(target.ref)) continue;
    if (draft.op === "update") {
      if (content === "" || content === target.content) continue;
      ops.push({ op: "update", ref: target.ref, content, reason });
    } else ops.push({ op: "forget", ref: target.ref, reason });
    touched.add(target.ref);
  }
  return ops;
}

export const summarySystem = `Summarize this Korean-learning chat for the character's memory, merging it with the previous summary. Write in short Korean under these four headings, at most 8 short sentences in total, and skip a heading that has nothing:
[학습자] what the learner shared about themselves.
[이어지는 이야기] ongoing topics and where the conversation left off.
[캐릭터] facts the character stated about itself (its life, likes, plans) and its own promises — keep these exactly so the character stays consistent.
[약속] anything either side promised or planned to do together.
${pickedRule} Do not record them as the learner's facts. No preamble.`;

export function summaryContent(request: Pick<SummaryRequest, "previous" | "messages">): string {
  return `${request.previous ? `Previous summary:\n${request.previous}\n\n` : ""}Conversation:\n${transcript(request.messages)}`;
}
