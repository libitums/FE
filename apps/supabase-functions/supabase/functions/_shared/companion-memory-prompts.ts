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
  return `You maintain one chat character's long-term memory of one Korean learner: what the learner has told this character. Other characters do not see it — each character learns about the learner in its own chats. You get today's date, the existing memory (numbered m1, m2, …) and recent messages (several exchanges, oldest first). Return "ops": the changes the memory needs — usually none, one or two.
- "add": a new, durable fact about the learner worth remembering in later conversations with this character (name, where they are from or live, age, school or job, why they learn Korean, preferences, hobbies, daily life, plans, life events). "kind": "fact" or "event". At most ${memoryBatchLimit} adds. Set "ref" to null.
- "update": an existing memory the new messages clearly change or make more precise (they moved, a plan happened or was cancelled, a preference changed). "ref": its number. "content": the whole new memory.
- "forget": an existing memory the learner clearly said is no longer true, or asked you to forget. "ref": its number.
- "reason": one short English phrase naming the message that justifies the change.
How to write "content": one short Korean note in the plain note style that ends in -음/-함/-임 (e.g. "주말마다 등산을 함"), with no subject such as "학습자는" and no polite endings. Write dates, not relative time: turn words like tomorrow, next week or last weekend into the date counted from today's date (e.g. "11월 28일 아침에 면접이 있음"). A memory that would be wrong next week without a date is not worth keeping.
Rules:
- Only what the learner said or clearly confirmed counts. Never change memory because of something the character said — a fact the character guessed or misread (e.g. the character says "베트남에서 왔군요") is not the learner's fact unless the learner themselves wrote it or answered yes to it; the learner just not objecting is not confirming.
- Every learner here is learning Korean: never store that they learn, want to learn, or have just started Korean, or that they are a learner. Store only what sets this learner apart — why they learn, for how long, a concrete goal.
- Memories marked (locked) were written by the learner: never update or forget them.
- Dated plans and events: when the learner tells how one went, update it with the outcome (e.g. "11월 14일에 시험을 봤고 잘 봄"). Forget a plan whose date is more than two weeks before today and that the learner never brought up again.
- When a fact changed, update the old memory instead of adding a new one. Never add something already in memory, even in other words. Skip small talk and anything about the character.
- ${pickedRule} Never add, update or forget based only on them.
${minor ? "- The learner may be a minor: never store health, mental health, or emotional-state information.\n" : ""}- If nothing changes, return an empty list.`;
}

const weekday = (date: string) =>
  ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    new Date(`${date}T00:00:00Z`).getUTCDay()
  ];

export function memoryContent(
  request: Pick<MemoryRequest, "existing" | "messages" | "localDate">,
): string {
  const existing =
    request.existing
      .map((memory) => `${memory.ref}.${memory.locked ? " (locked)" : ""} ${memory.content}`)
      .join("\n") || "(none)";
  const today = request.localDate
    ? `Today: ${request.localDate} (${weekday(request.localDate)})\n\n`
    : "";
  return `${today}Existing memory:\n${existing}\n\nRecent messages:\n${transcript(request.messages)}`;
}

/** 모델이 낸 작업 한 줄(구조화 출력 모양). */
export type MemoryOpDraft = {
  readonly op: "add" | "update" | "forget";
  readonly ref: string | null;
  readonly kind: "fact" | "event" | null;
  readonly content: string | null;
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
      // 기억은 들은 캐릭터의 층에만 쓴다(ADR-0210 D6) — 공유 층(character_id null)에는 더하지 않는다.
      ops.push({ op: "add", kind: draft.kind, content, shared: false, reason });
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

/**
 * 기억 글 하나가 쓰기 규칙(ADR-0210)을 어긴 곳 — 평가(`companion-eval` memory)가 작업마다 붙인다. 운영 적용은 막지 않는다.
 * polite: 존댓말 끝 · learner_subject: 「학습자는」 · relative_time: 날짜 대신 상대 시간 · trivial: 누구나 해당하는 「한국어를 배움」.
 */
export function memoryProblems(content: string): string[] {
  const text = content.trim();
  const problems: string[] = [];
  if (/(요|니다|어요|아요|해요)[.!]?$/.test(text)) problems.push("polite");
  if (/^학습자(는|가|의)?\s/.test(text)) problems.push("learner_subject");
  if (/(내일|모레|어제|그제|오늘|이번 ?주|다음 ?주|지난 ?주|다음 ?달|지난 ?달)/.test(text))
    problems.push("relative_time");
  if (/^(한국어|한국말)(를|을)?\s?(처음\s?|막\s?)?(배우|공부)/.test(text) && text.length <= 20)
    problems.push("trivial");
  return problems;
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
