// 교정 카드 다시 보내기 · 답 평가의 순수 규칙입니다(ADR-0129).

import type { ChatCorrection, ChatRatingReason, FeedbackCopy } from "./chat-feedback.contract";
import type { ChatMessage, ChatMyNotes } from "./chat-source.contract";

/** 👎 메모의 최대 글자 수(서버 p_note 200자). */
export const RATING_NOTE_MAX = 200;

/** 👎 시트의 이유 순서(서버 p_reasons 다섯). */
export const RATING_REASONS: readonly ChatRatingReason[] = [
  "awkward_korean",
  "out_of_character",
  "too_hard",
  "uncomfortable",
  "other",
];

type ThreadLike = { readonly messages: readonly ChatMessage[]; readonly typing: boolean };
type ResendThread = ThreadLike & {
  readonly awaitingReply: boolean;
  readonly notes: Readonly<Record<string, ChatMyNotes>>;
};

const isMine = (message: ChatMessage): boolean => message.kind === "text" && message.from === "me";
const isReply = (message: ChatMessage): boolean =>
  message.kind === "text" && message.from === "them";

/**
 * 고친 문장으로 다시 보낼 수 있는 내 글 id입니다 — 마지막 내 글이고 그 뒤는 캐릭터 글 답뿐이며 답을 기다리는 중이 아닐 때
 * (서버 replaces_message_id: 그 뒤에 그 답이 아닌 메시지가 오면 409 not_latest_message).
 */
export function resendableMessageId(thread: ThreadLike, waiting: boolean): string | null {
  if (waiting || thread.typing) return null;
  for (let index = thread.messages.length - 1; index >= 0; index -= 1) {
    const message = thread.messages[index] as ChatMessage;
    if (isMine(message)) return message.id;
    if (!isReply(message)) return null;
  }
  return null;
}

/** 그 글을 지금 다시 보낼 수 있으면 준비된 교정을 — 누르는 순간의 최신 방으로 판정합니다(관문 전 · 출처 안 같은 규칙). */
export function readyResend(thread: ResendThread, messageId: string): ChatCorrection | null {
  if (resendableMessageId(thread, thread.awaitingReply) !== messageId) return null;
  const note = thread.notes[messageId]?.correction;
  return note?.kind === "available" && note.detail.status === "ready" ? note.detail.value : null;
}

/** 👍 👎를 둘 가장 최근 캐릭터 글 id입니다. */
export function latestReplyId(thread: ThreadLike): string | null {
  for (let index = thread.messages.length - 1; index >= 0; index -= 1) {
    const message = thread.messages[index] as ChatMessage;
    if (isReply(message)) return message.id;
  }
  return null;
}

/** 다시 보낼 글 — better면 더 나은 글, 그 밖은 고친 문장. */
export function resendTextOf(correction: ChatCorrection): string {
  return correction.kind === "better" && correction.better !== null
    ? correction.better.text
    : correction.corrected;
}

/** 이유 하나를 켜거나 끕니다 — 켜진 이유는 시트의 고정 순서로 둡니다. */
export function toggledReason(
  reasons: readonly ChatRatingReason[],
  reason: ChatRatingReason,
): readonly ChatRatingReason[] {
  return reasons.includes(reason)
    ? reasons.filter((id) => id !== reason)
    : RATING_REASONS.filter((id) => id === reason || reasons.includes(id));
}

export function canSendRating(reasons: readonly ChatRatingReason[]): boolean {
  return reasons.length > 0;
}

// 낭독 문장 끝에 마침표를 붙이되, 이미 문장 부호로 끝나면 그대로 둡니다(기기 확인 — 「시예요?.」 · 「topic..」).
const sentence = (text: string): string =>
  /[.!?。？！…]$/u.test(text.trim()) ? text.trim() : `${text.trim()}.`;

/** 연필 카드의 낭독 문장 — 제목 · 보일 글 · 고친 곳들(또는 뜻 · 설명). */
export function correctionSpoken(correction: ChatCorrection, copy: FeedbackCopy): string {
  const title = copy.titles[correction.kind];
  switch (correction.kind) {
    case "correction": {
      const items = correction.items.map((item) =>
        sentence(`${item.original} → ${item.corrected}, ${item.reason}`),
      );
      const better =
        correction.better === null
          ? []
          : [sentence(`${copy.titles.better}: ${correction.better.text}`)];
      return copy.cardLabel(title, sentence(correction.corrected), [...items, ...better].join(" "));
    }
    case "better":
      return correction.better === null
        ? copy.cardLabel(title, sentence(correction.corrected), "")
        : copy.cardLabel(
            title,
            sentence(correction.better.text),
            [correction.better.meaning, correction.better.explanation]
              .filter((part) => part.trim() !== "")
              .map(sentence)
              .join(" "),
          );
    case "l1_to_ko":
      return copy.cardLabel(
        title,
        sentence(correction.corrected),
        correction.meaning === null ? "" : sentence(correction.meaning),
      );
    default: {
      const unreachable: never = correction.kind;
      return unreachable;
    }
  }
}
