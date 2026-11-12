// 가짜 출처의 답 평가 · 고친 문장 다시 보내기입니다(ADR-0129). 앱을 다시 켜면 사라집니다(1단계 가짜 데이터).

import type { ChatRating } from "./chat-feedback.contract";
import { readyResend, resendTextOf } from "./chat-feedback-rules";
import type { RoomState } from "./chat-fixture-room";
import type { ChatSource } from "./chat-source.contract";

export type FeedbackDeps = {
  readonly live: (roomId: string) => RoomState | null;
  readonly changed: (room: RoomState) => void;
  readonly sendText: (roomId: string, text: string) => void;
};

const sameRating = (a: ChatRating | undefined, b: ChatRating | null): boolean =>
  JSON.stringify(a ?? null) === JSON.stringify(b);

function without<T>(
  record: Readonly<Record<string, T>>,
  ids: ReadonlySet<string>,
): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([id]) => !ids.has(id)));
}

export function feedbackMethods({
  live,
  changed,
  sendText,
}: FeedbackDeps): Pick<ChatSource, "rateMessage" | "resendCorrected"> {
  return {
    rateMessage: (roomId, messageId, rating) => {
      const room = live(roomId);
      if (room === null || sameRating(room.ratings[messageId], rating)) return;
      const { [messageId]: _old, ...rest } = room.ratings;
      room.ratings = rating === null ? rest : { ...rest, [messageId]: rating };
      changed(room);
    },
    resendCorrected: (roomId, messageId) => {
      const room = live(roomId);
      if (room === null) return;
      const correction = readyResend(
        { ...room, awaitingReply: room.pendingReplies > 0 },
        messageId,
      );
      if (correction === null) return;
      // 옛 턴(내 글 · 그 뒤 답)을 빼고 그 노트 · 평가도 함께 지운 뒤 고친 글을 보낸다 — 서버 companion_begin_replacement.
      const at = room.messages.findIndex((message) => message.id === messageId);
      if (at === -1) return;
      const removed = new Set(room.messages.slice(at).map((message) => message.id));
      room.messages = room.messages.slice(0, at);
      room.notes = without(room.notes, removed);
      room.ratings = without(room.ratings, removed);
      changed(room);
      sendText(roomId, resendTextOf(correction));
    },
  };
}
