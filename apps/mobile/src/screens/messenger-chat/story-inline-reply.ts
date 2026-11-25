// 보기에서 바로 보내는 스토리 답장의 판정입니다(ADR-0178 D5 개정) — 순수. 앱 관문(첫 답장 무료 · 체험 · 엽전)과
// 보낸 글의 배달 상태(대화 출처 스냅숏에서 읽음)만 봅니다.

import type { ChatMessage, ChatThread } from "./chat-source.contract";
import type { StoryReplyFailure } from "./friend-stories.contract";
import { sendGateFor, turnPlanFor, type ChatTier } from "./free-turns";

export type StoryReplyGateInput = {
  /** 보기에서 본 첫 답장 무료 안내(정본은 서버). */
  readonly free: boolean;
  /** 앱 관문 재료가 없으면(옛 결선 · 테스트) null — 앱 관문 없이 보냅니다. */
  readonly tier: ChatTier | null;
  readonly trialRemaining: number | null;
  readonly balance: number;
  readonly price: number;
  /** 서버 방이면 서버가 엽전을 냅니다(앱 지갑에서 빼지 않음). */
  readonly charging: "server" | "local";
};

export type StoryReplyGate =
  | { readonly kind: "story-free" }
  | { readonly kind: "open" }
  | { readonly kind: "trial" }
  | { readonly kind: "pay"; readonly price: number; readonly spend: boolean }
  | { readonly kind: "short"; readonly shortBy: number };

/** 첫 답장 무료면 앞에서 열고, 그 밖은 대화방 입력 줄과 같은 관문(`turnPlanFor` → `sendGateFor`)입니다. */
export function storyReplyGateOf(input: StoryReplyGateInput): StoryReplyGate {
  if (input.free) return { kind: "story-free" };
  if (input.tier === null) return { kind: "open" };
  const plan = turnPlanFor({
    tier: input.tier,
    trialRemaining: input.trialRemaining,
    price: input.price,
  });
  const gate = sendGateFor(plan, input.balance);
  switch (gate.kind) {
    case "open":
      return { kind: "open" };
    case "free":
      return { kind: "trial" };
    case "pay":
      return { kind: "pay", price: gate.price, spend: input.charging === "local" };
    case "top-up":
      return { kind: "short", shortBy: gate.shortBy };
  }
}

export type StoryReplyStatus =
  | { readonly kind: "sending" }
  | { readonly kind: "sent" }
  | { readonly kind: "failed"; readonly reason: StoryReplyFailure };

const FAILED: StoryReplyStatus = { kind: "failed", reason: "failed" };

/** 서버 모드의 아직 서버 id를 받지 못한 내 글(`chat-fixture-remote`의 `local-…`). */
const isLocalId = (id: string) => id.startsWith("local-");

function latestReply(
  messages: readonly ChatMessage[],
  before: ReadonlySet<string>,
  storyId: string,
): ChatMessage | null {
  for (let at = messages.length - 1; at >= 0; at -= 1) {
    const message = messages[at];
    if (message === undefined || before.has(message.id)) continue;
    if (message.kind === "text" && message.from === "me" && message.story?.storyId === storyId)
      return message;
  }
  return null;
}

/**
 * 보낸 답장의 배달 상태 — `before`는 보내기 직전 그 방의 글 id들, `storyId`는 인용한 스토리. 새로 선 내 글(그 인용)을 찾아
 * 서버가 받았는지(서버 id로 바뀜 · 가짜 출처는 바로) · 못 받았는지(Not sent · 실패 줄 · 입력 막힘)를 봅니다.
 */
export function storyReplyStatusOf(
  thread: ChatThread | null,
  before: ReadonlySet<string>,
  storyId: string,
): StoryReplyStatus {
  if (thread === null) return FAILED;
  const mine = latestReply(thread.messages, before, storyId);
  if (mine === null) return FAILED;
  if (thread.server === null) return { kind: "sent" };
  const failedLine = thread.messages.find((message) => message.id === `${mine.id}~failed`);
  if (failedLine !== undefined)
    return failedLine.kind === "notice" && failedLine.notice === "no-credits"
      ? { kind: "failed", reason: "coins" }
      : FAILED;
  if (thread.server.unsent.includes(mine.id)) return FAILED;
  if (!isLocalId(mine.id)) return { kind: "sent" };
  return thread.inputBlock === null ? { kind: "sending" } : FAILED;
}

/** 보내기 단추가 서는가 — 빈 글 · 보내는 중이면 아닙니다. */
export function canSendStoryReply(text: string, sending: boolean): boolean {
  return !sending && text.trim() !== "";
}
