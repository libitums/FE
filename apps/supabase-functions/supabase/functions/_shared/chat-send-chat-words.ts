// 주간 순위 「Chat words」(ADR-0170): 피드백 카드의 배운 표현(`learnedUsed`) 가운데 단어(`voca:`)를 골라 서버에 센다.
// 교정(ADR-0129)을 내는 같은 단계 — 모델 호출을 더하지 않는다. 교정의 `items[].original`에 그 단어의 조각(`expressionFragments`,
// 공백 · 부호 걷음, 어간 기준)이 들어 있으면 짚힌 것이라 세지 않고(pending) 고쳐 다시 보낼 때 센다. 주 1번 · 이번 주 합계는
// `ranking_record_chat_words`(20261220)가 정한다. 기록이 실패해도 턴에는 영향이 없다 — 카드에 칸이 없을 뿐이다.

import type {
  ChatSendDeps,
  ChatSendEnv,
  Feedback,
  LearningExpression,
} from "./chat-send.contract.ts";
import type { ChatWords, LearnedUse } from "./companion-feedback.contract.ts";
import { containsExpression } from "./companion-learning-match.ts";
import { callRpc } from "./companion-rpc.ts";

const strip = (text: string) => text.replace(/[\s\p{P}\p{S}]/gu, "");

/**
 * 두 글자 어간 「-다」 단어(맛있다 → 맛있)는 학습 판정 규칙(`expressionFragments`)이 한 글자 조각으로 줄여 버리므로 여기서만
 * 어간 전체로 한 번 더 찾는다(맛있어요 → 맛있다). 학습 기록 규칙은 바꾸지 않는다.
 */
export function shortStemWords(pool: readonly LearningExpression[], text: string): LearnedUse[] {
  const plain = strip(text);
  return pool
    .filter((entry) => entry.kind === "voca" && entry.id.startsWith("voca:"))
    .filter((entry) => {
      const core = strip(entry.surface);
      return core.length === 3 && core.endsWith("다") && plain.includes(core.slice(0, 2));
    })
    .map((entry) => ({ id: entry.id, surface: entry.surface }));
}

export type ChatWordCandidates = { readonly counted: string[]; readonly pending: string[] };

/**
 * 셀 후보(순수). 칩을 그대로 보낸 메시지(`skipped`)이거나 배운 표현이 없으면 둘 다 빈다.
 * 단어(`voca:`)이고 풀에 있는 것만, 같은 id는 한 번.
 */
export function chatWordCandidates(
  feedback: Feedback,
  pool: readonly LearningExpression[],
): ChatWordCandidates {
  const counted: string[] = [];
  const pending: string[] = [];
  if (feedback.status === "skipped" || feedback.learnedUsed === undefined)
    return { counted, pending };
  const byId = new Map(pool.map((entry) => [entry.id, entry]));
  const usedWords = [...feedback.learnedUsed, ...shortStemWords(pool, feedback.original)];
  for (const used of usedWords) {
    const entry = byId.get(used.id);
    if (!used.id.startsWith("voca:") || entry === undefined) continue;
    if (counted.includes(entry.id) || pending.includes(entry.id)) continue;
    const flagged = feedback.items.some((item) => containsExpression(entry, item.original));
    (flagged ? pending : counted).push(entry.id);
  }
  return { counted, pending };
}

const isIdList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** RPC 응답 → id 목록 둘과 합계. 모양이 틀리면 null. */
function recordedFrom(
  value: unknown,
): { counted: string[]; pending: string[]; weekTotal: number } | null {
  if (typeof value !== "object" || value === null) return null;
  const { counted, pending, weekTotal } = value as Record<string, unknown>;
  if (!isIdList(counted) || !isIdList(pending)) return null;
  if (typeof weekTotal !== "number" || !Number.isInteger(weekTotal) || weekTotal < 0) return null;
  return { counted, pending, weekTotal };
}

/**
 * 후보가 있으면 서버에 세고 카드에 `chatWords`를 붙인다(표면형은 풀의 것, 풀에 없는 id는 버림). 후보가 없으면 부르지 않는다.
 * 실패 · 틀린 응답이면 카드 그대로 + `chat_words_failed` 로그.
 */
export async function withChatWords(
  deps: Pick<ChatSendDeps, "outbound" | "log" | "nowMs">,
  env: ChatSendEnv,
  userId: string,
  messageId: string,
  feedback: Feedback,
  pool: readonly LearningExpression[],
): Promise<Feedback> {
  const candidates = chatWordCandidates(feedback, pool);
  if (candidates.counted.length === 0 && candidates.pending.length === 0) return feedback;
  let recorded: ReturnType<typeof recordedFrom> = null;
  try {
    recorded = recordedFrom(
      await callRpc<unknown>(deps.outbound, env, "ranking_record_chat_words", {
        p_user_id: userId,
        p_message_id: messageId,
        p_counted: candidates.counted,
        p_pending: candidates.pending,
        p_now: new Date(deps.nowMs()).toISOString(),
      }),
    );
  } catch {
    recorded = null;
  }
  if (recorded === null) {
    deps.log({ event: "chat_send", status: "stream", outcome: "chat_words_failed" });
    return feedback;
  }
  const byId = new Map(pool.map((entry) => [entry.id, entry.surface]));
  const words = (ids: readonly string[]): LearnedUse[] =>
    ids.flatMap((id) => {
      const surface = byId.get(id);
      return surface === undefined ? [] : [{ id, surface }];
    });
  const chatWords: ChatWords = {
    counted: words(recorded.counted),
    pending: words(recorded.pending),
    weekTotal: recorded.weekTotal,
  };
  return { ...feedback, chatWords };
}
